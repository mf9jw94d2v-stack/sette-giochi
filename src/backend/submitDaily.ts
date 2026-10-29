import { generatorVersion, isGameId, replayDaily } from "@/games/replay";
import {
  bearerToken,
  corsHeaders,
  json,
  readJson,
  type CorsOptions,
} from "./http";

/**
 * The `submit-daily` Edge Function: the ONLY way an official daily result is
 * written. It trusts nothing the browser says about the score.
 *
 *   1. the caller must carry a valid session token;
 *   2. the answers are replayed from the date (src/games/replay.ts) and the
 *      score is the one the replay produces;
 *   3. the database function decides whether the day is still open, refuses
 *      out-of-range scores and keeps the first result of the day.
 */

export interface VerifiedDailyRow {
  userId: string;
  gameId: string;
  challengeDate: string;
  score: number;
  won: boolean;
  rounds: number;
  answers: unknown[];
  detail: Record<string, unknown>;
  durationMs: number | null;
  generatorVersion: string;
}

/** A row of public.daily_results as the database returns it. */
export interface DailyResultRow {
  game_id: string;
  challenge_date: string;
  score: number;
  won: boolean;
  completed: boolean;
  detail: Record<string, unknown> | null;
  verification: string;
  created_at: string;
}

export interface SubmitDailyDeps extends CorsOptions {
  /** Verify the session token. The user id, or null if invalid or expired. */
  authenticate(token: string): Promise<string | null>;
  /** Call public.record_verified_daily_result with the service role. */
  record(
    row: VerifiedDailyRow,
  ): Promise<{ created: boolean; result: DailyResultRow }>;
}

export const MAX_BODY_BYTES = 16_000;

export type SubmitError =
  | "method_not_allowed"
  | "unauthorized"
  | "bad_request"
  | "version_mismatch"
  | "challenge_closed"
  | "unknown_game"
  | "invalid_date"
  | "invalid_answers"
  | "wrong_round_count"
  | "incomplete"
  | "server_error";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export async function handleSubmitDaily(
  req: Request,
  deps: SubmitDailyDeps,
): Promise<Response> {
  const cors = corsHeaders(req, deps);
  const fail = (status: number, error: SubmitError) =>
    json(status, { error }, cors);

  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return fail(405, "method_not_allowed");

  const token = bearerToken(req);
  const userId = token ? await deps.authenticate(token) : null;
  if (!userId) return fail(401, "unauthorized");

  const body = await readJson(req, MAX_BODY_BYTES);
  if (!isRecord(body)) return fail(400, "bad_request");
  const { gameId, challengeDate, answers } = body;

  if (!isGameId(gameId)) return fail(422, "unknown_game");
  // A board built by an older bundle would replay into a different level:
  // say so, instead of scoring answers against the wrong questions.
  if (body.generatorVersion !== generatorVersion(gameId))
    return fail(409, "version_mismatch");

  const outcome = replayDaily(gameId, challengeDate, answers);
  if (!outcome.ok) return fail(422, outcome.reason);

  const duration =
    typeof body.durationMs === "number" &&
    Number.isInteger(body.durationMs) &&
    body.durationMs >= 0 &&
    body.durationMs <= 86_400_000
      ? body.durationMs
      : null;

  let saved: { created: boolean; result: DailyResultRow };
  try {
    saved = await deps.record({
      userId,
      gameId,
      challengeDate: challengeDate as string,
      score: outcome.result.score,
      won: outcome.result.won,
      rounds: outcome.rounds,
      answers: answers as unknown[],
      detail: outcome.result.detail ?? {},
      durationMs: duration,
      generatorVersion: outcome.generatorVersion,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("challenge_closed"))
      return fail(409, "challenge_closed");
    return fail(500, "server_error");
  }

  const r = saved.result;
  const clientScore =
    typeof body.clientScore === "number" ? body.clientScore : null;
  return json(
    200,
    {
      created: saved.created,
      record: {
        gameId: r.game_id,
        challengeDate: r.challenge_date,
        score: r.score,
        won: r.won,
        completed: r.completed,
        detail: r.detail ?? {},
        verification: r.verification,
        createdAt: r.created_at,
      },
      // The board shows its own number; tell it when the server's differs
      // (it should not — see replay.test.ts — but if it does, the server wins).
      scoreAdjusted:
        saved.created && clientScore !== null && clientScore !== r.score,
    },
    cors,
  );
}
