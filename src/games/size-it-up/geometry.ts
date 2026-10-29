import { getSilhouette, silhouetteBox } from "./silhouettes";
import type { SizeObject } from "./types";

/**
 * The scale maths of Size It Up, kept pure and apart from any React.
 *
 * THREE THINGS THAT ARE NEVER THE SAME NUMBER, however often they look alike:
 *
 *   1. `ratio`      — the player's ESTIMATE: how many times the target is the
 *                     reference. This is the answer, and only the player's own
 *                     controls change it.
 *   2. `pxPerMetre` — how the scene is drawn. Zooming changes it. It must never
 *                     change the estimate, and the estimate must never change
 *                     because the stage was resized.
 *   3. `zoom`       — a purely visual multiplier the player applies to fit huge
 *                     or tiny objects on screen.
 *
 * Mixing 1 and 2 is the classic bug in a game like this: the answer silently
 * follows the window. Every function below takes what it needs explicitly so
 * that cannot happen.
 */

/** Hard limits on the estimate, as a multiple of the reference. */
export const MIN_RATIO = 1 / 400;
export const MAX_RATIO = 400;

export function clampRatio(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return 1;
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio));
}

/** The true answer: how many times the target really is the reference. */
export function trueRatio(reference: SizeObject, target: SizeObject): number {
  return target.sizeM / reference.sizeM;
}

/** The size in metres a given estimate claims the target to be. */
export function ratioToMetres(ratio: number, reference: SizeObject): number {
  return ratio * reference.sizeM;
}

/** The estimate implied by claiming the target is `metres` long. */
export function metresToRatio(metres: number, reference: SizeObject): number {
  return metres / reference.sizeM;
}

/**
 * The slider is logarithmic: objects differ by orders of magnitude, so a
 * linear control would spend 99 % of its travel on sizes nobody means.
 * `t` runs 0..1 across [MIN_RATIO, MAX_RATIO]. The mapping is continuous and
 * exactly reversible — `sliderToRatio(ratioToSlider(r)) === r`.
 */
const LOG_MIN = Math.log(MIN_RATIO);
const LOG_SPAN = Math.log(MAX_RATIO) - LOG_MIN;

export function ratioToSlider(ratio: number): number {
  return (Math.log(clampRatio(ratio)) - LOG_MIN) / LOG_SPAN;
}

export function sliderToRatio(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return clampRatio(Math.exp(LOG_MIN + clamped * LOG_SPAN));
}

/**
 * Step the estimate by a fixed number of slider notches, so one press of "+"
 * feels the same whether the target is a pencil or a skyscraper.
 */
export function stepRatio(
  ratio: number,
  notches: number,
  fine = false,
): number {
  const step = (fine ? 0.004 : 0.02) * notches;
  return sliderToRatio(ratioToSlider(ratio) + step);
}

export interface StageBox {
  /** Drawing area in CSS pixels. */
  width: number;
  height: number;
}

export interface DrawnObject {
  /** Size in pixels along the object's own measured axis. */
  measurePx: number;
  /** Bounding box of the drawn silhouette. */
  width: number;
  height: number;
}

/**
 * How many pixels one metre takes at zoom 1.
 *
 * Chosen so the REFERENCE always occupies a comfortable share of the stage
 * height, whatever its real size. It depends only on the reference, so growing
 * the target never shrinks the reference under the player's hand — the player
 * zooms out deliberately instead, exactly as in the original.
 */
export function basePxPerMetre(
  reference: SizeObject,
  stage: StageBox,
  share = 0.42,
): number {
  const s = getSilhouette(reference.silhouette);
  const targetPx = stage.height * share;
  if (!s) return targetPx / reference.sizeM;
  // If the reference is a wide object measured along its width, cap it so a
  // 400 m ship does not run off the sides at zoom 1.
  const box = silhouetteBox(s, targetPx);
  const widthCap = stage.width * 0.4;
  const scale = box.width > widthCap ? widthCap / box.width : 1;
  return (targetPx * scale) / reference.sizeM;
}

/** Lay out one object at a given pixel-per-metre, preserving its aspect. */
export function drawObject(
  object: SizeObject,
  sizeM: number,
  pxPerMetre: number,
): DrawnObject {
  const measurePx = Math.max(0.01, sizeM * pxPerMetre);
  const s = getSilhouette(object.silhouette);
  if (!s) return { measurePx, width: measurePx, height: measurePx };
  const box = silhouetteBox(s, measurePx);
  return { measurePx, ...box };
}

/**
 * The zoom that fits both objects inside the stage at once — the "fit both"
 * control. Returns a multiplier on `basePxPerMetre`, never the estimate.
 */
export function zoomToFit(
  reference: SizeObject,
  target: SizeObject,
  targetSizeM: number,
  stage: StageBox,
  pxPerMetre: number,
  padding = 0.86,
): number {
  const a = drawObject(reference, reference.sizeM, pxPerMetre);
  const b = drawObject(target, targetSizeM, pxPerMetre);
  const needHeight = Math.max(a.height, b.height);
  const needWidth = a.width + b.width;
  if (needHeight <= 0 || needWidth <= 0) return 1;
  const fitH = (stage.height * padding) / needHeight;
  const fitW = (stage.width * padding) / needWidth;
  return Math.min(fitH, fitW);
}

/** Zoom bounds, so the scene can never be zoomed into nothing. */
export const MIN_ZOOM = 0.0015;
export const MAX_ZOOM = 40;

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom) || zoom <= 0) return 1;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** Format a size in metres the way a person would say it. */
export function formatMetres(m: number): string {
  if (!Number.isFinite(m) || m <= 0) return "—";
  if (m < 0.01)
    return `${(m * 1000).toLocaleString("it-IT", { maximumFractionDigits: 0 })} mm`;
  if (m < 1)
    return `${(m * 100).toLocaleString("it-IT", { maximumFractionDigits: 1 })} cm`;
  if (m < 10)
    return `${m.toLocaleString("it-IT", { maximumFractionDigits: 2 })} m`;
  if (m < 1000)
    return `${m.toLocaleString("it-IT", { maximumFractionDigits: 1 })} m`;
  return `${(m / 1000).toLocaleString("it-IT", { maximumFractionDigits: 2 })} km`;
}

/**
 * "3,2× più grande" / "5× più piccolo" — and plain words when the two are
 * near enough that a factor would read as a silly "1× più piccolo".
 */
export function formatFactor(factor: number): string {
  if (!Number.isFinite(factor) || factor <= 0) return "—";
  if (factor > 0.97 && factor < 1.03) return "praticamente uguale";
  const f = factor >= 1 ? factor : 1 / factor;
  const word = factor >= 1 ? "più grande" : "più piccolo";
  const digits = f < 3 ? 2 : f < 10 ? 1 : 0;
  return `${f.toLocaleString("it-IT", { maximumFractionDigits: digits })}× ${word}`;
}
