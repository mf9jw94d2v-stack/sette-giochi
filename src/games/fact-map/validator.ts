import type { GameLevel, LevelValidator, ValidationResult } from "@/types/game";
import type { FactLevelData } from "./types";
import type { FactSessionData } from "./engine";

function hash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function validatePlace(p: FactLevelData): ValidationResult {
  const reasons: string[] = [];
  if (!p.prompt.trim()) reasons.push("empty prompt");
  if (!p.label.trim()) reasons.push("empty label");
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon))
    reasons.push("coords are not numbers");
  return { ok: reasons.length === 0, reasons, confidence: "verified" };
}

/** Independent check: coordinates fall within valid geographic ranges. */
export function verifyPlace(p: FactLevelData): ValidationResult {
  const reasons: string[] = [];
  if (p.lat < -90 || p.lat > 90) reasons.push(`lat ${p.lat} out of [-90, 90]`);
  if (p.lon < -180 || p.lon > 180)
    reasons.push(`lon ${p.lon} out of [-180, 180]`);
  return { ok: reasons.length === 0, reasons, confidence: "verified" };
}

export function sessionContentHash(rounds: readonly FactLevelData[]): string {
  return hash(
    rounds
      .map((r) => r.id)
      .sort()
      .join("|"),
  );
}

export const factValidator: LevelValidator<FactSessionData> = {
  validateStructure(level: GameLevel<FactSessionData>): ValidationResult {
    const reasons: string[] = [];
    const rounds = level.data.rounds;
    if (rounds.length === 0) reasons.push("session has no rounds");
    rounds.forEach((r, i) => {
      const res = validatePlace(r);
      if (!res.ok) reasons.push(`round ${i}: ${res.reasons.join("; ")}`);
    });
    const ids = rounds.map((r) => r.id);
    if (new Set(ids).size !== ids.length)
      reasons.push("duplicate place within session");
    return { ok: reasons.length === 0, reasons, confidence: "verified" };
  },

  verifySolution(level: GameLevel<FactSessionData>): ValidationResult {
    const reasons: string[] = [];
    level.data.rounds.forEach((r, i) => {
      const res = verifyPlace(r);
      if (!res.ok) reasons.push(`round ${i}: ${res.reasons.join("; ")}`);
    });
    return { ok: reasons.length === 0, reasons, confidence: "verified" };
  },

  contentHash: (level) => sessionContentHash(level.data.rounds),
};
