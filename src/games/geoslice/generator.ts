import type { GameLevel, LevelGenerator } from "@/types/game";
import { createRng, shuffle } from "@/lib/rng";
import { GEO_REGIONS } from "./data/regions";
import type { GeoRegion } from "./types";
import { ROUNDS_PER_SESSION, type GeoSessionData } from "./engine";
import { sessionContentHash } from "./validator";
import { mean, round3, tierOf } from "@/games/difficulty";
import { roundDifficulty } from "./difficulty";

export const GEO_GENERATOR_VERSION = "geoslice-1.1.0";

export function pickRegions(
  seed: string,
  count: number = ROUNDS_PER_SESSION,
  pool: readonly GeoRegion[] = GEO_REGIONS,
): GeoRegion[] {
  const n = Math.min(count, pool.length);
  return shuffle(pool, createRng(seed)).slice(0, n);
}

export function buildLevel(
  seed: string,
  regions: GeoRegion[],
): GameLevel<GeoSessionData> {
  const score = mean(regions.map(roundDifficulty));
  return {
    id: `geoslice-${seed}`,
    gameId: "geoslice",
    generatorVersion: GEO_GENERATOR_VERSION,
    seed,
    difficulty: tierOf(score),
    difficultyScore: round3(score),
    data: { rounds: regions },
    contentHash: sessionContentHash(regions),
    createdAt: new Date().toISOString(),
  };
}

export const geoGenerator: LevelGenerator<GeoSessionData> = {
  version: GEO_GENERATOR_VERSION,
  generate: (seed) => buildLevel(seed, pickRegions(seed)),
};
