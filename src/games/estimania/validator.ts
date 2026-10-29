import type { GameLevel, LevelValidator, ValidationResult } from "@/types/game";
import type { EstimaniaCategory, EstimaniaLevelData } from "./types";
import type { EstimaniaSessionData } from "./engine";

/**
 * Plausible answer magnitude per category. The validator checks that the
 * authored answer falls within these bounds — an independent consistency check
 * (a separate table, not the generator's logic). Catches a mislabelled
 * category or an answer off by orders of magnitude.
 */
export const CATEGORY_BOUNDS: Record<EstimaniaCategory, [number, number]> = {
  "Corpo umano": [1, 1e5],
  Geografia: [1, 1e9],
  Scienza: [1, 1e9],
  Sport: [1, 1e4],
  Cultura: [1, 1e4],
  Numeri: [1, 1e7],
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

export function itemSignature(it: EstimaniaLevelData): string {
  return `${normalize(it.question)}=${it.answer}`;
}

export function validateItem(it: EstimaniaLevelData): ValidationResult {
  const reasons: string[] = [];
  if (!it.question || !it.question.trim()) reasons.push("empty question");
  if (!it.category || !it.category.trim()) reasons.push("empty category");
  if (!Number.isFinite(it.answer)) reasons.push("answer is not a number");
  else if (it.answer <= 0) reasons.push("answer must be > 0");
  if (!(it.category in CATEGORY_BOUNDS))
    reasons.push(`unknown category "${it.category}"`);
  return { ok: reasons.length === 0, reasons, confidence: "verified" };
}

export function verifyItem(it: EstimaniaLevelData): ValidationResult {
  const bounds = CATEGORY_BOUNDS[it.category as EstimaniaCategory];
  if (!bounds)
    return {
      ok: false,
      reasons: [`unknown category "${it.category}"`],
      confidence: "unverified",
    };
  const [min, max] = bounds;
  const ok = it.answer >= min && it.answer <= max;
  return {
    ok,
    reasons: ok
      ? []
      : [`answer ${it.answer} outside ${it.category} bounds [${min}, ${max}]`],
    confidence: "heuristic",
  };
}

export function sessionContentHash(
  rounds: readonly EstimaniaLevelData[],
): string {
  return hash(rounds.map(itemSignature).sort().join("|"));
}

export const estimaniaValidator: LevelValidator<EstimaniaSessionData> = {
  validateStructure(level: GameLevel<EstimaniaSessionData>): ValidationResult {
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

  verifySolution(level: GameLevel<EstimaniaSessionData>): ValidationResult {
    const reasons: string[] = [];
    level.data.rounds.forEach((r, i) => {
      const res = verifyItem(r);
      if (!res.ok) reasons.push(`round ${i}: ${res.reasons.join("; ")}`);
    });
    return { ok: reasons.length === 0, reasons, confidence: "heuristic" };
  },

  contentHash: (level) => sessionContentHash(level.data.rounds),
};
