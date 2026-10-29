import type { GameLevel, LevelGenerator } from "@/types/game";
import { createRng, shuffle } from "@/lib/rng";
import { ESTIMANIA_ITEMS } from "./data/questions";
import type { EstimaniaItem, EstimaniaLevelData } from "./types";
import { ROUNDS_PER_SESSION, type EstimaniaSessionData } from "./engine";
import { sessionContentHash } from "./validator";
import { mean, round3, tierOf } from "@/games/difficulty";
import { roundDifficulty } from "./difficulty";

export const ESTIMANIA_GENERATOR_VERSION = "estimania-1.1.0";

function toRound(it: EstimaniaItem): EstimaniaLevelData {
  return {
    question: it.question,
    answer: it.answer,
    unit: it.unit,
    category: it.category,
  };
}

export function pickItems(
  seed: string,
  count: number = ROUNDS_PER_SESSION,
  pool: readonly EstimaniaItem[] = ESTIMANIA_ITEMS,
): EstimaniaItem[] {
  if (count > pool.length)
    throw new Error(`cannot pick ${count} distinct items from ${pool.length}`);
  return shuffle(pool, createRng(seed)).slice(0, count);
}

export function buildLevel(
  seed: string,
  items: EstimaniaItem[],
): GameLevel<EstimaniaSessionData> {
  const rounds = items.map(toRound);
  const score = mean(rounds.map(roundDifficulty));
  return {
    id: `estimania-${seed}`,
    gameId: "estimania",
    generatorVersion: ESTIMANIA_GENERATOR_VERSION,
    seed,
    difficulty: tierOf(score),
    difficultyScore: round3(score),
    data: { rounds },
    contentHash: sessionContentHash(rounds),
    createdAt: new Date().toISOString(),
  };
}

export const estimaniaGenerator: LevelGenerator<EstimaniaSessionData> = {
  version: ESTIMANIA_GENERATOR_VERSION,
  generate: (seed) => buildLevel(seed, pickItems(seed)),
};
