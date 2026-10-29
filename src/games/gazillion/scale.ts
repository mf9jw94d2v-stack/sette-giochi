import { MIN_SPAN } from "./engine";

/**
 * The timeline's scale, kept pure.
 *
 * The original Gazillion uses a logarithmic timeline (verified: «slider
 * logaritmico»). A plain log of "years ago" would give the last century half
 * the width and squash two thousand years of antiquity into a sliver, so the
 * axis runs on log10(years ago + 50): each era then gets between 12 % and 22 %
 * of the width, and older events — which the scoring already judges with a
 * wider tolerance — are drawn at a matching, coarser resolution.
 *
 * `t` is the position along the axis: 0 = oldest edge (left), 1 = today.
 */

export const NOW_YEAR = new Date().getFullYear();
export const AXIS_MIN_YEAR = -3000;
export const AXIS_MAX_YEAR = NOW_YEAR;
const OFFSET = 50;

const f = (year: number) => Math.log10(NOW_YEAR - year + OFFSET);
const F_OLD = f(AXIS_MIN_YEAR);
const F_NEW = f(AXIS_MAX_YEAR);

export function clampYear(year: number): number {
  if (!Number.isFinite(year)) return AXIS_MAX_YEAR;
  return Math.min(AXIS_MAX_YEAR, Math.max(AXIS_MIN_YEAR, Math.round(year)));
}

export function yearToT(year: number): number {
  const y = Math.min(AXIS_MAX_YEAR, Math.max(AXIS_MIN_YEAR, year));
  return (F_OLD - f(y)) / (F_OLD - F_NEW);
}

export function tToYear(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  const v = F_OLD - c * (F_OLD - F_NEW);
  return clampYear(NOW_YEAR + OFFSET - Math.pow(10, v));
}

/**
 * Move one end of the trap to `year`, keeping the engine's minimum span
 * between the two ends and never letting them cross.
 */
export function setEnd(
  trap: { low: number; high: number },
  end: "low" | "high",
  year: number,
): { low: number; high: number } {
  const y = clampYear(year);
  if (end === "low") {
    const low = Math.min(y, trap.high - MIN_SPAN);
    return { low: clampYear(low), high: trap.high };
  }
  const high = Math.max(y, trap.low + MIN_SPAN);
  return { low: trap.low, high: clampYear(high) };
}

/**
 * Slide the whole trap by `dt` along the axis. On a log axis a constant
 * on-screen width covers more years in the past than near today, exactly as
 * the drawing shows; the minimum span still holds at the edges.
 */
export function slide(
  trap: { low: number; high: number },
  dt: number,
): { low: number; high: number } {
  const a = yearToT(trap.low);
  const b = yearToT(trap.high);
  const shift = Math.max(-a, Math.min(1 - b, dt));
  const low = tToYear(a + shift);
  const high = Math.max(tToYear(b + shift), low + MIN_SPAN);
  return { low, high: clampYear(high) };
}

export interface EraBand {
  label: string;
  /** For narrow screens, where the full name would be cut off. */
  short: string;
  from: number;
  to: number;
}

/** The game's own eras (see validator ERA_BOUNDS), named for the axis. */
export const ERA_BANDS: EraBand[] = [
  { label: "Antichità", short: "Antica", from: -3000, to: -801 },
  { label: "Età classica", short: "Classica", from: -800, to: 500 },
  { label: "Medioevo", short: "Medioevo", from: 501, to: 1500 },
  { label: "Età moderna", short: "Moderna", from: 1501, to: 1800 },
  { label: "Età contemporanea", short: "Contemp.", from: 1801, to: 1945 },
  { label: "Dal dopoguerra", short: "Oggi", from: 1946, to: NOW_YEAR },
];

/** Labelled ticks, chosen to be evenly spread on this particular scale. */
export const TICKS = [
  -3000, -2000, -1000, -500, 1, 500, 1000, 1500, 1700, 1800, 1900, 1950, 2000,
];
