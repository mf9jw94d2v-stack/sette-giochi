import { describe, expect, it } from "vitest";
import { GAZILLION_EVENTS } from "./data/events";
import {
  eventSignature,
  gazillionValidator,
  validateRound,
  verifyRound,
} from "./validator";
import { buildLevel } from "./generator";
import type { GameLevel } from "@/types/game";
import type { GazillionSessionData } from "./engine";

describe("dataset integrity", () => {
  it("every shipped event passes structure and era-consistency checks", () => {
    for (const ev of GAZILLION_EVENTS) {
      const s = validateRound(ev);
      const v = verifyRound(ev);
      expect(s.ok, `${ev.id} structure: ${s.reasons.join(", ")}`).toBe(true);
      expect(v.ok, `${ev.id} era/year: ${v.reasons.join(", ")}`).toBe(true);
    }
  });

  it("has no duplicate event signatures or ids", () => {
    const sigs = GAZILLION_EVENTS.map(eventSignature);
    expect(new Set(sigs).size).toBe(sigs.length);
    const ids = GAZILLION_EVENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("gazillionValidator", () => {
  it("approves a generated level", () => {
    const lvl = buildLevel("s", [...GAZILLION_EVENTS].slice(0, 5));
    expect(gazillionValidator.validateStructure(lvl).ok).toBe(true);
    expect(gazillionValidator.verifySolution(lvl).ok).toBe(true);
    expect(gazillionValidator.contentHash(lvl)).toHaveLength(8);
  });

  it("catches an era/year inconsistency in the independent pass", () => {
    const bad: GameLevel<GazillionSessionData> = {
      id: "bad",
      gameId: "gazillion",
      generatorVersion: "t",
      difficulty: "medium",
      data: {
        rounds: [
          // Claims 'ancient' but the year is modern → must fail verifySolution.
          { prompt: "Mislabelled", year: 2000, category: "X", era: "ancient" },
        ],
      },
      contentHash: "t",
      createdAt: "t",
    };
    expect(gazillionValidator.validateStructure(bad).ok).toBe(true);
    expect(gazillionValidator.verifySolution(bad).ok).toBe(false);
  });

  it("flags a duplicate event within a session", () => {
    const dup = buildLevel("s", [
      GAZILLION_EVENTS[0],
      GAZILLION_EVENTS[0],
      GAZILLION_EVENTS[1],
    ]);
    expect(gazillionValidator.validateStructure(dup).ok).toBe(false);
  });
});
