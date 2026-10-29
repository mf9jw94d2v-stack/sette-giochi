/**
 * Draw In Scala's silhouettes, in METRES, and write
 * src/games/size-it-up/silhouetteData.ts.
 *
 * Each object is built from simple shapes — rectangles, circles, tubes,
 * polygons — combined with exact boolean geometry (polygon-clipping, MIT):
 * union where parts meet, difference for windows, wheels and openings. So
 * overlapping parts never punch holes in each other (the old hand-written
 * paths used even-odd filling and did), and the bounding box is computed
 * from the result, exactly, instead of measured from a rendering.
 *
 * Proportions come from published figures where they exist (base of the
 * Eiffel Tower 125 m, London Eye wheel 120 m, Giza 230 m by 138.5 m,
 * Elizabeth Tower 12 m square, Saturn V 10.1 m wide, Boeing 747-400
 * 70.6 m long) and from typical values for everyday objects. Only the
 * measured axis is scored; the other axis is there to be recognisable and
 * is as close to the real shape as a plain silhouette allows.
 *
 *   node scripts/silhouettes/build.mjs
 */
import pc from "polygon-clipping";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

// ---------- primitives (y up, metres) ----------
const ring = (pts) => [[...pts, pts[0]]];
const rect = (x, y, w, h) =>
  ring([
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ]);
const poly = (...pts) => ring(pts);
function ellipse(cx, cy, rx, ry, n = 72, a0 = 0, a1 = Math.PI * 2) {
  const pts = [];
  const full = Math.abs(a1 - a0 - Math.PI * 2) < 1e-9;
  const steps = full
    ? n
    : Math.max(8, Math.round((n * (a1 - a0)) / (Math.PI * 2)));
  for (let i = 0; i < (full ? steps : steps + 1); i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  if (!full) pts.push([cx, cy]);
  return ring(pts);
}
const circle = (cx, cy, r, n = 72) => ellipse(cx, cy, r, r, n);
function rrect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  return U(
    rect(x + r, y, w - 2 * r, h),
    rect(x, y + r, w, h - 2 * r),
    circle(x + r, y + r, r, 24),
    circle(x + w - r, y + r, r, 24),
    circle(x + r, y + h - r, r, 24),
    circle(x + w - r, y + h - r, r, 24),
  );
}
/** A straight bar of thickness t from (x1,y1) to (x2,y2), round ends. */
function seg(x1, y1, x2, y2, t, round = true) {
  const dx = x2 - x1,
    dy = y2 - y1,
    L = Math.hypot(dx, dy);
  const nx = (-dy / L) * (t / 2),
    ny = (dx / L) * (t / 2);
  const body = poly(
    [x1 + nx, y1 + ny],
    [x2 + nx, y2 + ny],
    [x2 - nx, y2 - ny],
    [x1 - nx, y1 - ny],
  );
  return round
    ? U(body, circle(x1, y1, t / 2, 20), circle(x2, y2, t / 2, 20))
    : body;
}
const annulus = (cx, cy, r, t) =>
  D(circle(cx, cy, r + t / 2, 96), circle(cx, cy, r - t / 2, 96));
// Boolean operations one shape at a time. Shapes that only touch (capsules
// tangent to a rim, say) can trip the sweep line on exact degeneracies; a
// nudge of a millionth of the shape's size resolves it without changing
// anything visible.
function nudge(g, k) {
  let sx = 0,
    sy = 0,
    n = 0,
    span = 0;
  for (const p of g)
    for (const r of p)
      for (const [x, y] of r) {
        sx += x;
        sy += y;
        n++;
      }
  const cx = sx / n,
    cy = sy / n;
  for (const p of g)
    for (const r of p)
      for (const [x, y] of r)
        span = Math.max(span, Math.abs(x - cx), Math.abs(y - cy));
  const e = 1e-6 * k;
  return g.map((p) =>
    p.map((r) => r.map(([x, y]) => [x + span * e, y + span * e * 0.7])),
  );
}
function safe(op, a, b) {
  for (let k = 0; k < 6; k++) {
    try {
      return op(a, k ? nudge(b, k) : b);
    } catch (e) {
      if (k === 5) throw e;
    }
  }
}
const U = (...g) =>
  g.slice(1).reduce((acc, x) => safe(pc.union, acc, x), pc.union(g[0]));
