import { describe, expect, it } from "vitest";
import { geoEqualEarth } from "d3-geo";
import { project, unproject, WORLD_H, WORLD_W } from "./projection";

describe("Equal Earth projection", () => {
  it("matches d3-geo's reference implementation", () => {
    // d3 projection scaled to the same box: compare relative positions.
    const d3 = geoEqualEarth().fitSize([WORLD_W, WORLD_H], { type: "Sphere" });
    for (const [lon, lat] of [
      [0, 0],
      [12.5, 41.9],
      [-74, 40.7],
      [139.7, 35.7],
      [-58.4, -34.6],
      [151.2, -33.9],
      [179, 70],
    ]) {
      const [x, y] = project(lon, lat);
      const [rx, ry] = d3([lon, lat])!;
      expect(Math.abs(x - rx)).toBeLessThan(0.05);
      expect(Math.abs(y - ry)).toBeLessThan(0.05);
    }
  });

  it("inverts exactly, so a click lands where it points", () => {
    for (let lon = -175; lon <= 175; lon += 25) {
      for (let lat = -80; lat <= 80; lat += 20) {
        const [x, y] = project(lon, lat);
        const back = unproject(x, y);
        expect(back.lon).toBeCloseTo(lon, 6);
        expect(back.lat).toBeCloseTo(lat, 6);
      }
    }
  });

  it("brings clicks outside the outline back to the edge", () => {
    const corner = unproject(0, 0);
    expect(corner.lon).toBe(-180);
    expect(corner.lat).toBeCloseTo(90, 3);
  });
});
