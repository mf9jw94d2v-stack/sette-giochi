import type { GameLevel, LevelValidator, ValidationResult } from "@/types/game";
import type { Era, GazillionLevelData } from "./types";
import type { GazillionSessionData } from "./engine";

/** Plausible year range per era. The validator cross-checks year ∈ bounds. */
export const ERA_BOUNDS: Record<Era, [number, number]> = {
  ancient: [-3000, -801],
  classical: [-800, 500],
  medieval: [501, 1500],
  "early-modern": [1501, 1800],
  modern: [1801, 1945],
  contemporary: [1946, 2035],
};

const MIN_YEAR = -3000;
const MAX_YEAR = new Date().getFullYear();

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** FNV-1a → 8-hex-char signature. */
function hash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Stable deduplication signature for one event (not just its id). */
export function eventSignature(ev: GazillionLevelData): string {
  return `${ev.era}:${ev.year}:${normalize(ev.prompt)}`;
}

/** First pass: structure + allowed values. */
export function validateRound(data: GazillionLevelData): ValidationResult {
  const reasons: string[] = [];
  if (!data.prompt || !data.prompt.trim()) reasons.push("empty prompt");
  if (!data.category || !data.category.trim()) reasons.push("empty category");
  if (!Number.isInteger(data.year)) reasons.push("year is not an integer");
  if (data.year < MIN_YEAR || data.year > MAX_YEAR)
    reasons.push(`year ${data.year} out of range [${MIN_YEAR}, ${MAX_YEAR}]`);
  if (!(data.era in ERA_BOUNDS)) reasons.push(`unknown era "${data.era}"`);
  return { ok: reasons.length === 0, reasons, confidence: "verified" };
}

/**
 * Second, INDEPENDENT pass: check the authored year is consistent with the
 * authored era (a separate table, not the generator's logic). This catches
 * data-entry inconsistencies; it cannot prove the exact year, so confidence is
 * "heuristic".
 */
export function verifyRound(data: GazillionLevelData): ValidationResult {
  const bounds = ERA_BOUNDS[data.era];
  if (!bounds)
    return {
      ok: false,
      reasons: [`unknown era "${data.era}"`],
      confidence: "unverified",
    };
  const [min, max] = bounds;
  const ok = data.year >= min && data.year <= max;
  return {
    ok,
    reasons: ok
      ? []
      : [`year ${data.year} outside ${data.era} bounds [${min}, ${max}]`],
    confidence: "heuristic",
  };
}

export function sessionContentHash(
  rounds: readonly GazillionLevelData[],
): string {
  const sig = rounds.map(eventSignature).sort().join("|");
  return hash(sig);
}

export const gazillionValidator: LevelValidator<GazillionSessionData> = {
  validateStructure(level: GameLevel<GazillionSessionData>): ValidationResult {
    const reasons: string[] = [];
    const rounds = level.data.rounds;
    if (rounds.length === 0) reasons.push("session has no rounds");
    rounds.forEach((r, i) => {
      const res = validateRound(r);
      if (!res.ok) reasons.push(`round ${i}: ${res.reasons.join("; ")}`);
    });
    const sigs = rounds.map(eventSignature);
    if (new Set(sigs).size !== sigs.length)
      reasons.push("duplicate event within session");
    return { ok: reasons.length === 0, reasons, confidence: "verified" };
  },

  verifySolution(level: GameLevel<GazillionSessionData>): ValidationResult {
    const reasons: string[] = [];
    level.data.rounds.forEach((r, i) => {
      const res = verifyRound(r);
      if (!res.ok) reasons.push(`round ${i}: ${res.reasons.join("; ")}`);
    });
    return { ok: reasons.length === 0, reasons, confidence: "heuristic" };
  },

  contentHash(level: GameLevel<GazillionSessionData>): string {
    return sessionContentHash(level.data.rounds);
  },
};
