import type { GameLevel, LevelValidator, ValidationResult } from "@/types/game";
import { TIER_POINTS, type KrillionLevelData } from "./types";
import { normalizeAnswer, type KrillionSessionData } from "./engine";

function hash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function validatePrompt(p: KrillionLevelData): ValidationResult {
  const reasons: string[] = [];
  if (!p.prompt.trim()) reasons.push("empty prompt");
  if (p.answers.length < 4) reasons.push("needs at least 4 answers");
  const seen = new Set<string>();
  for (const a of p.answers) {
    if (!a.label.trim()) reasons.push("empty answer label");
    if (!(a.tier in TIER_POINTS)) reasons.push(`unknown tier "${a.tier}"`);
    const key = normalizeAnswer(a.label);
    if (seen.has(key)) reasons.push(`duplicate answer "${a.label}"`);
    seen.add(key);
  }
  return { ok: reasons.length === 0, reasons, confidence: "verified" };
}

/** Independent check: the prompt offers a real spread of rarities. */
export function verifyPrompt(p: KrillionLevelData): ValidationResult {
  const tiers = new Set(p.answers.map((a) => a.tier));
  const ok = tiers.size >= 3 && tiers.has("krillion");
  return {
    ok,
    reasons: ok
      ? []
      : ["needs ≥3 distinct tiers including a 'krillion' answer"],
    confidence: "heuristic",
  };
}

export function sessionContentHash(
  rounds: readonly KrillionLevelData[],
): string {
  return hash(
    rounds
      .map((r) => r.id)
      .sort()
      .join("|"),
  );
}

export const krillionValidator: LevelValidator<KrillionSessionData> = {
  validateStructure(level: GameLevel<KrillionSessionData>): ValidationResult {
    const reasons: string[] = [];
    const rounds = level.data.rounds;
    if (rounds.length === 0) reasons.push("session has no rounds");
    rounds.forEach((r, i) => {
      const res = validatePrompt(r);
      if (!res.ok) reasons.push(`round ${i}: ${res.reasons.join("; ")}`);
    });
    const ids = rounds.map((r) => r.id);
    if (new Set(ids).size !== ids.length)
      reasons.push("duplicate prompt within session");
    return { ok: reasons.length === 0, reasons, confidence: "verified" };
  },

  verifySolution(level: GameLevel<KrillionSessionData>): ValidationResult {
    const reasons: string[] = [];
    level.data.rounds.forEach((r, i) => {
      const res = verifyPrompt(r);
      if (!res.ok) reasons.push(`round ${i}: ${res.reasons.join("; ")}`);
    });
    return { ok: reasons.length === 0, reasons, confidence: "heuristic" };
  },

  contentHash: (level) => sessionContentHash(level.data.rounds),
};
