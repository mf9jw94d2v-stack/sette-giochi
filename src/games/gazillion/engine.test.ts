import { describe, expect, it } from "vitest";
import {
  gazillionEngine,
  scoreRound,
  tolerance,
  type GazillionSessionData,
} from "./engine";
import type { GameLevel } from "@/types/game";
import type { GazillionLevelData } from "./types";

const NOW = 2026;

function round(year: number): GazillionLevelData {
  return {
    prompt: `event ${year}`,
    year,
    category: "Test",
    era: "contemporary",
  };
}

function level(years: number[]): GameLevel<GazillionSessionData> {
  return {
    id: "t",
    gameId: "gazillion",
    generatorVersion: "test",
    difficulty: "medium",
    data: { rounds: years.map(round) },
    contentHash: "t",
    createdAt: "t",
  };
}

describe("scoreRound", () => {
  it("awards up to 1000 for a tight trap and traps the year", () => {
    const r = scoreRound(2007, 2005, 2009, NOW);
    expect(r.trapped).toBe(true);
    expect(r.points).toBeGreaterThan(500);
    expect(r.points).toBeLessThanOrEqual(1000);
  });

  it("rewards a tighter trap more than a wider one", () => {
    const tight = scoreRound(2007, 2005, 2009, NOW).points;
    const wide = scoreRound(2007, 1950, 2026, NOW).points;
    expect(tight).toBeGreaterThan(wide);
  });

  it("gives faded partial credit for a miss (never a flat zero when close)", () => {
    const miss = scoreRound(2007, 2010, 2020, NOW); // year below range
    expect(miss.trapped).toBe(false);
    expect(miss.points).toBeGreaterThan(0);
    // ...but less than actually trapping it tightly.
    expect(miss.points).toBeLessThan(scoreRound(2007, 2005, 2009, NOW).points);
  });

  it("fades to ~0 for a wildly wrong, far miss", () => {
    const far = scoreRound(2007, 1000, 1100, NOW);
    expect(far.points).toBeLessThan(10);
  });

  it("is order-insensitive in low/high", () => {
    expect(scoreRound(2007, 2009, 2005, NOW)).toEqual(
      scoreRound(2007, 2005, 2009, NOW),
    );
  });

  it("gives older events a wider tolerance than recent ones", () => {
    expect(tolerance(2000)).toBeGreaterThan(tolerance(10));
  });
});

describe("gazillionEngine", () => {
  it("plays a session, sums scores and flags a clean run", () => {
    let s = gazillionEngine.init(level([2007, 1969, 1989]));
    expect(gazillionEngine.isTerminal(s)).toBe(false);
    s = gazillionEngine.applyMove(s, { type: "submit", low: 2005, high: 2009 });
    s = gazillionEngine.applyMove(s, { type: "submit", low: 1967, high: 1971 });
    s = gazillionEngine.applyMove(s, { type: "submit", low: 1987, high: 1991 });
    expect(gazillionEngine.isTerminal(s)).toBe(true);

    const res = gazillionEngine.getResult(s);
    expect(res.completed).toBe(true);
    expect(res.won).toBe(true); // all three trapped
    expect(res.score).toBeGreaterThan(0);
    expect(res.detail?.trappedCount).toBe(3);
  });

  it("a pass scores zero and is not a clean run", () => {
    let s = gazillionEngine.init(level([2007, 1969]));
    s = gazillionEngine.applyMove(s, { type: "submit", low: 2005, high: 2009 });
    s = gazillionEngine.applyMove(s, { type: "pass" });
    const res = gazillionEngine.getResult(s);
    expect(res.completed).toBe(true);
    expect(res.won).toBe(false);
    expect(res.detail?.trappedCount).toBe(1);
  });

  it("ignores moves once finished", () => {
    let s = gazillionEngine.init(level([2007]));
    s = gazillionEngine.applyMove(s, { type: "submit", low: 2000, high: 2010 });
    const after = gazillionEngine.applyMove(s, {
      type: "submit",
      low: 1,
      high: 2,
    });
    expect(after).toBe(s);
  });
});