const D = (a, ...b) =>
  b.reduce((acc, x) => safe(pc.difference, acc, x), pc.union(a));
const mirror = (g) =>
  g.map((p) => p.map((r) => r.map(([x, y]) => [-x, y]).reverse()));
const sym = (g) => U(g, mirror(g));
function rotate(g, deg, ox = 0, oy = 0) {
  const a = (deg * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  return g.map((p) =>
    p.map((r) =>
      r.map(([x, y]) => [
        ox + (x - ox) * c - (y - oy) * s,
        oy + (x - ox) * s + (y - oy) * c,
      ]),
    ),
  );
}

// ---------- the catalogue ----------
const S = {};

// Pencil, side view: 19 cm long, 7.5 mm thick.
S.pencil = {
  measure: "w",
  g: D(
    U(
      poly([0, 0.00375], [0.022, 0], [0.022, 0.0075]),
      rect(0.022, 0, 0.143, 0.0075),
      rect(0.165, -0.0002, 0.013, 0.0079),
      rrect(0.176, 0.0003, 0.014, 0.0069, 0.003),
    ),
    poly(
      [0, 0.00375],
      [0.006, 0.0022],
      [0.006, 0.0053],
    ) /* the lead, as a notch of light */,
  ),
};

// Dreadnought guitar, front view lying down: 102 cm, body 40 cm wide.
{
  const cy = 0.2;
  const body = U(
    ellipse(0.665, cy, 0.135, 0.145),
    ellipse(0.855, cy, 0.165, 0.2),
    rect(0.665, cy - 0.137, 0.19, 0.274),
  );
  const neck = rect(0.19, cy - 0.027, 0.36, 0.054);
  const head = poly(
    [0.005, cy - 0.045],
    [0.19, cy - 0.032],
    [0.19, cy + 0.032],
    [0.005, cy + 0.045],
  );
  const hole = circle(0.69, cy, 0.05, 64);
  const bridge = rrect(0.84, cy - 0.08, 0.025, 0.16, 0.008);
  S.guitar = { measure: "w", g: D(U(body, neck, head), hole, bridge) };
}

// Adult person, front: 1.70 m.
{
  const half = U(
    circle(0, 1.585, 0.115, 64),
    rect(0, 1.43, 0.05, 0.08),
    poly([0, 1.45], [0.2, 1.43], [0.215, 1.38], [0.17, 0.9], [0, 0.9]),
    seg(0.19, 1.39, 0.255, 0.82, 0.085),
    poly(
      [0, 0.93],
      [0.17, 0.93],
      [0.16, 0.06],
      [0.03, 0.06],
      [0.02, 0.86],
      [0, 0.86],
    ),
    rrect(0.02, 0, 0.16, 0.075, 0.03),
  );
  S.person = { measure: "h", g: sym(half) };
}

// Front door leaf: 2.03 m × 0.80 m, two recessed panels and a handle.
{
  const leaf = rect(0, 0, 0.8, 2.03);
  const band = (x, y, w, h, t) =>
    D(rect(x, y, w, h), rect(x + t, y + t, w - 2 * t, h - 2 * t));
  S.door = {
    measure: "h",
    g: D(
      leaf,
      band(0.12, 1.12, 0.56, 0.78, 0.025),
      band(0.12, 0.13, 0.56, 0.86, 0.025),
      rrect(0.66, 0.98, 0.1, 0.035, 0.015),
    ),
  };
}

// Ladder: 3.0 m, ten rungs.
{
  const parts = [rect(0, 0, 0.065, 3.0), rect(0.385, 0, 0.065, 3.0)];
  for (let i = 0; i < 10; i++)
    parts.push(rect(0.05, 0.25 + i * 0.28, 0.35, 0.04));
  S.ladder = { measure: "h", g: U(...parts) };
}

// Traffic light: 3.0 m overall, head with three lamps.
{
  const head = rrect(-0.17, 2.0, 0.34, 1.0, 0.07);
  const lamps = [2.17, 2.5, 2.83].map((y) => circle(0, y, 0.1, 48));
  const visors = [2.17, 2.5, 2.83].map((y) =>
    poly(
      [-0.15, y + 0.13],
      [0.15, y + 0.13],
      [0.2, y + 0.17],
      [-0.2, y + 0.17],
    ),
  );
  S.trafficlight = {
    measure: "h",
    g: U(
      D(U(head, ...visors), ...lamps),
      rect(-0.05, 0, 0.1, 2.0),
      rrect(-0.16, 0, 0.32, 0.06, 0.02),
    ),
  };
}

// Football pitch, top view: 105 × 68 m, markings cut out of the grass.
{
  const L = 105,
    W = 68,
    t = 0.9;
  const line = (x, y, w, h) =>
    D(rect(x, y, w, h), rect(x + t, y + t, w - 2 * t, h - 2 * t));
  const marks = U(
    line(2, 2, L - 4, W - 4),
    rect(L / 2 - t / 2, 2, t, W - 4),
    annulus(L / 2, W / 2, 9.15, t),
    circle(L / 2, W / 2, 0.9, 24),
    line(2 - t, W / 2 - 20.16, 16.5 + t, 40.32),
    line(L - 2 - 16.5, W / 2 - 20.16, 16.5 + t, 40.32),
    line(2 - t, W / 2 - 9.16, 5.5 + t, 18.32),
    line(L - 2 - 5.5, W / 2 - 9.16, 5.5 + t, 18.32),
    circle(13, W / 2, 0.6, 16),
    circle(L - 13, W / 2, 0.6, 16),
  );
  S.pitch = { measure: "w", g: D(rect(0, 0, L, W), marks) };
}

// City bike, side: 1.75 m long, 700c wheels.
{
  const rw = [0.35, 0.33],
    fw = [1.4, 0.33],
    bb = [0.8, 0.29],
    st = [0.72, 0.84],
    ht = [1.24, 0.86],
    hb = [1.24, 0.78];
  const wheel = (c) =>
    U(
      annulus(c[0], c[1], 0.31, 0.045),
      circle(c[0], c[1], 0.035, 24),
      ...[0, 1, 2, 3, 4, 5].map((k) =>
        seg(
          c[0],
          c[1],
          c[0] + 0.3 * Math.cos((k * Math.PI) / 3),
          c[1] + 0.3 * Math.sin((k * Math.PI) / 3),
          0.008,
          false,
        ),
      ),
    );
  const t = 0.034;
  S.bicycle = {
    measure: "w",
    g: U(
      wheel(rw),
      wheel(fw),
      seg(...bb, ...st, t),
      seg(...st, ...ht, t),
      seg(...bb, ...hb, t + 0.004),
      seg(...bb, ...rw, t),
      seg(...st, ...rw, t * 0.85),
      seg(...ht, ...fw, t),
      seg(1.24, 0.86, 1.22, 0.97, 0.03),
      seg(1.12, 0.99, 1.3, 0.99, 0.03),
      seg(0.72, 0.84, 0.7, 0.9, 0.028),
      rrect(0.6, 0.9, 0.22, 0.045, 0.02),
      annulus(0.8, 0.29, 0.085, 0.02),
      seg(0.8, 0.29, 0.86, 0.2, 0.02),
    ),
  };
}

// Family car (C segment), side: 4.35 m × 1.45 m.
{
  const r = 0.315,
    wx = [0.92, 3.42],
    cy = 0.315;
  const body = U(
    rrect(0, 0.26, 4.35, 0.68, 0.16),
    poly([1.0, 0.9], [1.6, 1.42], [3.0, 1.45], [3.62, 0.92]),
    poly([3.9, 0.94], [4.35, 0.8], [4.35, 0.6], [3.9, 0.6]),
  );
  const windows = U(
    poly([1.2, 0.95], [1.66, 1.35], [2.3, 1.37], [2.3, 0.95]),
    poly([2.4, 0.95], [2.4, 1.37], [2.95, 1.37], [3.38, 0.95]),
  );
  const arches = U(...wx.map((x) => circle(x, cy, 0.38, 48)));
  const wheels = U(
    ...wx.map((x) => D(circle(x, cy, r, 64), annulus(x, cy, 0.17, 0.035))),
  );
  S.car = { measure: "w", g: U(D(body, windows, arches), wheels) };
}

// City bus, side: 12 m × 3.0 m.
{
  const body = rrect(0, 0.32, 12, 2.68, 0.3);
  const holes = [];
  for (const [x0, x1] of [
    [0.8, 4.6],
    [6.0, 9.3],
  ]) {
    const n = Math.round((x1 - x0) / 1.25);
    const w = (x1 - x0) / n;
    for (let i = 0; i < n; i++)
      holes.push(rrect(x0 + i * w + 0.06, 1.55, w - 0.12, 1.1, 0.08));
  }
  holes.push(
    rrect(4.75, 0.45, 1.1, 2.25, 0.06),
    rrect(9.5, 0.45, 1.1, 2.25, 0.06),
    rrect(10.8, 1.25, 1.05, 1.45, 0.12),
  );
  const wheelsAt = [2.55, 9.35 - 0.1];
  const arches = U(...wheelsAt.map((x) => circle(x, 0.5, 0.62, 48)));
  const wheels = U(
    ...wheelsAt.map((x) =>
      D(circle(x, 0.5, 0.5, 64), annulus(x, 0.5, 0.26, 0.05)),
    ),
  );
  S.bus = { measure: "w", g: U(D(body, ...holes, arches), wheels) };
}

// Articulated lorry, side: 16.5 m × 4.0 m, cab at the front (right).
{
  const trailer = rect(0, 1.2, 13.4, 2.8);
  const chassis = rect(0.3, 0.85, 13.0, 0.35);
  const cab = U(rrect(13.9, 0.85, 2.6, 3.05, 0.25), rect(13.9, 0.85, 1.0, 1.0));
  const glass = poly([15.1, 2.2], [16.3, 2.2], [16.3, 3.55], [15.1, 3.55]);
  const tractorChassis = rect(12.4, 0.85, 2.0, 0.4);
  const axles = [1.3, 2.65, 4.0, 13.0, 15.6];
  const wheels = U(
    ...axles.map((x) =>
      D(circle(x, 0.5, 0.5, 64), annulus(x, 0.5, 0.25, 0.05)),
    ),
  );
  const arches = U(...axles.map((x) => circle(x, 0.5, 0.58, 48)));
  S.truck = {
    measure: "w",
    g: U(D(U(trailer, chassis, cab, tractorChassis), glass, arches), wheels),
  };
}

// Boeing 747-400, top view: wingspan 64.4 m, length 70.6 m.
{
  const fus = U(
    rect(-3.25, 6, 6.5, 57),
    ellipse(0, 63, 3.25, 7.6, 48, 0, Math.PI),
    poly([-3.25, 6], [3.25, 6], [0.6, 0], [-0.6, 0]),
  );
  const wing = poly([0, 42], [32.2, 17.5], [32.2, 15.2], [0, 26]);
  const stab = poly([0, 12], [11.08, 2.6], [11.08, 0.8], [0, 4]);
  const nacelles = [
    [11.5, 33.5],
    [21.2, 26.8],
  ].map(([x, y]) => rrect(x - 1.35, y - 3.4, 2.7, 6.8, 1.3));
  S.airliner = { measure: "w", g: U(fus, sym(U(wing, stab, ...nacelles))) };
}

// Saturn V, side: 110.6 m tall, 10.1 m across, fins to ~19 m.
{
  const r1 = 5.05,
    r3 = 3.3,
    rs = 1.95;
  const half = U(
    poly([0, 0], [1.2, 0], [1.6, 4.2], [0, 4.2]),
    poly([2.4, 0], [3.9, 0], [4.1, 4.2], [2.1, 4.2]),
    rect(0, 4.2, r1, 42),
    poly([r1 - 0.2, 4.2], [9.5, 4.2], [r1, 13]),
    rect(0, 46.2, r1, 24.9),
    poly([0, 71.1], [r1, 71.1], [r3, 73.0], [0, 73.0]),
    rect(0, 73.0, r3, 17.6),
    poly([0, 90.6], [r3, 90.6], [rs, 99.0], [0, 99.0]),
    rect(0, 99.0, rs, 3.6),
    poly([0, 102.6], [rs, 102.6], [0.35, 105.6], [0, 105.6]),
    rect(0, 105.6, 0.32, 3.6),
    poly([0, 109.0], [0.55, 109.0], [0, 110.6]),
  );
  S.rocket = {
    measure: "h",
    g: D(sym(half), rect(-6, 46.0, 12, 0.25), rect(-6, 90.4, 12, 0.22)),
  };
}

// Ultra-large container ship, side: 400 m long.
{
  const hull = poly(
    [6, 0],
    [372, 0],
    [392, 6],
    [400, 24],
    [397, 31],
    [12, 31],
    [0, 25],
    [2, 10],
  );
  const stacks = [];
  for (let x = 24; x < 360; x += 13.4) {
    if (x > 258 && x < 286) continue;
    const h = 22 - (x > 330 ? (x - 330) * 0.18 : 0);
    stacks.push(rect(x, 31, 12.4, h));
  }
  const bridge = U(rect(262, 31, 22, 46), rect(258, 70, 30, 3));
  const bridgeGlass = rect(263, 72, 20, 2.2);
  const funnel = rect(40, 53, 9, 13);
  S.ship = {
    measure: "w",
    g: D(
      U(hull, ...stacks, bridge, funnel),
      bridgeGlass,
      rect(0, 29.4, 400, 0.5),
    ),
  };
}

// House: 8 m to the ridge.
{
  const walls = rect(0.6, 0, 9.8, 5.1);
  const roof = poly(
    [-0.3, 4.9],
    [5.5, 8.0],
    [11.3, 4.9],
    [10.9, 4.6],
    [5.5, 7.5],
    [0.1, 4.6],
  );
  const roofFill = poly([0.3, 4.9], [5.5, 7.6], [10.7, 4.9]);
  const chimney = rect(7.6, 5.9, 0.75, 1.75);
  const holes = U(
    rrect(4.75, 0, 1.5, 2.3, 0.1),
    rect(1.6, 2.6, 1.6, 1.4),
    rect(7.8, 2.6, 1.6, 1.4),
    rect(1.6, 0.8, 1.6, 1.1),
  );
  S.house = { measure: "h", g: D(U(walls, roof, roofFill, chimney), holes) };
}

// Lighthouse: 30 m.
{
  const half = U(
    rect(0, 0, 4.6, 1.3),
    poly([0, 1.3], [3.6, 1.3], [2.3, 23.6], [0, 23.6]),
    rect(0, 23.6, 3.3, 0.8),
    rect(0, 24.4, 1.75, 3.3),
    ellipse(0, 27.7, 1.95, 1.4, 48, 0, Math.PI / 2),
    rect(0, 28.9, 0.18, 1.1),
  );
  const holes = U(
    rrect(-0.75, 1.3, 1.5, 2.6, 0.7),
    rect(-0.35, 9, 0.7, 1.2),
    rect(-0.35, 15.5, 0.7, 1.2),
    rect(-1.4, 25.0, 2.8, 1.9),
    rect(-3.2, 24.15, 6.4, 0.12),
  );
  S.lighthouse = { measure: "h", g: D(sym(half), holes) };
}

// Leaning Tower of Pisa: 15.5 m wide, leaning 3.97°. The measured height is
// the LOW side (55.86 m): the box top is set there, the high side rises past it.
{
  const w = 15.5,
    R = w / 2;
  const parts = [rect(-R, 0, w, 11.0)];
  const holes = [];
  for (let i = 0; i < 6; i++) {
    const y = 11.0 + i * 6.3;
    parts.push(rect(-R - 0.4, y, w + 0.8, 0.55), rect(-R, y + 0.55, w, 5.75));
    for (let k = 0; k < 5; k++)
      holes.push(rrect(-R + 0.9 + k * 2.95, y + 1.3, 1.6, 4.2, 0.8));
  }
  parts.push(
    rect(-R - 0.4, 48.8, w + 0.8, 0.6),
    rect(-5.1, 49.4, 10.2, 6.2),
    ellipse(0, 55.6, 5.1, 1.1, 48, 0, Math.PI),
  );
  for (let k = 0; k < 3; k++)
    holes.push(rrect(-4.2 + k * 3.1, 50.6, 1.9, 3.8, 0.95));
  for (let k = 0; k < 5; k++)
    holes.push(rrect(-R + 0.9 + k * 2.95, 2.6, 1.6, 6.2, 0.8));
  const tower = rotate(D(U(...parts), ...holes), -3.97, -R, 0);
  S.pisa = { measure: "h", g: tower, topAt: 55.86 };
}

// Elizabeth Tower (Big Ben): 96 m, 12 m square.
{
  const half = U(
    rect(0, 0, 6, 55),
    rect(0, 55, 6.7, 10),
    rect(0, 65, 5.7, 8.5),
    poly([0, 73.5], [6.0, 73.5], [3.6, 85], [0, 85]),
    poly([0, 85], [1.6, 85], [0, 96]),
    poly([4.9, 73.5], [6.2, 73.5], [5.55, 79]),
  );
  const holes = U(
    annulus(0, 60, 3.3, 0.45),
    circle(0, 60, 0.6, 24),
    ...[-3.2, 0, 3.2].map((x) => rrect(x - 0.9, 66.5, 1.8, 5.2, 0.9)),
    ...[10, 22, 34, 46].flatMap((y) =>
      [-3.4, -1.1, 1.1, 3.4].map((x) => rect(x - 0.45, y, 0.9, 6)),
    ),
  );
  S.bigben = { measure: "h", g: D(sym(half), holes) };
}

// London Eye: 135 m; wheel 120 m across, on an A-frame from one bank.
{
  const c = [0, 75],
    R = 60;
  const capsules = [];
  for (let k = 0; k < 32; k++) {
    const a = (k / 32) * Math.PI * 2;
    capsules.push(
      ellipse(
        c[0] + Math.cos(a) * (R + 2.2),
        c[1] + Math.sin(a) * (R + 2.2),
        2.2,
        1.6,
        24,
      ),
    );
  }
  const spokes = [];
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    spokes.push(
      seg(
        c[0],
        c[1],
        c[0] + Math.cos(a) * R,
        c[1] + Math.sin(a) * R,
        0.55,
        false,
      ),
    );
  }
  S.londoneye = {
    measure: "h",
    g: U(
      annulus(...c, R, 2.2),
      annulus(...c, R - 3.4, 0.8),
      circle(...c, 3.2, 32),
      ...spokes,
      ...capsules,
      seg(0, 75, -24, 0.9, 3.0),
      seg(0, 75, -4, 0.9, 3.0),
      rect(-29, 0, 30, 1.8),
    ),
  };
}

