import type {
  GameEngine,
  GameId,
  GameLevel,
  GameResult,
  LevelGenerator,
} from "@/types/game";
import { GAME_IDS } from "@/types/game";
import { isChallengeDate } from "@/lib/dailyDate";

import {
  estimaniaEngine,
  MAX_POINTS_PER_ROUND as EST_MAX,
  ROUNDS_PER_SESSION as EST_N,
} from "./estimania/engine";
import { estimaniaGenerator } from "./estimania/generator";
import { estimaniaAnswers, estimaniaMoves } from "./estimania/answers";
import {
  factEngine,
  MAX_POINTS_PER_ROUND as FACT_MAX,
  ROUNDS_PER_SESSION as FACT_N,
} from "./fact-map/engine";
import { factGenerator } from "./fact-map/generator";
import { factAnswers, factMoves } from "./fact-map/answers";
import {
  gazillionEngine,
  MAX_POINTS_PER_ROUND as GAZ_MAX,
  ROUNDS_PER_SESSION as GAZ_N,
} from "./gazillion/engine";
import { gazillionGenerator } from "./gazillion/generator";
import { gazillionAnswers, gazillionMoves } from "./gazillion/answers";
import {
  geoEngine,
  MAX_POINTS_PER_ROUND as GEO_MAX,
  ROUNDS_PER_SESSION as GEO_N,
} from "./geoslice/engine";
import { geoGenerator } from "./geoslice/generator";
import { geoAnswers, geoMoves } from "./geoslice/answers";
import {
  DEPTH_PER_POINT,
  krillionEngine,
  ROUNDS_PER_SESSION as KR_N,
} from "./krillion/engine";
import { krillionGenerator } from "./krillion/generator";
import { krillionAnswers, krillionMoves } from "./krillion/answers";
import { TIER_POINTS } from "./krillion/types";
import {
  MAX_CLIMB_PER_ROUND,
  plainEngine,
  ROUNDS_PER_SESSION as PL_N,
} from "./plain/engine";
import { plainGenerator } from "./plain/generator";
import { plainAnswers, plainMoves } from "./plain/answers";
import {
  MAX_SESSION_POINTS as SIZE_MAX,
  ROUNDS_PER_SESSION as SIZE_N,
  sizeEngine,
} from "./size-it-up/engine";
import { sizeGenerator } from "./size-it-up/generator";
import { sizeAnswers, sizeMoves } from "./size-it-up/answers";

/**
 * REPLAY — how the server knows a score is real.
 *
 * Every daily challenge is generated from its date, deterministically. So the
 * server does not need to believe the score a browser sends: it takes the
 * player's ANSWERS, generates the same level from the same date with the same
 * generator, plays the answers through the same pure engine, and keeps the
 * score that comes out. A made-up score cannot survive this.
 *
 * What it does NOT stop, stated plainly (docs/SECURITY.md): the levels are
 * generated in the browser, so someone who reads the bundle can find the right
 * answers before playing; time limits (Krillion's clock) and Fact Map's hint
 * are enforced only by the browser. Closing those would need levels generated
 * on the server and revealed round by round.
 *
 * This module runs in the browser (to build the answers) and in the
 * `submit-daily` Edge Function (to replay them). It must stay free of DOM,
 * React and I/O.
 */

/** Per-game bounds, derived from the engines. The database mirrors them. */
export const GAME_LIMITS: Record<GameId, { rounds: number; maxScore: number }> =
  {
    krillion: {
      rounds: KR_N,
      maxScore:
        KR_N * Math.max(...Object.values(TIER_POINTS)) * DEPTH_PER_POINT,
    },
    plain: { rounds: PL_N, maxScore: PL_N * MAX_CLIMB_PER_ROUND },
    "fact-map": { rounds: FACT_N, maxScore: FACT_N * FACT_MAX },
    estimania: { rounds: EST_N, maxScore: EST_N * EST_MAX },
    "size-it-up": { rounds: SIZE_N, maxScore: SIZE_MAX },
    geoslice: { rounds: GEO_N, maxScore: GEO_N * GEO_MAX },
    gazillion: { rounds: GAZ_N, maxScore: GAZ_N * GAZ_MAX },
  };

