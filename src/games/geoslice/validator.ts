import type { GameLevel, LevelValidator, ValidationResult } from "@/types/game";
import type { GeoLevelData } from "./types";
import { scoreCut, type GeoSessionData } from "./engine";

function hash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function validateRegion(r: GeoLevelData): ValidationResult {
  const reasons: string[] = [];
  if (!r.name.trim()) reasons.push("empty name");
  if (r.cities.length < 4) reasons.push("needs at least 4 cities");
  const names = new Set<string>();
  for (const c of r.cities) {
    if (!c.name.trim()) reasons.push("empty city name");
    if (!(c.pop > 0)) reasons.push(`${c.name}: pop must be > 0`);
    if (c.x < 0 || c.x > 100 || c.y < 0 || c.y > 100)
      reasons.push(`${c.name}: coords out of [0,100]`);
    if (names.has(c.name)) reasons.push(`duplicate city "${c.name}"`);
    names.add(c.name);
  }
  if (r.cities.reduce((s, c) => s + c.pop, 0) <= 0)
    reasons.push("total population is zero");
  return { ok: reasons.length === 0, reasons, confidence: "verified" };
}

/** Independent check: a reasonably balanced cut actually exists (solvable). */
export function verifyRegion(r: GeoLevelData): ValidationResult {
  let best = 100;
  for (const theta of [0, 45, 90, 135]) {
    for (let pos = 0; pos <= 100; pos += 2) {
      const { pctA } = scoreCut(r.cities, theta, pos);
      best = Math.min(best, Math.abs(pctA - 50));
    }
  }
  const ok = best <= 8;
  return {
    ok,
    reasons: ok
      ? []
      : [`no balanced cut found (best off by ${best.toFixed(1)}%)`],
    confidence: "heuristic",
  };
}

export function sessionContentHash(rounds: readonly GeoLevelData[]): string {
  return hash(
    rounds
      .map((r) => r.id)
      .sort()
      .join("|"),
  );
}

export const geoValidator: LevelValidator<GeoSessionData> = {
  validateStructure(level: GameLevel<GeoSessionData>): ValidationResult {
    const reasons: string[] = [];
    const rounds = level.data.rounds;
    if (rounds.length === 0) reasons.push("session has no rounds");
    rounds.forEach((r, i) => {
      const res = validateRegion(r);
      if (!res.ok) reasons.push(`round ${i}: ${res.reasons.join("; ")}`);
    });
    const ids = rounds.map((r) => r.id);
    if (new Set(ids).size !== ids.length)
      reasons.push("duplicate region within session");
    return { ok: reasons.length === 0, reasons, confidence: "verified" };
  },

  verifySolution(level: GameLevel<GeoSessionData>): ValidationResult {
    const reasons: string[] = [];
    level.data.rounds.forEach((r, i) => {
      const res = verifyRegion(r);
      if (!res.ok) reasons.push(`round ${i}: ${res.reasons.join("; ")}`);
    });
    return { ok: reasons.length === 0, reasons, confidence: "heuristic" };
  },

  contentHash: (level) => sessionContentHash(level.data.rounds),
};
