import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  estimaniaEngine,
  scoreRound,
  ROUNDS_PER_SESSION,
  type EstimaniaSessionData,
} from "./engine";
import { buildLevel, pickItems, estimaniaGenerator } from "./generator";
import {
  estimaniaValidator,
  validateItem,
  verifyItem,
  itemSignature,
} from "./validator";
import { ESTIMANIA_ITEMS } from "./data/questions";
import type { GameLevel } from "@/types/game";
import type { EstimaniaLevelData } from "./types";

function level(items: EstimaniaLevelData[]): GameLevel<EstimaniaSessionData> {
  return {
    id: "t",
    gameId: "estimania",
    generatorVersion: "t",
    difficulty: "medium",
    data: { rounds: items },
    contentHash: "t",
    createdAt: "t",
  };
}

describe("scoreRound (verified Estimania formula)", () => {
  it("gives full marks for an exact guess", () => {
    expect(scoreRound(206, 206).points).toBe(100);
  });
  it("matches the certified ratio table (2x=70, 10x=0)", () => {
    expect(scoreRound(100, 100).points).toBe(100);
    expect(scoreRound(100, 200).points).toBe(70); // 2x
    expect(scoreRound(100, 50).points).toBe(70); // 0.5x (symmetric)
    expect(scoreRound(100, 1000).points).toBe(0); // 10x
    expect(scoreRound(100, 10).points).toBe(0); // 0.1x
  });
  it("rewards closer guesses more, symmetrically for over/under", () => {
    const exact = scoreRound(100, 100).points;
    const near = scoreRound(100, 110).points;
    const far = scoreRound(100, 300).points;
    expect(exact).toBeGreaterThan(near);
    expect(near).toBeGreaterThan(far);
    expect(scoreRound(100, 200).points).toBe(scoreRound(100, 50).points);
  });
  it("scores zero for a non-positive guess", () => {
    expect(scoreRound(100, 0).points).toBe(0);
    expect(scoreRound(100, -5).points).toBe(0);
  });
});

describe("estimaniaEngine", () => {
  it("plays a session and sums points", () => {
    let s = estimaniaEngine.init(
      level([
        { question: "a", answer: 100, category: "Numeri" },
        { question: "b", answer: 50, category: "Numeri" },
      ]),
    );
    s = estimaniaEngine.applyMove(s, { type: "submit", value: 100 });
    s = estimaniaEngine.applyMove(s, { type: "submit", value: 50 });
    const res = estimaniaEngine.getResult(s);
    expect(res.completed).toBe(true);
    expect(res.won).toBe(true);
    expect(res.score).toBe(200);
  });
  it("a pass scores zero and breaks a clean run", () => {
    let s = estimaniaEngine.init(
      level([{ question: "a", answer: 100, category: "Numeri" }]),
    );
    s = estimaniaEngine.applyMove(s, { type: "pass" });
    expect(estimaniaEngine.getResult(s).won).toBe(false);
  });
});

describe("dataset integrity", () => {
  it("every item is structurally valid and magnitude-consistent", () => {
    for (const it of ESTIMANIA_ITEMS) {
      expect(validateItem(it).ok, `${it.id} structure`).toBe(true);
      expect(verifyItem(it).ok, `${it.id} magnitude`).toBe(true);
    }
  });
  it("has no duplicate signatures or ids", () => {
    const sigs = ESTIMANIA_ITEMS.map(itemSignature);
    expect(new Set(sigs).size).toBe(sigs.length);
    const ids = ESTIMANIA_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("generator", () => {
  it("is deterministic and produces distinct rounds", () => {
    const a = estimaniaGenerator.generate("s1");
    const b = estimaniaGenerator.generate("s1");
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
        expect(estimaniaValidator.validateStructure(lvl).ok).toBe(true);
        expect(estimaniaValidator.verifySolution(lvl).ok).toBe(true);
      }),
      { numRuns: 150 },
    );
  });
});