// Great Pyramid of Giza: 230.3 m base, 138.5 m high, flat summit.
S.pyramid = {
  measure: "h",
  g: poly([0, 0], [230.3, 0], [118.15, 138.5], [112.15, 138.5]),
};

// Eiffel Tower: 330 m with antennas, 125 m square base.
{
  // Corner piers about 25 m wide at the ground, the top platform ~17 m.
  const leg = poly([62.5, 0], [37.5, 0], [19.5, 57], [34.5, 57]);
  const shaft = poly([0, 57], [34.5, 57], [21, 115], [0, 115]);
  const upper = poly([0, 115], [20, 115], [8.4, 276], [0, 276]);
  const half = U(
    leg,
    shaft,
    upper,
    rect(0, 57, 37.5, 6.5),
    rect(0, 115, 22, 4.5),
    rect(0, 276, 9.5, 4),
    poly([0, 280], [5.5, 280], [2.8, 292], [0, 292]),
    rect(0, 292, 0.9, 38),
  );
  const arch = ellipse(0, 0, 36.5, 39.5, 96);
  const gaps = U(
    poly([-11, 63.5], [11, 63.5], [0, 108]),
    poly([-4, 119.5], [4, 119.5], [0, 205]),
  );
  S.eiffel = { measure: "h", g: D(sym(half), arch, gaps) };
}

