import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  factEngine,
  haversineKm,
  scoreDistance,
  HINT_CAP,
  ROUNDS_PER_SESSION,
  type FactSessionData,
} from "./engine";
import { buildLevel, pickPlaces, factGenerator } from "./generator";
import { factValidator, validatePlace, verifyPlace } from "./validator";
import { FACT_PLACES } from "./data/places";
import type { GameLevel } from "@/types/game";

function level(ids: string[]): GameLevel<FactSessionData> {
  const rounds = ids.map((id) => FACT_PLACES.find((p) => p.id === id)!);
  return {
    id: "t",
    gameId: "fact-map",
    generatorVersion: "t",
    difficulty: "medium",
    data: { rounds },
    contentHash: "t",
    createdAt: "t",
  };
}

describe("haversineKm", () => {
  it("computes a known distance (Paris–London ≈ 343 km)", () => {
    const d = haversineKm(48.858, 2.294, 51.5, -0.1246);
    expect(d).toBeGreaterThan(330);
    expect(d).toBeLessThan(355);
  });
  it("is zero for the same point", () => {
    expect(haversineKm(10, 20, 10, 20)).toBeCloseTo(0, 5);
  });
});

describe("scoreDistance", () => {
  it("gives full marks within the bullseye radius", () => {
    expect(scoreDistance(0, false)).toBe(1000);
    expect(scoreDistance(40, false)).toBe(1000);
  });
  it("decays with distance and caps with a hint", () => {
    expect(scoreDistance(3000, false)).toBeLessThan(400);
    expect(scoreDistance(0, true)).toBe(HINT_CAP);
  });
});

describe("factEngine", () => {
  it("scores a near-perfect pin and a far one", () => {
    let s = factEngine.init(level(["eiffel", "colosseo"]));
    s = factEngine.applyMove(s, {
      type: "submit",
      lat: 48.86,
      lon: 2.29,
      hintUsed: false,
    });
    s = factEngine.applyMove(s, {
      type: "submit",
      lat: 0,
      lon: 0,
      hintUsed: false,
    });
    const res = factEngine.getResult(s);
    expect(res.completed).toBe(true);
    expect(res.score).toBeGreaterThan(900); // first ~1000, second ~0
    expect(res.score).toBeLessThan(1100);
  });
});

describe("dataset integrity", () => {
  it("every place is valid with in-range coordinates", () => {
    for (const p of FACT_PLACES) {
      expect(validatePlace(p).ok, `${p.id} structure`).toBe(true);
      expect(verifyPlace(p).ok, `${p.id} coords`).toBe(true);
    }
  });
  it("has unique place ids", () => {
    const ids = FACT_PLACES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("generator", () => {
  it("is deterministic with distinct places", () => {
    const a = factGenerator.generate("s1");
    const b = factGenerator.generate("s1");
    expect(a.contentHash).toBe(b.contentHash);
    expect(a.data.rounds).toHaveLength(ROUNDS_PER_SESSION);
    expect(new Set(a.data.rounds.map((r) => r.id)).size).toBe(
      ROUNDS_PER_SESSION,
    );
  });
  it("every generated level passes both validation passes (property)", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 24 }), (seed) => {
        const lvl = buildLevel(seed, pickPlaces(seed));
        expect(factValidator.validateStructure(lvl).ok).toBe(true);
        expect(factValidator.verifySolution(lvl).ok).toBe(true);
      }),
      { numRuns: 80 },
    );
  });
});
