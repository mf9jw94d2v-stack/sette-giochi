/**
 * Hand-authored silhouettes for the comparison stage.
 *
 * NORMALISATION CONTRACT — the whole game rests on it:
 *   • `box` is the MEASURED bounding box of the drawing, not a viewBox the
 *     author promised to fill. It is produced by
 *     `scripts/validation/silhouette-bbox.mjs`, which renders each path and
 *     reads back its real extent. Drawing slop therefore cannot shrink an
 *     object: a guitar whose path stops 8 % short of its declared box used to
 *     be drawn 8 % too small, and that is exactly the kind of error the player
 *     would be scored on.
 *   • `measure` says WHICH side of that box carries the object's canonical
 *     measurement. A person is drawn so its full height spans `box.h`; a car
 *     so its full length spans `box.w`; a 747 so its wingspan spans `box.w`.
 *   • The other dimension follows from the aspect ratio and is never scaled
 *     independently, so a silhouette can never be squashed.
 *   • Shapes stand on the baseline: the bottom of the box is the ground.
 *
 * These are original drawings — simplified, recognisable outlines, not traced
 * from any other game's assets.
 *
 * NO ANIMALS, for now. Animal outlines were attempted and thrown away: the
 * results read as blobs rather than as a dog or a dolphin, and a silhouette
 * nobody recognises makes the comparison harder to judge, not easier. The
 * catalogue covers everyday objects, vehicles and architecture, where a
 * drawing of this kind is honest about what it shows. Adding animals means
 * adding proper artwork, not more attempts at this.
 */

export interface SilhouetteBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Silhouette {
  /** Measured extent of the drawing, in the path's own units. */
  box: SilhouetteBox;
  /** Which side of `box` the object's canonical measurement spans. */
  measure: "w" | "h";
  /** One or more path commands, drawn with fill-rule evenodd. */
  d: string;
}

