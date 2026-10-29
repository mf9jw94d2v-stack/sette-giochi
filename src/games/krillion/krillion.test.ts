import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  krillionEngine,
  lookupAnswer,
  normalizeAnswer,
  ROUNDS_PER_SESSION,
  type KrillionSessionData,
} from "./engine";
import { buildLevel, pickPrompts, krillionGenerator } from "./generator";
import { krillionValidator, validatePrompt, verifyPrompt } from "./validator";
import { KRILLION_PROMPTS } from "./data/prompts";
import { TIER_POINTS } from "./types";
import type { GameLevel } from "@/types/game";

const birds = KRILLION_PROMPTS.find((p) => p.id === "uccello")!;

function level(ids: string[]): GameLevel<KrillionSessionData> {
  const rounds = ids.map((id) => KRILLION_PROMPTS.find((p) => p.id === id)!);
  return {
    id: "t",
    gameId: "krillion",
    generatorVersion: "t",
    difficulty: "medium",
    data: { rounds },
    contentHash: "t",
    createdAt: "t",
  };
}

describe("lookupAnswer", () => {
  it("matches case/accent-insensitively and via aliases", () => {
    expect(lookupAnswer(birds, "  AQUILA ")?.tier).toBe("plankton");
    expect(lookupAnswer(birds, "becco a scarpa")?.tier).toBe("krillion");
    expect(lookupAnswer(birds, "shoebill")?.tier).toBe("krillion");
    expect(lookupAnswer(birds, "unicorno")).toBeNull();
  });
  it("normalises accents", () => {
    expect(normalizeAnswer("São Tomé")).toBe("sao tome");
  });
});

describe("krillionEngine", () => {
  it("scores the matched tier as depth (points × 10)", () => {
    let s = krillionEngine.init(level(["uccello", "frutto"]));
    s = krillionEngine.applyMove(s, {
      type: "accept",
      answer: "Becco a scarpa",
      tier: "krillion",
    });
    s = krillionEngine.applyMove(s, {
      type: "accept",
      answer: "Mela",
      tier: "plankton",
    });
    const res = krillionEngine.getResult(s);
    expect(res.completed).toBe(true);
    expect(res.score).toBe((TIER_POINTS.krillion + TIER_POINTS.plankton) * 10);
    expect(res.won).toBe(true);
    expect(res.detail?.krillions).toBe(1);
  });
  it("a pass scores nothing and breaks a full dive", () => {
    let s = krillionEngine.init(level(["uccello"]));
    s = krillionEngine.applyMove(s, { type: "pass" });
    expect(krillionEngine.getResult(s).score).toBe(0);
    expect(krillionEngine.getResult(s).won).toBe(false);
  });
});

describe("dataset integrity", () => {
  it("every prompt is valid and has a rarity spread", () => {
    for (const p of KRILLION_PROMPTS) {
      expect(validatePrompt(p).ok, `${p.id} structure`).toBe(true);
      expect(verifyPrompt(p).ok, `${p.id} spread`).toBe(true);
    }
  });
  it("has unique prompt ids", () => {
    const ids = KRILLION_PROMPTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("generator", () => {
  it("is deterministic with distinct prompts", () => {
    const a = krillionGenerator.generate("s1");
    const b = krillionGenerator.generate("s1");
    expect(a.contentHash).toBe(b.contentHash);
    expect(a.data.rounds).toHaveLength(ROUNDS_PER_SESSION);
    expect(new Set(a.data.rounds.map((r) => r.id)).size).toBe(
      ROUNDS_PER_SESSION,
    );
  });
  it("every generated level passes both validation passes (property)", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 24 }), (seed) => {
        const lvl = buildLevel(seed, pickPrompts(seed));
        expect(krillionValidator.validateStructure(lvl).ok).toBe(true);
        expect(krillionValidator.verifySolution(lvl).ok).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
