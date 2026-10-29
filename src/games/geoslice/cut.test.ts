import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { cutLine, halfPlane, posThrough, sideCounts, thetaToward } from "./cut";
import { projection, scoreCut } from "./engine";
import { GEO_REGIONS } from "./data/regions";

const cities = GEO_REGIONS[0].cities;

describe("posThrough", () => {
  it("puts the line through the dragged point", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 179 }),
        fc.double({ min: 20, max: 80, noNaN: true }),
        fc.double({ min: 20, max: 80, noNaN: true }),
        (theta, x, y) => {
          const pos = posThrough(cities, theta, x, y);
          if (pos <= 0 || pos >= 100) return true; // clamped beyond the cities
          const line = cutLine(cities, theta, pos);
          expect(x * line.nx + y * line.ny).toBeCloseTo(line.threshold, 6);
          return true;
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe("thetaToward", () => {
  it("aligns the line with the handle direction", () => {
    for (const theta of [0, 30, 45, 90, 120, 179]) {
      const line = cutLine(cities, theta, 50);
      const back = thetaToward(
        line.px,
        line.py,
        line.px + line.dx * 20,
        line.py + line.dy * 20,
      );
      expect(back).toBeCloseTo(theta, 6);
    }
  });

  it("stays in [0, 180) from any direction", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -50, max: 50, noNaN: true }),
        fc.double({ min: -50, max: 50, noNaN: true }),
        (vx, vy) => {
          const t = thetaToward(0, 0, vx, vy);
          expect(t).toBeGreaterThanOrEqual(0);
          expect(t).toBeLessThan(180);
          return true;
        },
      ),
    );
  });
});

describe("sideCounts", () => {
  it("agrees with the engine about which side each city is on", () => {
    for (const theta of [0, 60, 135]) {
      const { threshold } = scoreCut(cities, theta, 40);
      const a = cities.filter((c) => projection(c, theta) < threshold).length;
      expect(sideCounts(cities, theta, 40)).toEqual({
        a,
        b: cities.length - a,
      });
    }
  });
});

describe("halfPlane", () => {
  it("splits the box into two pieces whose areas add up to the box", () => {
    const area = (p: [number, number][]) =>
      Math.abs(
        p.reduce((s, [x, y], i) => {
          const [x2, y2] = p[(i + 1) % p.length];
          return s + x * y2 - x2 * y;
        }, 0) / 2,
      );
    const box = { x0: 0, y0: 0, x1: 100, y1: 100 };
    for (const theta of [10, 45, 90, 160]) {
      const line = cutLine(cities, theta, 50);
      const total =
        area(halfPlane(line, "a", box)) + area(halfPlane(line, "b", box));
      expect(total).toBeCloseTo(100 * 100, 6);
    }
  });
});