// Burj Khalifa: 828 m. Setbacks spiral, so the steps differ left and right.
{
  const steps = (levels) =>
    U(...levels.map(([y0, y1, x]) => rect(0, y0, x, y1 - y0)));
  const right = steps([
    [0, 40, 46],
    [40, 160, 32],
    [160, 245, 27],
    [245, 330, 22],
    [330, 410, 18],
    [410, 480, 14.5],
    [480, 545, 11],
    [545, 600, 8],
    [600, 645, 5.5],
    [645, 690, 3.6],
  ]);
  const left = steps([
    [0, 40, 46],
    [40, 200, 30],
    [200, 285, 25],
    [285, 370, 20],
    [370, 445, 16],
    [445, 515, 12.5],
    [515, 575, 9.5],
    [575, 625, 6.8],
    [625, 670, 4.6],
  ]);
  const spire = poly([2.6, 690], [0.35, 828], [-0.35, 828], [-2.6, 690]);
  S.burj = { measure: "h", g: U(right, mirror(left), spire) };
}

// ---------- write ----------
function toPath(g0, topAt) {
  const g = pc.union(g0); // always a clean multipolygon
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const p of g)
    for (const r of p)
      for (const [x, y] of r) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
  const top = maxY;
  const size = Math.max(maxX - minX, maxY - minY);
  const dp = Math.max(0, Math.ceil(-Math.log10(size / 4000)));
  const f = (n) => {
    const s = n.toFixed(dp);
    return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
  };
  let d = "";
  for (const p of g)
    for (const r of p) {
      const pts = r.slice(0, -1).map(([x, y]) => [x - minX, top - y]);
      d += "M" + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join("L") + "Z";
    }
  // The box spans the measured extent. For the leaning tower the measured
  // top is the low side: the box starts there, the high side pokes above.
  const boxTop = topAt !== undefined ? top - (topAt - minY) : 0;
  return {
    d,
    box: {
      x: 0,
      y: Number(f(boxTop)),
      w: Number(f(maxX - minX)),
      h: Number(f(topAt !== undefined ? topAt - minY : maxY - minY)),
    },
  };
}

let out = `// GENERATED by scripts/silhouettes/build.mjs — do not edit by hand.
// Silhouettes drawn in metres with exact boolean geometry; see that script
// for the sources of each proportion. \`box\` is computed, not measured.
import type { Silhouette } from "./silhouettes";

export const SILHOUETTE_DATA: Record<string, Silhouette> = {
`;
for (const [k, s] of Object.entries(S)) {
  const { d, box } = toPath(s.g, s.topAt);
  out += `  ${k}: {\n    box: ${JSON.stringify(box)
    .replace(/"(\w)":/g, "$1: ")
    .replace(
      /,/g,
      ", ",
    )},\n    measure: ${JSON.stringify(s.measure)},\n    d: ${JSON.stringify(d)},\n  },\n`;
}
out += "};\n";
writeFileSync(join(root, "src/games/size-it-up/silhouetteData.ts"), out);
console.log(
  `Wrote ${Object.keys(S).length} silhouettes, ${(out.length / 1024).toFixed(0)} kB.`,
);
