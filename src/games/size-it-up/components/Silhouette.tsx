import { getSilhouette, silhouetteBox, silhouetteScale } from "../silhouettes";
import type { SizeObject } from "../types";

/**
 * One silhouette drawn at an exact size along its own measured axis, standing
 * on the baseline.
 *
 * `measurePx` is the ONLY size input: the other dimension follows from the
 * drawing's aspect ratio, so a silhouette can never be stretched or squashed
 * to fit. `x` is the horizontal centre; `baseline` is the ground.
 */
export function Silhouette({
  object,
  measurePx,
  x,
  baseline,
  fill,
  opacity = 1,
  outline,
  dashed,
}: {
  object: SizeObject;
  measurePx: number;
  x: number;
  baseline: number;
  fill: string;
  opacity?: number;
  outline?: string;
  dashed?: boolean;
}) {
  const s = getSilhouette(object.silhouette);
  if (!s) return null;
  const px = Math.max(0.2, measurePx);
  const { width, height } = silhouetteBox(s, px);
  const k = silhouetteScale(s, px);
  // Shift by the measured box so the drawing lands exactly where it is placed,
  // whatever coordinates its path happens to use.
  const left = x - width / 2 - s.box.x * k;
  const top = baseline - height - s.box.y * k;

  return (
    <g transform={`translate(${left} ${top}) scale(${k})`} opacity={opacity}>
      <path
        d={s.d}
        fill={fill}
        fillRule="evenodd"
        stroke={outline}
        strokeWidth={outline ? 2 / k : undefined}
        strokeDasharray={dashed ? `${6 / k} ${5 / k}` : undefined}
        vectorEffect={outline ? "non-scaling-stroke" : undefined}
      />
    </g>
  );
}
