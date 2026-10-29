import { clamp01 } from "@/games/difficulty";
import type { EstimaniaLevelData } from "./types";

/**
 * Estimania's score is `100·(1 − |log10(guess/answer)|)`: being one decade off
 * costs everything. A round is therefore hard in proportion to how many
 * decades separate the true value from an everyday magnitude (1 of its unit),
 * saturating at 5 decades (calibrated on the real dataset, which spans from
 * fractions to hundreds of millions).
 *
 * HEURISTIC, not measured player difficulty.
 */
export function roundDifficulty(d: EstimaniaLevelData): number {
  if (!(d.answer > 0)) return 1;
  return clamp01(Math.abs(Math.log10(d.answer)) / 5);
}
