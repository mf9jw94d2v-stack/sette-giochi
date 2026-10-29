/**
 * Guards for answers that arrive from outside — from a browser, to the
 * server. Shared by every game's `answers.ts`; they know nothing about rules.
 */
export function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
