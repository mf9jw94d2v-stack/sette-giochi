import { clamp01 } from "@/games/difficulty";
import { scoreCut } from "./engine";
import type { GeoLevelData } from "./types";

/**
 * GeoSlice asks for a cut that splits the population ~50/50. A region is easy
 * when many cuts are nearly balanced and hard when only a narrow band of
 * angles and positions works — which happens when one city dominates, or when
 * the population sits in a few tight clusters.
 *
 * This is MEASURED on the region itself: we sweep the same cut space the
 * player can reach and count how many cuts land within 10 points of an even
 * split. It is still a heuristic for *player* difficulty, because a human does
 * not search uniformly.
 */
export function roundDifficulty(r: GeoLevelData): number {
  let good = 0;
  let total = 0;
  for (let theta = 0; theta < 180; theta += 15) {
    for (let pos = 0; pos <= 100; pos += 5) {
      const { pctA } = scoreCut(r.cities, theta, pos);
      total++;
      if (Math.abs(pctA - 50) <= 10) good++;
    }
  }
  if (total === 0) return 1;
  // 25 % of the cut space being good is already an easy region.
  return clamp01(1 - good / total / 0.25);
}
