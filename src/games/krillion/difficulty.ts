import { clamp01 } from "@/games/difficulty";
import type { KrillionLevelData } from "./types";

/**
 * In Krillion you score by naming a RARE answer. A prompt is therefore easy
 * when many of its accepted answers sit in the high tiers (plenty of ways to
 * dive deep) and hard when only a couple do — and harder still when the list
 * of accepted answers is short, because a correct-but-unlisted answer gets you
 * nothing.
 *
 * HEURISTIC: rarity here is PRE-AUTHORED, not crowd-measured as in the
 * original (documented in docs/game-analysis.md), so this estimates the shape
 * of our own answer list.
 */
const DOMAIN_WEIGHT: Record<KrillionLevelData["domainDifficulty"], number> = {
  easy: 0.2,
  medium: 0.55,
  hard: 0.85,
};

export function roundDifficulty(d: KrillionLevelData): number {
  const total = d.answers.length;
  if (total === 0) return 1;
  // Two independent factors. The DOMAIN is authored, because no count of
  // answers can say whether a player knows any obscure bone or any obscure
  // fruit. The ANSWER LIST is measured: few top-tier answers, or a short list,
  // leave little room to score.
  const domain = DOMAIN_WEIGHT[d.domainDifficulty] ?? 0.5;
  const top = d.answers.filter(
    (a) => a.tier === "deepCut" || a.tier === "krillion",
  ).length;
  const scarcity = clamp01(1 - top / 8);
  const thinness = clamp01((16 - total) / 16);
  return clamp01(domain * 0.6 + scarcity * 0.25 + thinness * 0.15);
}
