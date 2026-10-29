import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  plainEngine,
  scoreGuess,
  MAX_CLIMB_PER_ROUND,
  ROUNDS_PER_SESSION,
  type PlainSessionData,
} from "./engine";
import { buildLevel, pickItems, plainGenerator } from "./generator";
import {
  plainValidator,
  validateItem,
  verifyItem,
  itemSignature,
} from "./validator";
import { PLAIN_ITEMS } from "./data/prompts";
import type { GameLevel } from "@/types/game";
import type { PlainLevelData } from "./types";

function level(rounds: PlainLevelData[]): GameLevel<PlainSessionData> {
  return {
    id: "t",
    gameId: "plain",
    generatorVersion: "t",
    difficulty: "medium",
    data: { rounds },
    contentHash: "t",
    createdAt: "t",
  };
}

describe("scoreGuess", () => {
  it("climbs the full amount for a perfect guess", () => {
    const r = scoreGuess(93, 93);
    expect(r.climb).toBe(MAX_CLIMB_PER_ROUND);
    expect(r.outcome).toBe("bullseye");
    expect(r.direction).toBe("exact");
  });
  it("reports direction and percentage for a miss", () => {
    const r = scoreGuess(93, 40); // 57% under
    expect(r.direction).toBe("under");
    expect(r.pct).toBe(57);
    expect(r.climb).toBeGreaterThan(0);
    expect(r.climb).toBeLessThan(MAX_CLIMB_PER_ROUND);
  });
  it("rewards closer guesses with more climb", () => {
    expect(scoreGuess(100, 100).climb).toBeGreaterThan(
      scoreGuess(100, 150).climb,
    );
    expect(scoreGuess(100, 150).climb).toBeGreaterThan(
      scoreGuess(100, 400).climb,
    );
  });
  it("over and under by the same relative error climb equally", () => {
    expect(scoreGuess(100, 120).climb).toBe(scoreGuess(100, 80).climb);
  });
});

describe("plainEngine", () => {
  it("accumulates altitude and wins when the mission is reached", () => {
    const rounds: PlainLevelData[] = Array.from({ length: 5 }, (_, i) => ({
      question: `q${i}`,
      answer: 100,
      unit: "m",
      category: "Mondo",
    }));
    let s = plainEngine.init(level(rounds));
    for (let i = 0; i < 5; i++)
      s = plainEngine.applyMove(s, { type: "submit", value: 100 });
    const res = plainEngine.getResult(s);
    expect(res.completed).toBe(true);
    expect(res.score).toBe(5000);
    expect(res.won).toBe(true); // 5 * 1000 >= 5000
  });
  it("a pass adds no altitude", () => {
    let s = plainEngine.init(
      level([{ question: "q", answer: 100, unit: "m", category: "Mondo" }]),
    );
    s = plainEngine.applyMove(s, { type: "pass" });
    expect(plainEngine.getResult(s).score).toBe(0);
    expect(plainEngine.getResult(s).won).toBe(false);
  });
});

describe("dataset integrity", () => {
  it("every item is valid and within its unit bounds", () => {
    for (const it of PLAIN_ITEMS) {
      expect(validateItem(it).ok, `${it.id} structure`).toBe(true);
      expect(verifyItem(it).ok, `${it.id} unit bounds`).toBe(true);
    }
  });
  it("has no duplicate signatures or ids", () => {
    expect(new Set(PLAIN_ITEMS.map(itemSignature)).size).toBe(
      PLAIN_ITEMS.length,
    );
    expect(new Set(PLAIN_ITEMS.map((i) => i.id)).size).toBe(PLAIN_ITEMS.length);
  });
});

describe("generator", () => {
  it("is deterministic and builds the right number of distinct rounds", () => {
    const a = plainGenerator.generate("s1");
    const b = plainGenerator.generate("s1");
    expect(a.contentHash).toBe(b.contentHash);
    expect(a.data.rounds).toHaveLength(ROUNDS_PER_SESSION);
    expect(new Set(a.data.rounds.map((r) => r.question)).size).toBe(
      ROUNDS_PER_SESSION,
    );
  });
  it("every generated level passes both validation passes (property)", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 24 }), (seed) => {
        const lvl = buildLevel(seed, pickItems(seed));
        expect(plainValidator.validateStructure(lvl).ok).toBe(true);
        expect(plainValidator.verifySolution(lvl).ok).toBe(true);
      }),
      { numRuns: 120 },
    );
  });
});
