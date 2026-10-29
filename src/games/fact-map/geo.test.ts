import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  playView,
  clampView,
  fitWorld,
  frame,
  greatCircle,
  MIN_VIEW_W,
  screenToLonLat,
  zoomAt,
} from "./geo";
import { haversineKm } from "./engine";

describe("fitWorld", () => {
  it("shows the whole height on a screen wider than the 2:1 world", () => {
    const v = fitWorld(2.6);
    expect(v.h).toBe(180);
    expect(v.w / v.h).toBeCloseTo(2.6, 9);
    expect(v.x).toBeLessThan(0);
  });
  it("shows the whole width on a 16:9 screen, ocean above and below", () => {
    const v = fitWorld(16 / 9);
    expect(v.w).toBe(360);
    expect(v.w / v.h).toBeCloseTo(16 / 9, 9);
  });
  it("shows the whole width on a tall phone", () => {
    const v = fitWorld(0.5);
    expect(v.w).toBe(360);
    expect(v.y).toBeLessThan(0);
  });
});

describe("playView", () => {
  it("is the whole world on a landscape screen", () => {
    expect(playView(1.7)).toEqual(fitWorld(1.7));
  });
  it("fills a phone's height with the inhabited latitudes", () => {
    const v = playView(0.5);
    expect(v.h).toBeCloseTo(128, 6);
    expect(v.y).toBeGreaterThanOrEqual(0);
    expect(v.y + v.h).toBeLessThanOrEqual(180);
  });
});

describe("zoom and pan", () => {
  it("keeps the point under the pointer fixed when zooming", () => {
    const a = 1.6;
    const v = fitWorld(a);
    const before = screenToLonLat(v, 0.3, 0.4);
    const z = zoomAt(v, 3, 0.3, 0.4, a);
    const after = screenToLonLat(z, 0.3, 0.4);
    expect(after.lon).toBeCloseTo(before.lon, 6);
    expect(after.lat).toBeCloseTo(before.lat, 6);
  });

  it("never zooms in past the minimum nor out past the world", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.4, max: 3, noNaN: true }),
        fc.double({ min: 0.001, max: 1000, noNaN: true }),
        (aspect, factor) => {
          const v = zoomAt(fitWorld(aspect), factor, 0.5, 0.5, aspect);
          expect(v.w).toBeGreaterThanOrEqual(MIN_VIEW_W - 1e-9);
          expect(v.w).toBeLessThanOrEqual(fitWorld(aspect).w + 1e-9);
          expect(v.w / v.h).toBeCloseTo(aspect, 6);
          return true;
        },
      ),
      { numRuns: 200 },
    );
  });

  it("cannot drag the world off the screen", () => {
    const a = 1.5;
    const v = clampView({ x: 5000, y: -900, w: 30, h: 20 }, a);
    const cx = v.x + v.w / 2;
    const cy = v.y + v.h / 2;
    expect(cx).toBeLessThanOrEqual(360);
    expect(cy).toBeGreaterThanOrEqual(0);
  });
});

describe("frame", () => {
  it("contains every framed point", () => {
    const pts: [number, number][] = [
      [2.35, 48.86],
      [-0.13, 51.51],
    ];
    const v = frame(pts, 1.6);
    for (const [lon, lat] of pts) {
      expect(lon + 180).toBeGreaterThan(v.x);
      expect(lon + 180).toBeLessThan(v.x + v.w);
      expect(90 - lat).toBeGreaterThan(v.y);
      expect(90 - lat).toBeLessThan(v.y + v.h);
    }
  });
});

describe("frame with panels", () => {
  it("keeps the framed points out of the area the panels cover", () => {
    const pts: [number, number][] = [
      [-21.9, 64.1],
      [31.6, 10],
    ];
    const safe = { top: 0.12, bottom: 0.34 };
    const v = frame(pts, 0.93, 10, 28, safe);
    for (const [, lat] of pts) {
      const fy = (90 - lat - v.y) / v.h;
      expect(fy).toBeGreaterThan(safe.top);
      expect(fy).toBeLessThan(1 - safe.bottom);
    }
  });
});

describe("frame beside a side panel", () => {
  it("keeps every point right of a panel covering the left third", () => {
    const pts: [number, number][] = [
      [-79.07, 43.08],
      [-43.21, -22.95],
      [35.44, 30.33],
    ];
    const safe = { top: 0.1, bottom: 0.06, left: 0.33, right: 0.05 };
    const v = frame(pts, 1.7, 10, 28, safe);
    for (const [lon] of pts) {
      const fx = (lon + 180 - v.x) / v.w;
      expect(fx).toBeGreaterThan(safe.left);
      expect(fx).toBeLessThan(1 - safe.right);
    }
  });
});

describe("greatCircle", () => {
  it("starts and ends at the two places", () => {
    const [seg] = greatCircle(
      { lon: 2.35, lat: 48.86 },
      { lon: -74, lat: 40.7 },
    );
    expect(seg[0][0]).toBeCloseTo(2.35, 6);
    expect(seg.at(-1)![1]).toBeCloseTo(40.7, 6);
  });

  it("splits a route that crosses the 180° meridian", () => {
    const segs = greatCircle({ lon: 170, lat: 0 }, { lon: -170, lat: 0 });
    expect(segs.length).toBe(2);
    for (const s of segs)
      for (let i = 1; i < s.length; i++)
        expect(Math.abs(s[i][0] - s[i - 1][0])).toBeLessThan(180);
  });

  it("follows the globe: every point is on the shortest route", () => {
    const a = { lon: 12.5, lat: 41.9 };
    const b = { lon: 139.7, lat: 35.7 };
    const total = haversineKm(a.lat, a.lon, b.lat, b.lon);
    for (const s of greatCircle(a, b, 16))
      for (const [lon, lat] of s) {
        const viaPoint =
          haversineKm(a.lat, a.lon, lat, lon) +
          haversineKm(lat, lon, b.lat, b.lon);
        expect(viaPoint).toBeCloseTo(total, 0);
      }
  });
});
