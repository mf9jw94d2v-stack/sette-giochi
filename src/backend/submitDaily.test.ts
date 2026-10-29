// @vitest-environment node
/// <reference types="node" />
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./testing/testDb";
import { handleSubmitDaily, type SubmitDailyDeps } from "./submitDaily";
import { handleDeleteAccount } from "./deleteAccount";
import { answersFor, generatorVersion } from "@/games/replay";
import { estimaniaEngine } from "@/games/estimania/engine";
import { estimaniaGenerator } from "@/games/estimania/generator";
import { challengeDate } from "@/lib/dailyDate";

/**
 * The submit-daily function end to end, minus the network: its own code,
 * with the `record` dependency calling the real SQL function on PostgreSQL
 * as the service role — exactly what the Deno entry point wires up.
 */

let t: TestDb;
let alice: string;
const TOKENS = new Map<string, string>();
const today = challengeDate(new Date(), "UTC");

function deps(): SubmitDailyDeps {
  return {
    authenticate: async (token) => TOKENS.get(token) ?? null,
    record: (row) =>
      t.as("service_role", null, async (tx) => {
        const res = await tx.query<{ r: { created: boolean; result: never } }>(
          `select public.record_verified_daily_result($1, $2, $3::date, $4, $5,
             $6::smallint, $7::jsonb, $8::jsonb, $9, $10) as r`,
          [
            row.userId,
            row.gameId,
            row.challengeDate,
            row.score,
            row.won,
            row.rounds,
            JSON.stringify(row.answers),
            JSON.stringify(row.detail),
            row.durationMs,
            row.generatorVersion,
          ],
        );
        const r = res.rows[0].r as {
          created: boolean;
          result: Record<string, unknown>;
        };
        return { created: r.created, result: r.result as never };
      }),
  };
}

