import { SILHOUETTE_DATA } from "./silhouetteData";

/**
 * Silhouettes for the comparison stage.
 *
 * NORMALISATION CONTRACT — the whole game rests on it:
 *   • `box` is the bounding box of the drawing, COMPUTED from the exact
 *     geometry by scripts/silhouettes/build.mjs — not a viewBox the author
 *     promised to fill. Drawing slop therefore cannot shrink an object. (One
 *     deliberate exception: the Leaning Tower's box stops at its low side,
 *     the measured 55.86 m; the high side rises a little past it.)
 *   • `measure` says WHICH side of that box carries the object's canonical
 *     measurement. A person is drawn so its full height spans `box.h`; a car
 *     so its full length spans `box.w`; a 747 so its wingspan spans `box.w`.
 *   • The other dimension follows from the aspect ratio and is never scaled
 *     independently, so a silhouette can never be squashed.
 *   • Shapes stand on the baseline: the bottom of the box is the ground.
 *
 * These are original drawings, made for this game from published dimensions
 * — simplified, recognisable outlines, not traced from any other game.
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

/**
 * Everything the catalogue may reference. Drawn in metres by
 * scripts/silhouettes/build.mjs (exact boolean geometry, real proportions)
 * into silhouetteData.ts.
 */
export const SILHOUETTES: Record<string, Silhouette> = SILHOUETTE_DATA;

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