interface Replayer {
  generator: LevelGenerator<unknown>;
  engine: GameEngine<unknown, unknown, unknown>;
  toMoves(
    answers: readonly unknown[],
    level: GameLevel<unknown>,
  ): unknown[] | null;
  toAnswers(state: unknown): unknown[];
}

function replayer<L, S, M>(
  generator: LevelGenerator<L>,
  engine: GameEngine<L, S, M>,
  toMoves: (answers: readonly unknown[], level: GameLevel<L>) => M[] | null,
  toAnswers: (state: S) => unknown[],
): Replayer {
  // The generic parameters are erased on purpose: the table below is looked
  // up by a runtime string, and each entry is internally consistent.
  return { generator, engine, toMoves, toAnswers } as unknown as Replayer;
}

const REPLAYERS: Record<GameId, Replayer> = {
  krillion: replayer(
    krillionGenerator,
    krillionEngine,
    krillionMoves,
    krillionAnswers,
  ),
  plain: replayer(plainGenerator, plainEngine, plainMoves, plainAnswers),
  "fact-map": replayer(factGenerator, factEngine, factMoves, factAnswers),
  estimania: replayer(
    estimaniaGenerator,
    estimaniaEngine,
    estimaniaMoves,
    estimaniaAnswers,
  ),
  "size-it-up": replayer(sizeGenerator, sizeEngine, sizeMoves, sizeAnswers),
  geoslice: replayer(geoGenerator, geoEngine, geoMoves, geoAnswers),
  gazillion: replayer(
    gazillionGenerator,
    gazillionEngine,
    gazillionMoves,
    gazillionAnswers,
  ),
};

const GAME_ID_SET: ReadonlySet<string> = new Set(GAME_IDS);
export function isGameId(v: unknown): v is GameId {
  return typeof v === "string" && GAME_ID_SET.has(v);
}

/** The generator version a game's daily levels currently come from. */
export function generatorVersion(gameId: GameId): string {
  return REPLAYERS[gameId].generator.version;
}

/**
 * The answers to send for a finished board. Each game calls this with its
 * engine state; the shape is the game's own (see its `answers.ts`).
 */
export function answersFor(gameId: GameId, state: unknown): unknown[] {
  return REPLAYERS[gameId].toAnswers(state);
}

export type ReplayFailure =
  | "unknown_game"
  | "invalid_date"
  | "invalid_answers"
  | "wrong_round_count"
  | "incomplete";

export type ReplayOutcome =
  | {
      ok: true;
      result: GameResult;
      rounds: number;
      generatorVersion: string;
    }
  | { ok: false; reason: ReplayFailure };

/** Replay a daily challenge from its date and the player's answers. */
export function replayDaily(
  gameId: unknown,
  challengeDate: unknown,
  answers: unknown,
): ReplayOutcome {
  if (!isGameId(gameId)) return { ok: false, reason: "unknown_game" };
  if (typeof challengeDate !== "string" || !isChallengeDate(challengeDate))
    return { ok: false, reason: "invalid_date" };
  if (!Array.isArray(answers)) return { ok: false, reason: "invalid_answers" };

  const r = REPLAYERS[gameId];
  const level = r.generator.generate(challengeDate);
  const rounds = (level.data as { rounds: unknown[] }).rounds.length;
  if (answers.length !== rounds)
    return { ok: false, reason: "wrong_round_count" };

  const moves = r.toMoves(answers, level);
  if (!moves) return { ok: false, reason: "invalid_answers" };

  let state = r.engine.init(level);
  for (const move of moves) state = r.engine.applyMove(state, move);
  if (!r.engine.isTerminal(state)) return { ok: false, reason: "incomplete" };

  const result = r.engine.getResult(state);
  if (!result.completed) return { ok: false, reason: "incomplete" };
  return { ok: true, result, rounds, generatorVersion: level.generatorVersion };
}
