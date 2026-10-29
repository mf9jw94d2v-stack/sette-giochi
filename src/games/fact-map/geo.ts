/**
 * Map geometry for Fact Map, kept pure so it can be tested without a browser.
 *
 * The map is drawn in an equirectangular projection: x = longitude + 180,
 * y = 90 − latitude, so the whole world is a 360 × 180 box. A `View` is the
 * part of that box currently on screen — panning moves it, zooming shrinks it.
 * Its aspect ratio always matches the screen's, so nothing is ever stretched.
 */

export const WORLD_W = 360;
export const WORLD_H = 180;

export const px = (lon: number): number => lon + 180;
export const py = (lat: number): number => 90 - lat;

export interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Narrowest view allowed, in degrees of longitude — about a city region. */
export const MIN_VIEW_W = 6;

/** The whole world, letterboxed with ocean to fill a screen of `aspect`. */
export function fitWorld(aspect: number): View {
  const a = aspect > 0 && Number.isFinite(aspect) ? aspect : 2;
  if (a >= WORLD_W / WORLD_H) {
    const w = WORLD_H * a;
    return { x: (WORLD_W - w) / 2, y: 0, w, h: WORLD_H };
  }
  const h = WORLD_W / a;
  return { x: 0, y: (WORLD_H - h) / 2, w: WORLD_W, h };
}

/**
 * Where a round opens. On a landscape screen, the whole world. On a portrait
 * phone the whole world is a thin strip between two bands of empty ocean, so
 * instead the inhabited latitudes (72°N–56°S) fill the height and the player
 * drags sideways — a bigger map is a more precise pin. "Mostra tutto il
 * mondo" still gives the overview in one tap.
 */
export function playView(aspect: number): View {
  if (!(aspect > 0) || aspect >= 1.2) return fitWorld(aspect);
  const h = 72 + 56;
  const w = h * aspect;
  const cx = px(15);
  const cy = py((72 - 56) / 2);
  return clampView({ x: cx - w / 2, y: cy - h / 2, w, h }, aspect);
}

/**
 * Keep a view sensible: aspect locked to the screen, never wider than the
 * whole-world fit, never narrower than MIN_VIEW_W, and its centre always over
 * the map so the world cannot be dragged off-screen and lost.
 */
export function clampView(v: View, aspect: number): View {
  const world = fitWorld(aspect);
  const w = Math.min(world.w, Math.max(MIN_VIEW_W, v.w));
  const h = w / (aspect > 0 ? aspect : 2);
  const cx = Math.min(WORLD_W, Math.max(0, v.x + v.w / 2));
  const cy = Math.min(WORLD_H, Math.max(0, v.y + v.h / 2));
  if (w >= world.w - 1e-9) return world;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/**
 * Zoom by `factor` (>1 zooms in) keeping the point at fractional screen
 * position (fx, fy) fixed under the pointer — the way a map should feel.
 */
export function zoomAt(
  v: View,
  factor: number,
  fx: number,
  fy: number,
  aspect: number,
): View {
  const w = v.w / factor;
  const h = v.h / factor;
  const ax = v.x + fx * v.w;
  const ay = v.y + fy * v.h;
  return clampView({ x: ax - fx * w, y: ay - fy * h, w, h }, aspect);
}

/** Map coordinates under a point of the screen. */
export function screenToLonLat(
  v: View,
  fx: number,
  fy: number,
): { lon: number; lat: number } {
  return { lon: v.x + fx * v.w - 180, lat: 90 - (v.y + fy * v.h) };
}

/** Fractions of the screen covered by floating panels on each side. */
export interface SafeArea {
  top: number;
  bottom: number;
  left?: number;
  right?: number;
}

/**
 * The smallest view that shows every point with some margin — used to frame
 * the guess and the answer together when a round is revealed.
 *
 * `safe` says how much of the screen the floating panels cover at the top and
 * bottom. The points are framed into the band BETWEEN them; framing into the
 * whole screen put the player's own pin underneath the result card.
 */
export function frame(
  points: readonly [number, number][],
  aspect: number,
  marginDeg = 10,
  minW = 28,
  safe: SafeArea = { top: 0, bottom: 0 },
): View {
  const left = safe.left ?? 0;
  const right = safe.right ?? 0;
  if (points.length === 0) return playView(aspect);
  const xs = points.map(([lon]) => px(lon));
  const ys = points.map(([, lat]) => py(lat));
  const minX = Math.min(...xs) - marginDeg;
  const maxX = Math.max(...xs) + marginDeg;
  const minY = Math.min(...ys) - marginDeg;
  const maxY = Math.max(...ys) + marginDeg;
  const a = aspect > 0 ? aspect : 2;
  const band = Math.max(0.2, 1 - safe.top - safe.bottom);
  const bandX = Math.max(0.2, 1 - left - right);
  const w = Math.max(minW, (maxX - minX) / bandX, ((maxY - minY) / band) * a);
  const h = w / a;
  // Centre the points in the free area between the panels, not the screen.
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return clampView(
    {
      x: cx - (left + bandX / 2) * w,
      y: cy - (safe.top + band / 2) * h,
      w,
      h,
    },
    a,
  );
}

const RAD = Math.PI / 180;

function toVec(lon: number, lat: number): [number, number, number] {
  const l = lon * RAD;
  const p = lat * RAD;
  return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
}

/**
 * The great-circle route between two places — the shortest path on the
 * globe, which is what a distance in km actually measures. On a flat map it
 * curves, and when it crosses the 180° meridian it is split into two pieces
 * so it never draws a line straight across the whole map.
 */
export function greatCircle(
  a: { lon: number; lat: number },
  b: { lon: number; lat: number },
  steps = 64,
): [number, number][][] {
  const va = toVec(a.lon, a.lat);
  const vb = toVec(b.lon, b.lat);
  const dot = Math.min(
    1,
    Math.max(-1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]),
  );
  const omega = Math.acos(dot);
  if (omega < 1e-9)
    return [
      [
        [a.lon, a.lat],
        [b.lon, b.lat],
      ],
    ];

  const segments: [number, number][][] = [[]];
  let prevLon: number | null = null;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const s1 = Math.sin((1 - t) * omega) / Math.sin(omega);
    const s2 = Math.sin(t * omega) / Math.sin(omega);
    const x = s1 * va[0] + s2 * vb[0];
    const y = s1 * va[1] + s2 * vb[1];
    const z = s1 * va[2] + s2 * vb[2];
    const lat = Math.atan2(z, Math.hypot(x, y)) / RAD;
    const lon = Math.atan2(y, x) / RAD;
    if (prevLon !== null && Math.abs(lon - prevLon) > 180) segments.push([]);
    segments[segments.length - 1].push([lon, lat]);
    prevLon = lon;
  }
  return segments.filter((s) => s.length > 1);
}

/** Polyline in map coordinates. */
export function pathOf(points: readonly [number, number][]): string {
  return points
    .map(
      ([lon, lat], i) =>
        `${i ? "L" : "M"}${px(lon).toFixed(2)} ${py(lat).toFixed(2)}`,
    )
    .join(" ");
}
