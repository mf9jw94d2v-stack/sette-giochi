import type { GameLevel, LevelGenerator } from "@/types/game";
import { createRng, shuffle } from "@/lib/rng";
import { KRILLION_PROMPTS } from "./data/prompts";
import type { KrillionPrompt } from "./types";
import { ROUNDS_PER_SESSION, type KrillionSessionData } from "./engine";
import { sessionContentHash } from "./validator";
import { mean, round3, tierOf } from "@/games/difficulty";
import { roundDifficulty } from "./difficulty";

export const KRILLION_GENERATOR_VERSION = "krillion-1.1.0";

export function pickPrompts(
  seed: string,
  count: number = ROUNDS_PER_SESSION,
  pool: readonly KrillionPrompt[] = KRILLION_PROMPTS,
): KrillionPrompt[] {
  const n = Math.min(count, pool.length);
  return shuffle(pool, createRng(seed)).slice(0, n);
}

export function buildLevel(
  seed: string,
  prompts: KrillionPrompt[],
): GameLevel<KrillionSessionData> {
  const score = mean(prompts.map(roundDifficulty));
  return {
    id: `krillion-${seed}`,
    gameId: "krillion",
    generatorVersion: KRILLION_GENERATOR_VERSION,
    seed,
    difficulty: tierOf(score),
    difficultyScore: round3(score),
    data: { rounds: prompts },
    contentHash: sessionContentHash(prompts),
    createdAt: new Date().toISOString(),
  };
}

export const krillionGenerator: LevelGenerator<KrillionSessionData> = {
  version: KRILLION_GENERATOR_VERSION,
  generate: (seed) => buildLevel(seed, pickPrompts(seed)),
};
