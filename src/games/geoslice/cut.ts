import { projection } from "./engine";
import type { GeoCity } from "./types";

/**
 * Geometry of the cutting line, for drawing and for direct manipulation.
 *
 * The engine describes a cut by `theta` (angle of the line's normal, degrees)
 * and `pos` (0–100 across the cities' projection range). Players do not think
 * in those terms — they grab the line and drag it — so these pure helpers
 * translate between "a line through this point" and the engine's numbers.
 * The engine's scoring is untouched: everything here ends in a (theta, pos).
 */

export interface CutLine {
  /** Unit normal of the line. */
  nx: number;
  ny: number;
  /** Projection value the line sits at. */
  threshold: number;
  /** Point on the line nearest the middle of the map: the pivot. */
  px: number;
  py: number;
  /** Unit direction along the line. */
  dx: number;
  dy: number;
}

const CENTRE = 50;

function range(cities: readonly GeoCity[], theta: number): [number, number] {
  const projs = cities.map((c) => projection(c, theta));
  return [Math.min(...projs), Math.max(...projs)];
}

export function cutLine(
  cities: readonly GeoCity[],
  theta: number,
  pos: number,
): CutLine {
  const t = (theta * Math.PI) / 180;
  const nx = Math.cos(t);
  const ny = Math.sin(t);
  const [min, max] = range(cities, theta);
  const threshold = min + (Math.max(0, Math.min(100, pos)) / 100) * (max - min);
  // Foot of the perpendicular from the map centre to the line.
  const off = CENTRE * nx + CENTRE * ny - threshold;
  return {
    nx,
    ny,
    threshold,
    px: CENTRE - nx * off,
    py: CENTRE - ny * off,
    dx: -ny,
    dy: nx,
  };
}

/** The `pos` that makes the line pass through (x, y), clamped to 0–100. */
export function posThrough(
  cities: readonly GeoCity[],
  theta: number,
  x: number,
  y: number,
): number {
  const [min, max] = range(cities, theta);
  if (max - min < 1e-9) return 50;
  const t = (theta * Math.PI) / 180;
  const p = x * Math.cos(t) + y * Math.sin(t);
  return Math.max(0, Math.min(100, ((p - min) / (max - min)) * 100));
}

/**
 * The angle (0–180°) of a line running from (cx, cy) towards (hx, hy) —
 * used when the player drags a rotation handle around the pivot.
 */
export function thetaToward(
  cx: number,
  cy: number,
  hx: number,
  hy: number,
): number {
  const vx = hx - cx;
  const vy = hy - cy;
  if (Math.hypot(vx, vy) < 1e-9) return 0;
  // Line direction is (−sin θ, cos θ); solve for θ, then fold onto [0, 180).
  const deg = (Math.atan2(-vx, vy) * 180) / Math.PI;
  return ((deg % 180) + 180) % 180;
}

/** Cities on each side of the line — what the colouring already shows. */
export function sideCounts(
  cities: readonly GeoCity[],
  theta: number,
  pos: number,
): { a: number; b: number } {
  const { threshold } = cutLine(cities, theta, pos);
  let a = 0;
  for (const c of cities) if (projection(c, theta) < threshold) a++;
  return { a, b: cities.length - a };
}

/**
 * One half of the plane, clipped to a square box, as a polygon — used to
 * tint the two sides on reveal. Sutherland–Hodgman against a single line.
 */
export function halfPlane(
  line: CutLine,
  side: "a" | "b",
  box: { x0: number; y0: number; x1: number; y1: number },
): [number, number][] {
  const corners: [number, number][] = [
    [box.x0, box.y0],
    [box.x1, box.y0],
    [box.x1, box.y1],
    [box.x0, box.y1],
  ];
  const f = (p: [number, number]) =>
    p[0] * line.nx + p[1] * line.ny - line.threshold;
  const inside = (p: [number, number]) => (side === "a" ? f(p) < 0 : f(p) >= 0);
  const out: [number, number][] = [];
  for (let i = 0; i < corners.length; i++) {
    const cur = corners[i];
    const prev = corners[(i + corners.length - 1) % corners.length];
    const cIn = inside(cur);
    const pIn = inside(prev);
    if (cIn !== pIn) {
      const fp = f(prev);
      const fc = f(cur);
      const t = fp / (fp - fc);
      out.push([
        prev[0] + t * (cur[0] - prev[0]),
        prev[1] + t * (cur[1] - prev[1]),
      ]);
    }
    if (cIn) out.push(cur);
  }
  return out;
}
