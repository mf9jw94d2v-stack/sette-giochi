import { clamp01 } from "@/games/difficulty";
import type { PlainLevelData } from "./types";

/**
 * Plain scores by RELATIVE error, so what makes a round hard is how far the
 * true value sits from the everyday scale of its own unit: a 12 m bridge is
 * easy to picture, 0.000003 m or 380 000 km is not. We therefore use the
 * distance in orders of magnitude from 1 unit, saturating at 6 decades.
 *
 * HEURISTIC: it estimates how hard the value is to picture, not how hard real
 * players find it (no player data exists). See docs/level-generation-strategy.md.
 */
export function roundDifficulty(d: PlainLevelData): number {
  if (!(d.answer > 0)) return 1;
  return clamp01(Math.abs(Math.log10(d.answer)) / 6);
}
