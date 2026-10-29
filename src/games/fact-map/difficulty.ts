import { clamp01 } from "@/games/difficulty";
import type { FactAim, FactLevelData } from "./types";

/**
 * Fact Map scores by distance in km, so the size of the correct answer is what
 * decides how forgiving a round is: anywhere inside Brazil is "about right",
 * while a single monument must be found within ~50 km to score full marks.
 * The target type is therefore the dominant factor, nudged up for places far
 * from the equator, where the equirectangular map stretches east–west and
 * makes a pin harder to place accurately.
 *
 * HEURISTIC, not measured player difficulty.
 */
const AIM_BASE: Record<FactAim, number> = {
  paese: 0.12,
  regione: 0.3,
  città: 0.38,
  sito: 0.56,
};

export function roundDifficulty(d: FactLevelData): number {
  const base = AIM_BASE[d.aim] ?? 0.6;
  const latPenalty = (Math.abs(d.lat) / 90) * 0.15;
  return clamp01(base + latPenalty);
}
