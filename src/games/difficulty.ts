import type { Difficulty } from "@/types/game";

/**
 * Shared *scale*, not a shared difficulty model.
 *
 * Each game estimates the difficulty of one of its own rounds on a 0..1 scale
 * using a heuristic that belongs to ITS mechanic (see each game's
 * `difficulty.ts`). Only the mapping from that number to the platform's four
 * tiers is shared, so the Quality Lab can compare distributions side by side.
 *
 * These are HEURISTIC estimates, never measured player difficulty: no player
 * data exists yet. `docs/level-generation-strategy.md` records the limits.
 */
export const DIFFICULTY_TIERS: { max: number; tier: Difficulty }[] = [
  { max: 0.3, tier: "easy" },
  { max: 0.55, tier: "medium" },
  { max: 0.78, tier: "hard" },
  { max: Infinity, tier: "expert" },
];

export function tierOf(score01: number): Difficulty {
  const s = Math.max(0, Math.min(1, score01));
  return DIFFICULTY_TIERS.find((t) => s < t.max)!.tier;
}

/** Mean of a non-empty list, 0 for an empty one. */
export function mean(values: readonly number[]): number {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
}

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Round to 3 decimals so stored scores stay readable and stable. */
export function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
