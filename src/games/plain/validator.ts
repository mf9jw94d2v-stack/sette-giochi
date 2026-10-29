import type { GameLevel, LevelValidator, ValidationResult } from "@/types/game";
import type { PlainLevelData } from "./types";
import type { PlainSessionData } from "./engine";

/** Plausible answer range per unit (independent sanity check). */
export const UNIT_BOUNDS: Record<string, [number, number]> = {
  m: [0.1, 1e5],
  km: [1, 1e6],
  cm: [1, 1e4],
  "km/h": [1, 1e4],
};

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function hash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function itemSignature(it: PlainLevelData): string {
  return `${normalize(it.question)}=${it.answer}${it.unit}`;
}

export function validateItem(it: PlainLevelData): ValidationResult {
  const reasons: string[] = [];
  if (!it.question.trim()) reasons.push("empty question");
  if (!it.unit.trim()) reasons.push("empty unit");
  if (!it.category.trim()) reasons.push("empty category");
  if (!Number.isFinite(it.answer)) reasons.push("answer is not a number");
  else if (it.answer <= 0) reasons.push("answer must be > 0");
  if (!(it.unit in UNIT_BOUNDS)) reasons.push(`unknown unit "${it.unit}"`);
  return { ok: reasons.length === 0, reasons, confidence: "verified" };
}

export function verifyItem(it: PlainLevelData): ValidationResult {
  const bounds = UNIT_BOUNDS[it.unit];
  if (!bounds)
    return {
      ok: false,
      reasons: [`unknown unit "${it.unit}"`],
      confidence: "unverified",
    };
  const [min, max] = bounds;
  const ok = it.answer >= min && it.answer <= max;
  return {
    ok,
    reasons: ok
      ? []
      : [`answer ${it.answer} ${it.unit} outside [${min}, ${max}]`],
    confidence: "heuristic",
  };
}

export function sessionContentHash(rounds: readonly PlainLevelData[]): string {
  return hash(rounds.map(itemSignature).sort().join("|"));
}

export const plainValidator: LevelValidator<PlainSessionData> = {
  validateStructure(level: GameLevel<PlainSessionData>): ValidationResult {
    const reasons: string[] = [];
    const rounds = level.data.rounds;
    if (rounds.length === 0) reasons.push("session has no rounds");
    rounds.forEach((r, i) => {
      const res = validateItem(r);
      if (!res.ok) reasons.push(`round ${i}: ${res.reasons.join("; ")}`);
    });
    const sigs = rounds.map(itemSignature);
    if (new Set(sigs).size !== sigs.length)
      reasons.push("duplicate question within session");
    return { ok: reasons.length === 0, reasons, confidence: "verified" };
  },

  verifySolution(level: GameLevel<PlainSessionData>): ValidationResult {
    const reasons: string[] = [];
    level.data.rounds.forEach((r, i) => {
      const res = verifyItem(r);
      if (!res.ok) reasons.push(`round ${i}: ${res.reasons.join("; ")}`);
    });
    return { ok: reasons.length === 0, reasons, confidence: "heuristic" };
  },

  contentHash: (level) => sessionContentHash(level.data.rounds),
};