function post(body: unknown, token: string | null = "tok-alice"): Request {
  return new Request("https://example.test/functions/v1/submit-daily", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** Play today's Estimania with exact answers: the maximum score. */
function perfectEstimania() {
  const level = estimaniaGenerator.generate(today);
  let s = estimaniaEngine.init(level);
  for (const r of level.data.rounds)
    s = estimaniaEngine.applyMove(s, { type: "submit", value: r.answer });
  return {
    answers: answersFor("estimania", s),
    score: estimaniaEngine.getResult(s).score,
  };
}

beforeAll(async () => {
  t = await createTestDb();
  alice = await t.createUser("alice@example.test", { username: "alice" });
  TOKENS.set("tok-alice", alice);
}, 60_000);
afterAll(async () => t?.close());

describe("submit-daily", () => {
  it("rejects calls without a valid session", async () => {
    const r1 = await handleSubmitDaily(post({}, null), deps());
    const r2 = await handleSubmitDaily(post({}, "forged-token"), deps());
    expect([r1.status, r2.status]).toEqual([401, 401]);
  });

  it("answers CORS preflight and refuses other methods", async () => {
    const pre = await handleSubmitDaily(
      new Request("https://x.test", { method: "OPTIONS" }),
      deps(),
    );
    expect(pre.status).toBe(204);
    expect(pre.headers.get("access-control-allow-headers")).toContain(
      "authorization",
    );
    const get = await handleSubmitDaily(
      new Request("https://x.test", { method: "GET" }),
      deps(),
    );
    expect(get.status).toBe(405);
  });

  it("refuses bodies that are not JSON or too large", async () => {
    expect((await handleSubmitDaily(post("not json"), deps())).status).toBe(
      400,
    );
    expect(
      (await handleSubmitDaily(post({ pad: "x".repeat(20_000) }), deps()))
        .status,
    ).toBe(400);
  });

  it("stores the score the SERVER computes, whatever the client claims", async () => {
    const { answers, score } = perfectEstimania();
    // Claim a score; send answers that are all passes: the server must store 0.
    const res = await handleSubmitDaily(
      post({
        gameId: "estimania",
        challengeDate: today,
        answers: answers.map(() => null),
        generatorVersion: generatorVersion("estimania"),
        clientScore: score,
      }),
      deps(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      created: true,
      scoreAdjusted: true,
      record: { score: 0, verification: "server_replay" },
    });
  });

  it("keeps the first result of the day", async () => {
    const { answers } = perfectEstimania();
    const res = await handleSubmitDaily(
      post({
        gameId: "estimania",
        challengeDate: today,
        answers,
        generatorVersion: generatorVersion("estimania"),
      }),
      deps(),
    );
    const body = await res.json();
    expect(body).toMatchObject({ created: false, record: { score: 0 } });
  });

  it("scores a genuine perfect game in full", async () => {
    const level = estimaniaGenerator.generate(today);
    expect(level.data.rounds.length).toBe(5);
    const bob = await t.createUser("bob@example.test", { username: "bob" });
    TOKENS.set("tok-bob", bob);
    const { answers, score } = perfectEstimania();
    const res = await handleSubmitDaily(
      post(
        {
          gameId: "estimania",
          challengeDate: today,
          answers,
          generatorVersion: generatorVersion("estimania"),
          durationMs: 61_000,
        },
        "tok-bob",
      ),
      deps(),
    );
    const body = await res.json();
    expect(body).toMatchObject({
      created: true,
      scoreAdjusted: false,
      record: { score },
    });
    expect(score).toBe(500);
  });

  it("refuses a day that is not open", async () => {
    const res = await handleSubmitDaily(
      post({
        gameId: "geoslice",
        challengeDate: "2026-01-01",
        answers: [null, null, null],
        generatorVersion: generatorVersion("geoslice"),
      }),
      deps(),
    );
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "challenge_closed" });
  });

  it("refuses answers built by an older generator", async () => {
    const res = await handleSubmitDaily(
      post({
        gameId: "geoslice",
        challengeDate: today,
        answers: [null, null, null],
        generatorVersion: "geoslice-0.0.1",
      }),
      deps(),
    );
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "version_mismatch" });
  });

  it("refuses malformed or incomplete sessions", async () => {
    const v = generatorVersion("plain");
    const cases: [unknown, string][] = [
      [{ gameId: "tetris", challengeDate: today, answers: [] }, "unknown_game"],
      [
        {
          gameId: "plain",
          challengeDate: today,
          answers: [1, 2],
          generatorVersion: v,
        },
        "wrong_round_count",
      ],
      [
        {
          gameId: "plain",
          challengeDate: today,
          answers: ["a", 1, 1, 1, 1, 1, 1],
          generatorVersion: v,
        },
        "invalid_answers",
      ],
      [
        {
          gameId: "plain",
          challengeDate: "ieri",
          answers: [],
          generatorVersion: v,
        },
        "invalid_date",
      ],
    ];
    for (const [body, error] of cases) {
      const res = await handleSubmitDaily(post(body), deps());
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({ error });
    }
  });

  it("never lets a player read another player's stored answers", async () => {
    const res = await t.as("authenticated", alice, (tx) =>
      tx.query<{ user_id: string }>("select user_id from public.daily_results"),
    );
    expect(res.rows.every((r) => r.user_id === alice)).toBe(true);
  });
});

describe("delete-account", () => {
  it("needs a session and the confirmation word", async () => {
    const deleted: string[] = [];
    const d = {
      authenticate: async (tok: string) => TOKENS.get(tok) ?? null,
      deleteUser: async (id: string) => void deleted.push(id),
    };
    const req = (body: unknown, token: string | null) =>
      new Request("https://x.test", {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body: JSON.stringify(body),
      });
    expect(
      (await handleDeleteAccount(req({ confirm: "ELIMINA" }, null), d)).status,
    ).toBe(401);
    expect(
      (await handleDeleteAccount(req({ confirm: "elimina" }, "tok-alice"), d))
        .status,
    ).toBe(400);
    expect(deleted).toEqual([]);
    expect(
      (await handleDeleteAccount(req({ confirm: "ELIMINA" }, "tok-alice"), d))
        .status,
    ).toBe(200);
    expect(deleted).toEqual([alice]);
  });
});
