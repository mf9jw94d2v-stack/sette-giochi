import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { MIN_SPAN } from "./engine";
import {
  AXIS_MAX_YEAR,
  AXIS_MIN_YEAR,
  ERA_BANDS,
  setEnd,
  slide,
  tToYear,
  yearToT,
} from "./scale";

describe("timeline scale", () => {
  it("runs from the oldest edge (0) to today (1)", () => {
    expect(yearToT(AXIS_MIN_YEAR)).toBeCloseTo(0, 9);
    expect(yearToT(AXIS_MAX_YEAR)).toBeCloseTo(1, 9);
  });

  it("round-trips a year to its position and back", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: AXIS_MIN_YEAR, max: AXIS_MAX_YEAR }),
        (y) => {
          expect(tToYear(yearToT(y))).toBe(y);
          return true;
        },
      ),
      { numRuns: 300 },
    );
  });

  it("is monotonic: a later year is always further right", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: AXIS_MIN_YEAR, max: AXIS_MAX_YEAR - 1 }),
        (y) => {
          expect(yearToT(y + 1)).toBeGreaterThan(yearToT(y));
          return true;
        },
      ),
    );
  });

  it("gives every era a fair share of the width", () => {
    for (const e of ERA_BANDS) {
      const share = yearToT(e.to) - yearToT(e.from);
      expect(share, e.label).toBeGreaterThan(0.1);
      expect(share, e.label).toBeLessThan(0.25);
    }
  });
});

describe("trap editing", () => {
  it("never lets the ends cross or come closer than the minimum span", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: AXIS_MIN_YEAR, max: AXIS_MAX_YEAR }),
        fc.constantFrom<"low" | "high">("low", "high"),
        (y, end) => {
          const t = setEnd({ low: 1200, high: 1800 }, end, y);
          expect(t.high - t.low).toBeGreaterThanOrEqual(MIN_SPAN);
          return true;
        },
      ),
      { numRuns: 300 },
    );
  });

  it("slides the trap without leaving the axis", () => {
    fc.assert(
      fc.property(fc.double({ min: -2, max: 2, noNaN: true }), (dt) => {
        const t = slide({ low: 1200, high: 1800 }, dt);
        expect(t.low).toBeGreaterThanOrEqual(AXIS_MIN_YEAR);
        expect(t.high).toBeLessThanOrEqual(AXIS_MAX_YEAR);
        expect(t.high - t.low).toBeGreaterThanOrEqual(MIN_SPAN);
        return true;
      }),
      { numRuns: 200 },
    );
  });
});
