import { clamp01 } from "@/games/difficulty";
import { trueRatio } from "./geometry";
import type { SizeLevelData } from "./types";

/**
 * Size It Up asks the player to scale a target against a familiar reference.
 * Two things make that hard, and both are measured from the round itself:
 *
 *   • how far apart the two sizes are — the further, the less the reference
 *     helps, because the guess has to span orders of magnitude;
 *   • how far the silhouette STARTS from the truth, since the player has to
 *     travel that distance with the handle and has nothing to anchor on.
 *
 * HEURISTIC, not measured player difficulty: no player data exists.
 */
export function roundDifficulty(d: SizeLevelData): number {
  const truth = trueRatio(d.reference, d.target);
  if (!(truth > 0)) return 1;
  // Decades between the two objects, saturating at 2 (a 100× gap).
  const gap = clamp01(Math.abs(Math.log10(truth)) / 2);
  // Decades between where it starts and where it should end up.
  const travel = clamp01(Math.abs(Math.log10(d.startBias)) / 1.2);
  return clamp01(gap * 0.75 + travel * 0.25);
}
