import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  geoEngine,
  scoreCut,
  ROUNDS_PER_SESSION,
  type GeoSessionData,
} from "./engine";
import { buildLevel, pickRegions, geoGenerator } from "./generator";
import { geoValidator, validateRegion, verifyRegion } from "./validator";
import { GEO_REGIONS } from "./data/regions";
import type { GameLevel } from "@/types/game";
import type { GeoLevelData } from "./types";

const twoCities: GeoLevelData = {
  id: "t",
  name: "Test",
  cities: [
    { name: "A", x: 10, y: 50, pop: 100 },
    { name: "B", x: 90, y: 50, pop: 100 },
  ],
};

function level(ids: string[]): GameLevel<GeoSessionData> {
  const rounds = ids.map((id) => GEO_REGIONS.find((r) => r.id === id)!);
  return {
    id: "t",
    gameId: "geoslice",
    generatorVersion: "t",
    difficulty: "medium",
    data: { rounds },
    contentHash: "t",
    createdAt: "t",
  };
}

describe("scoreCut", () => {
  it("awards full marks for a perfect 50/50 split", () => {
    const r = scoreCut(twoCities.cities, 0, 50); // split by x at the middle
    expect(Math.round(r.pctA)).toBe(50);
    expect(r.points).toBe(1000);
  });
  it("scores zero when everyone ends on one side", () => {
    expect(scoreCut(twoCities.cities, 0, 0).points).toBe(0);
  });
});

describe("geoEngine", () => {
  it("plays and records the split", () => {
    let s = geoEngine.init(level(["italia"]));
    s = geoEngine.applyMove(s, { type: "submit", theta: 0, pos: 50 });
    const res = geoEngine.getResult(s);
    expect(res.completed).toBe(true);
    expect(res.score).toBeGreaterThan(0);
  });
});

describe("dataset integrity", () => {
  it("every region is valid and has a balanced cut (solvable)", () => {
    for (const r of GEO_REGIONS) {
      expect(validateRegion(r).ok, `${r.id} structure`).toBe(true);
      expect(verifyRegion(r).ok, `${r.id} solvable`).toBe(true);
    }
  });
  it("has unique region ids", () => {
    const ids = GEO_REGIONS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("generator", () => {
  it("is deterministic with distinct regions", () => {
    const a = geoGenerator.generate("s1");
    const b = geoGenerator.generate("s1");
    expect(a.contentHash).toBe(b.contentHash);
    expect(a.data.rounds).toHaveLength(ROUNDS_PER_SESSION);
    expect(new Set(a.data.rounds.map((r) => r.id)).size).toBe(
      ROUNDS_PER_SESSION,
    );
  });
  it("every generated level passes both validation passes (property)", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 24 }), (seed) => {
        const lvl = buildLevel(seed, pickRegions(seed));
        expect(geoValidator.validateStructure(lvl).ok).toBe(true);
        expect(geoValidator.verifySolution(lvl).ok).toBe(true);
      }),
      { numRuns: 80 },
    );
  });
});
