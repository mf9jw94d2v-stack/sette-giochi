import { describe, expect, it } from "vitest";
import {
  LAT_MAX,
  LAT_MIN,
  project,
  unproject,
  WORLD_H,
  WORLD_W,
} from "./projection";

describe("Miller projection", () => {
  it("is a rectangle: same x for a meridian, same y for a parallel", () => {
    expect(project(12.5, 0)[0]).toBeCloseTo(project(12.5, 60)[0], 9);
    expect(project(-70, 45)[1]).toBeCloseTo(project(100, 45)[1], 9);
    expect(project(-180, LAT_MAX)).toEqual([0, 0]);
    const [x, y] = project(180, LAT_MIN);
    expect(x).toBeCloseTo(WORLD_W, 9);
    expect(y).toBeCloseTo(WORLD_H, 9);
  });

  it("matches Miller's formula (y = 1.25 ln tan(π/4 + 0.4φ))", () => {
    const yOf = (lat: number) =>
      1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * ((lat * Math.PI) / 180)));
    const k = WORLD_W / (2 * Math.PI);
    expect(project(0, 45)[1] - project(0, 0)[1]).toBeCloseTo(-yOf(45) * k, 9);
    expect(yOf(45)).toBeCloseTo(0.8428, 3);
  });

  it("inverts exactly, so a click lands where it points", () => {
    for (let lon = -175; lon <= 175; lon += 25) {
      for (let lat = -55; lat <= 80; lat += 15) {
        const [x, y] = project(lon, lat);
        const back = unproject(x, y);
        expect(back.lon).toBeCloseTo(lon, 9);
        expect(back.lat).toBeCloseTo(lat, 9);
      }
    }
  });
});
