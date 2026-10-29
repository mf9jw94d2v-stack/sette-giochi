import type { GameLevel, LevelGenerator } from "@/types/game";
import { createRng, shuffle } from "@/lib/rng";
import { FACT_PLACES } from "./data/places";
import type { FactPlace } from "./types";
import { ROUNDS_PER_SESSION, type FactSessionData } from "./engine";
import { sessionContentHash } from "./validator";
import { mean, round3, tierOf } from "@/games/difficulty";
import { roundDifficulty } from "./difficulty";

export const FACT_GENERATOR_VERSION = "fact-map-1.1.0";

export function pickPlaces(
  seed: string,
  count: number = ROUNDS_PER_SESSION,
  pool: readonly FactPlace[] = FACT_PLACES,
): FactPlace[] {
  const n = Math.min(count, pool.length);
  return shuffle(pool, createRng(seed)).slice(0, n);
}

export function buildLevel(
  seed: string,
  places: FactPlace[],
): GameLevel<FactSessionData> {
  const score = mean(places.map(roundDifficulty));
  return {
    id: `fact-map-${seed}`,
    gameId: "fact-map",
    generatorVersion: FACT_GENERATOR_VERSION,
    seed,
    difficulty: tierOf(score),
    difficultyScore: round3(score),
    data: { rounds: places },
    contentHash: sessionContentHash(places),
    createdAt: new Date().toISOString(),
  };
}

export const factGenerator: LevelGenerator<FactSessionData> = {
  version: FACT_GENERATOR_VERSION,
  generate: (seed) => buildLevel(seed, pickPlaces(seed)),
};
