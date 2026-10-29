/**
 * Estimania's own way of saying numbers, and its magnitude ruler. Parsing
 * lives in @/lib/italianNumber, shared with the other games' fields.
 */
export { parseItalianNumber } from "@/lib/italianNumber";

/** "1,2 milioni", "35 mila", "820": how big the number is, in words. */
export function magnitudeWords(n: number): string {
  if (!Number.isFinite(n)) return "";
  const a = Math.abs(n);
  const fmt = (v: number) =>
    v.toLocaleString("it-IT", { maximumFractionDigits: v < 10 ? 2 : 1 });
  if (a >= 1e12) return `${fmt(n / 1e12)} mila miliardi`;
  // Singular only for exactly one: "1 milione", but "1,2 milioni".
  const one = (v: number) => fmt(v) === "1";
  if (a >= 1e9)
    return `${fmt(n / 1e9)} ${one(n / 1e9) ? "miliardo" : "miliardi"}`;
  if (a >= 1e6)
    return `${fmt(n / 1e6)} ${one(n / 1e6) ? "milione" : "milioni"}`;
  if (a >= 1e4) return `${fmt(n / 1e3)} mila`;
  return n.toLocaleString("it-IT", { maximumFractionDigits: 3 });
}

/** Full number for display, Italian separators. */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("it-IT", { maximumFractionDigits: n < 10 ? 2 : 0 });
}

/** The ruler: fixed decades, wide enough not to hint at any answer. */
export const RULER_MIN_EXP = -1;
export const RULER_MAX_EXP = 8;

/** Position 0..1 of a value on the log ruler, clamped to its ends. */
export function rulerT(v: number): number {
  if (!(v > 0)) return 0;
  const t = (Math.log10(v) - RULER_MIN_EXP) / (RULER_MAX_EXP - RULER_MIN_EXP);
  return Math.max(0, Math.min(1, t));
}

/** "Il doppio", "un terzo", "10× di più": the ratio said plainly. */
export function ratioWords(guess: number, answer: number): string {
  if (!(guess > 0) || !(answer > 0)) return "—";
  const r = guess / answer;
  if (r > 0.95 && r < 1.05) return "praticamente esatta";
  const f = r >= 1 ? r : 1 / r;
  const v = f.toLocaleString("it-IT", {
    maximumFractionDigits: f < 10 ? 1 : 0,
  });
  return r >= 1 ? `${v}× troppo alta` : `${v}× troppo bassa`;
}
