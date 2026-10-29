import type { GameLevel, LevelGenerator } from "@/types/game";
import { createRng, shuffle } from "@/lib/rng";
import { PLAIN_ITEMS } from "./data/prompts";
import type { PlainItem, PlainLevelData } from "./types";
import { ROUNDS_PER_SESSION, type PlainSessionData } from "./engine";
import { sessionContentHash } from "./validator";
import { mean, round3, tierOf } from "@/games/difficulty";
import { roundDifficulty } from "./difficulty";

export const PLAIN_GENERATOR_VERSION = "plain-1.1.0";

function toRound(it: PlainItem): PlainLevelData {
  return {
    question: it.question,
    answer: it.answer,
    unit: it.unit,
    category: it.category,
    note: it.note,
  };
}

export function pickItems(
  seed: string,
  count: number = ROUNDS_PER_SESSION,
  pool: readonly PlainItem[] = PLAIN_ITEMS,
): PlainItem[] {
  if (count > pool.length)
    throw new Error(`cannot pick ${count} distinct items from ${pool.length}`);
  return shuffle(pool, createRng(seed)).slice(0, count);
}

export function buildLevel(
  seed: string,
  items: PlainItem[],
): GameLevel<PlainSessionData> {
  const rounds = items.map(toRound);
  const score = mean(rounds.map(roundDifficulty));
  return {
    id: `plain-${seed}`,
    gameId: "plain",
    generatorVersion: PLAIN_GENERATOR_VERSION,
    seed,
    difficulty: tierOf(score),
    difficultyScore: round3(score),
    data: { rounds },
    contentHash: sessionContentHash(rounds),
    createdAt: new Date().toISOString(),
  };
}

export const plainGenerator: LevelGenerator<PlainSessionData> = {
  version: PLAIN_GENERATOR_VERSION,
  generate: (seed) => buildLevel(seed, pickItems(seed)),
};