/** Everything the catalogue may reference. */
export const SILHOUETTES: Record<string, Silhouette> = {
  // ---------- Everyday objects ----------
  pencil: {
    box: { x: 0, y: 0.6, w: 100.04, h: 9.8 },
    measure: "w",
    // Sharpened tip on the left, ferrule and rubber on the right.
    d: "M0 5.5 L14 0.6 L14 10.4 Z M14 0.6 H78 V10.4 H14 Z M78 0.6 H88 V10.4 H78 Z M88 1.6 H97 a3.4 3.4 0 0 1 3 3.9 a3.4 3.4 0 0 1-3 3.9 H88 Z",
  },
  guitar: {
    box: { x: 0, y: 0, w: 92, h: 37 },
    measure: "w",
    // Headstock, neck, then the two bouts of the body with a sound hole.
    d: "M0 13.2 h7 v10.6 H0 Z M7 15.4 H34 v6.2 H7 Z M34 11 c-9 0-14 5.2-14 11.6 c0 7 5.6 11.8 13 11.8 c5 0 8-2.2 10.4-4.6 c2.2-2.2 4.6-3 7.6-3 c3 0 5.4 0.8 7.6 3 C61 32.2 64.4 37 72 37 c13 0 20-7 20-18.4 C92 7 84.6 0 72 0 c-7.6 0-11 4.8-13.4 7.2 c-2.2 2.2-4.6 3-7.6 3 c-3 0-5.4-0.8-7.6-3 C41 4.8 39 0 34 0 Z M64 12.6 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 Z",
  },
  door: {
    box: { x: 0, y: 0, w: 42, h: 100 },
    measure: "h",
    // Frame, leaf, two panels and a handle.
    d: "M0 0 H42 V100 H0 Z M4 4 H38 V100 H4 Z M9 10 H33 V44 H9 Z M9 52 H33 V90 H9 Z M11 60 h4 v5 h-4 Z",
  },
  ladder: {
    box: { x: 0, y: 0, w: 26, h: 100 },
    measure: "h",
    d: "M0 0 h5 v100 H0 Z M21 0 h5 v100 h-5 Z M5 12 h16 v5 H5 Z M5 32 h16 v5 H5 Z M5 52 h16 v5 H5 Z M5 72 h16 v5 H5 Z M5 90 h16 v5 H5 Z",
  },

  person: {
    box: { x: 0, y: 0, w: 40, h: 100 },
    measure: "h",
    // Head, shoulders, arms along the sides, two legs to the ground.
    d: "M20 0 c5 0 9 4 9 9 c0 5-4 9-9 9 s-9-4-9-9 c0-5 4-9 9-9 Z M13 20 h14 c5 0 8 3 9 7 l4 26 l-6 1 l-4-21 v16 l2 51 h-9 l-3-36 l-3 36 H8 l2-51 V33 l-4 21 l-6-1 l4-26 c1-4 4-7 9-7 Z",
  },
  bicycle: {
    box: { x: 1, y: 7, w: 98, h: 51 },
    measure: "w",
    // Two spoked-looking wheels (rings), diamond frame, bars and saddle.
    d: "M1 39 a19 19 0 1 0 38 0 a19 19 0 1 0-38 0 Z M5 39 a15 15 0 1 1 30 0 a15 15 0 1 1-30 0 Z M61 39 a19 19 0 1 0 38 0 a19 19 0 1 0-38 0 Z M65 39 a15 15 0 1 1 30 0 a15 15 0 1 1-30 0 Z M20 37 h3 l17-19 h22 l16 19 h-4 l-15-17 l-16 18 Z M40 18 l-1 3 l17 19 h4 Z M38 20 l-19 18 v3 l21-19 Z M33 12 h16 v5 H33 Z M62 16 l6-9 h12 v4 h-10 l-4 6 Z",
  },
  trafficlight: {
    box: { x: 0, y: 1, w: 24, h: 99 },
    measure: "h",
    // Pole, housing with three lamps and a small visor on top.
    d: "M9 100 h6 V46 H9 Z M3 46 h18 V8 c0-4-3-7-7-7 h-4 c-4 0-7 3-7 7 Z M0 6 h24 v3 H0 Z M8 12 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 Z M8 24 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 Z M8 36 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 Z M2 100 h20 v-4 H2 Z",
  },
  truck: {
    box: { x: 0, y: 2, w: 100, h: 28 },
    measure: "w",
    // Tractor unit with a sleeper cab plus a box trailer on two bogies.
    d: "M0 8 c0-2 1-3 3-3 h18 l5 8 v8 h-6 v3 H0 Z M34 2 h66 v23 H34 Z M7 9 h11 l3 5 H7 Z M4 22 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 Z M53 25 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 Z M67 25 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 Z M81 25 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 Z M26 14 h8 v8 h-8 Z",
  },
  pitch: {
    box: { x: 0, y: 0, w: 100, h: 64 },
    measure: "w",
    // A football pitch from above: touchlines, halfway line, centre circle,
    // penalty areas and goals, drawn as the painted markings themselves.
    d: "M0 0 h100 v2 H0 Z M0 62 h100 v2 H0 Z M0 0 h2 v64 H0 Z M98 0 h2 v64 h-2 Z M49 0 h2 v64 h-2 Z M41 23 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0 Z M43 25 a7 7 0 1 1 14 0 a7 7 0 1 1 -14 0 Z M2 16 h15 v2 H2 Z M2 46 h15 v2 H2 Z M15 16 h2 v32 h-2 Z M83 16 h15 v2 H83 Z M83 46 h15 v2 H83 Z M83 16 h2 v32 h-2 Z",
  },
  lighthouse: {
    box: { x: 0, y: 0, w: 40, h: 100 },
    measure: "h",
    // Tapered tower on a rock base, gallery and glazed lantern room.
    d: "M13 4 h14 v5 H13 Z M11 9 h18 v3 H11 Z M13 12 h14 v12 H13 Z M9 24 h22 v4 H9 Z M14 28 l-5 56 h22 l-5-56 Z M4 84 h32 v6 H4 Z M0 90 h40 v10 H0 Z M16 3 h8 v-3 h-8 Z",
  },
  rocket: {
    box: { x: 0, y: 0, w: 30, h: 100 },
    measure: "h",
    // A Saturn V-style launcher: escape tower, tapered stages, four fins.
    d: "M14 0 h2 v10 h-2 Z M12 10 h6 v6 h-6 Z M15 16 l-6 12 h12 Z M9 28 h12 v18 H9 Z M8 46 h14 v4 H8 Z M7 50 h16 v26 H7 Z M6 76 h18 v4 H6 Z M5 80 h20 v16 H5 Z M5 96 L0 100 h6 l1-4 Z M25 96 l5 4 h-6 l-1-4 Z M12 96 h6 v4 h-6 Z",
  },
  londoneye: {
    box: { x: 4, y: 4, w: 86, h: 96 },
    measure: "h",
    // Observation wheel: rim, hub, spokes and the slanted A-frame support.
    d: "M4 47 a43 43 0 1 0 86 0 a43 43 0 1 0 -86 0 Z M9 47 a38 38 0 1 1 76 0 a38 38 0 1 1 -76 0 Z M46 9 h2 v76 h-2 Z M9 46 h76 v2 H9 Z M20 19 l1.4-1.4 l54 54 l-1.4 1.4 Z M74.6 17.6 l1.4 1.4 l-54 54 l-1.4-1.4 Z M43 43 h8 v8 h-8 Z M45 51 l-18 49 h6 l16-45 Z M49 51 l18 49 h-6 l-16-45 Z M22 96 h50 v4 H22 Z",
  },
  // ---------- Vehicles ----------
  car: {
    box: { x: 2, y: 0, w: 96, h: 27 },
    measure: "w",
    // Hatchback profile: bonnet, raked glasshouse, two wheels on the ground.
    d: "M2 22 l2-8 c1-4 4-6 8-7 l12-5 c3-1 6-2 10-2 h22 c5 0 9 1 13 4 l10 7 l12 3 c5 1 7 4 7 8 v5 H2 Z M28 6 h14 v8 H25 Z M48 6 h12 c3 0 5 1 7 2 l8 6 H48 Z M17 20 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 Z M69 20 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 Z",
  },
  bus: {
    box: { x: 0, y: 0, w: 100, h: 32 },
    measure: "w",
    // City bus: flat front, window band, doors, two axles.
    d: "M0 4 c0-2 2-4 4-4 h92 c2 0 4 2 4 4 v25 H0 Z M5 7 h18 v10 H5 Z M27 7 h14 v10 H27 Z M45 7 h14 v10 H45 Z M63 7 h14 v10 H63 Z M81 7 h14 v10 H81 Z M24 19 h5 v10 h-5 Z M62 19 h5 v10 h-5 Z M14 26 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 Z M74 26 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 Z",
  },
  airliner: {
    box: { x: 0, y: 0, w: 98, h: 52 },
    measure: "w",
    // Seen from above: fuselage, swept wings (span = full width), tailplane.
    d: "M48 0 c3 0 5 3 6 7 l2 16 l42 14 v6 l-42-8 v5 l-4 4 l20 4 v4 l-24-2 l-2 -2 l-2 2 l-24 2 v-4 l20-4 l-4-4 v-5 L0 43 v-6 l42-14 l2-16 c1-4 3-7 6-7 Z",
  },
  ship: {
    box: { x: 0, y: 2, w: 100, h: 24 },
    measure: "w",
    // Container ship: bulbous bow, stacked containers, bridge aft.
    d: "M0 18 h100 l-6 8 H10 Z M8 10 h58 v8 H8 Z M12 4 h10 v6 H12 Z M26 4 h10 v6 H26 Z M40 4 h10 v6 H40 Z M54 4 h10 v6 H54 Z M72 2 h20 v16 H72 Z M76 5 h12 v4 H76 Z",
  },

  // ---------- Architecture ----------
  house: {
    box: { x: 0, y: 0, w: 86, h: 100 },
    measure: "h",
    // Two storeys, pitched roof, chimney, door and windows.
    d: "M43 0 L86 34 h-9 v66 H9 V34 H0 Z M62 8 h9 v14 l-9-7 Z M20 44 h16 v16 H20 Z M50 44 h16 v16 H50 Z M34 72 h18 v28 H34 Z",
  },
  pisa: {
    box: { x: 11, y: 0, w: 21, h: 100 },
    measure: "h",
    // Round arcaded storeys with the galleries left open between them, and
    // the famous lean: each storey sits a little to the right of the one below.
    d: "M11 100 h21 l-1-11 H11 Z M11.4 87.5 h20 l-0.7-11 H11.8 Z M12.2 75 h19 l-0.7-11 H12.6 Z M13 62.5 h18 l-0.7-11 H13.4 Z M13.8 50 h17 l-0.7-11 H14.2 Z M14.6 37.5 h16 l-0.7-11 H15 Z M15.4 25 h15 l-0.7-11 H15.8 Z M16.2 12.5 h14 l-0.6-5 c-0.3-5-2-7.5-6.4-7.5 s-6.1 2.5-6.4 7.5 Z",
  },
  bigben: {
    box: { x: 1, y: 0, w: 28, h: 100 },
    measure: "h",
    // Elizabeth Tower: stone shaft, clock stage, pinnacles and spire.
    d: "M15 0 l2 7 h-4 Z M12 7 h6 v5 h-6 Z M9 12 l6-4 l6 4 v6 H9 Z M7 18 h16 v6 H7 Z M5 24 h20 v4 H5 Z M4 28 h22 v4 H4 Z M3 32 h24 v16 H3 Z M9 34 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 Z M11 36 a4 4 0 1 1 8 0 a4 4 0 1 1 -8 0 Z M2 48 h26 v4 H2 Z M4 52 h22 v44 H4 Z M2 96 h26 v4 H2 Z M1 32 h2 v16 H1 Z M27 32 h2 v16 h-2 Z",
  },
  pyramid: {
    box: { x: 0, y: 0, w: 100, h: 62 },
    measure: "h",
    // Great Pyramid: triangular mass with a lit face and a shadowed face.
    d: "M50 0 L100 62 H0 Z",
  },
  eiffel: {
    box: { x: 0, y: 0, w: 62, h: 100 },
    measure: "h",
    // Four splayed legs, two platforms, tapering tower, antenna.
    d: "M31 0 l2 6 h-4 Z M28 6 h6 v20 h-6 Z M26 26 h10 v4 H26 Z M27 30 l-2 22 h12 l-2-22 Z M22 52 h18 v4 H22 Z M24 56 l-5 24 h24 l-5-24 Z M14 80 h34 v5 H14 Z M18 85 C12 92 6 96 0 100 h12 c4-5 8-9 12-13 Z M44 85 c6 7 12 11 18 15 H50 c-4-5-8-9-12-13 Z M24 85 h14 v15 H24 Z",
  },
  burj: {
    box: { x: 0, y: 0, w: 36, h: 100 },
    measure: "h",
    // Stepped setbacks tapering to a long spire.
    d: "M18 0 l1 26 h-2 Z M15 26 h6 v14 h-6 Z M12 40 h12 v12 H12 Z M9 52 h18 v12 H9 Z M5 64 h26 v14 H5 Z M2 78 h32 v12 H2 Z M0 90 h36 v10 H0 Z",
  },
};

/**
 * Size of a silhouette when its MEASURED axis is `px` pixels long. The other
 * axis follows from the drawing's own aspect ratio, so the shape is never
 * distorted and never silently mis-sized.
 */
export function silhouetteBox(
  s: Silhouette,
  px: number,
): { width: number; height: number } {
  const { w, h } = s.box;
  if (s.measure === "h") return { width: (w / h) * px, height: px };
  return { width: px, height: (h / w) * px };
}

/** Scale factor from the path's own units to pixels, for a given drawn size. */
export function silhouetteScale(s: Silhouette, px: number): number {
  return s.measure === "h" ? px / s.box.h : px / s.box.w;
}

export function getSilhouette(id: string): Silhouette | undefined {
  return SILHOUETTES[id];
}
