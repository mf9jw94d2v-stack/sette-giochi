import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { projection } from "../engine";
import { cutLine, halfPlane, posThrough, thetaToward } from "../cut";
import type { GeoLevelData } from "../types";

/** Distance of the rotation handles from the pivot, in field units. */
const HANDLE_R = 36;

/**
 * The analysis field: the region's cities on an instrument grid, and the
 * cutting line the player manipulates directly.
 *
 * - Drag the line, or tap anywhere → the line moves to pass through there.
 * - Drag either round handle → the line rotates about its centre.
 * - Keyboard (field focused): ←/→ rotate, ↑/↓ slide, Shift for larger steps.
 *
 * Cities are coloured by side as the line moves — the same information the
 * eye already has. The population split is NOT shown until the cut is made:
 * on the original it appears at confirmation, and showing it live would turn
 * the round into reading a dial.
 */
export function SliceField({
  region,
  theta,
  pos,
  onChange,
  locked,
  showSplit,
  dim,
  compact,
  label,
}: {
  region: GeoLevelData;
  theta: number;
  pos: number;
  onChange?: (theta: number, pos: number) => void;
  locked: boolean;
  /** Tint the two halves — only once the cut is final. */
  showSplit: boolean;
  /** Preview state: cities only, no line. */
  dim?: boolean;
  /** Small multiples in the results: fewer labels, thinner strokes. */
  compact?: boolean;
  label: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [box, setBox] = useState({ w: 800, h: 600 });
  const [drag, setDrag] = useState<"move" | "rotate" | null>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const r = e.contentRect;
      if (r.width > 0 && r.height > 0) setBox({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The 0–100 field sits in the middle; the grid runs on to the edges so the
  // instrument fills whatever space it is given, without stretching the map.
  const pad = compact ? 6 : 9;
  const a = box.w / box.h;
  const vb =
    a >= 1
      ? {
          x: 50 - ((100 + pad * 2) * a) / 2,
          y: -pad,
          w: (100 + pad * 2) * a,
          h: 100 + pad * 2,
        }
      : {
          x: -pad,
          y: 50 - (100 + pad * 2) / a / 2,
          w: 100 + pad * 2,
          h: (100 + pad * 2) / a,
        };

  const cities = region.cities;
  const line = cutLine(cities, theta, pos);
  const far = 400;
  const unitPx = box.w / vb.w;
  const s = (px: number) => px / unitPx; // screen pixels → field units

  function toField(e: PointerEvent<Element>): { x: number; y: number } | null {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  function onDown(e: PointerEvent<Element>, mode: "move" | "rotate") {
    if (locked || !onChange) return;
    // A handle press must not also count as a press on the field below it.
    e.stopPropagation();
    // Capture on the <svg>: its onPointerMove drives both kinds of drag, and
    // keeps receiving moves even when the pointer leaves the handle.
    svgRef.current?.setPointerCapture(e.pointerId);
    setDrag(mode);
    if (mode === "move") {
      const p = toField(e);
      if (p) onChange(theta, posThrough(cities, theta, p.x, p.y));
    }
  }

  function onMove(e: PointerEvent<SVGSVGElement>) {
    if (!drag || !onChange) return;
    const p = toField(e);
    if (!p) return;
    if (drag === "move") {
      onChange(theta, posThrough(cities, theta, p.x, p.y));
    } else {
      const next = thetaToward(line.px, line.py, p.x, p.y);
      // Keep the line on its pivot while it turns.
      onChange(next, posThrough(cities, next, line.px, line.py));
    }
  }

  function onKey(e: KeyboardEvent<SVGSVGElement>) {
    if (locked || !onChange) return;
    const big = e.shiftKey ? 5 : 1;
    let t = theta;
    let p = pos;
    if (e.key === "ArrowLeft") t = (theta - big + 180) % 180;
    else if (e.key === "ArrowRight") t = (theta + big) % 180;
    else if (e.key === "ArrowUp") p = Math.min(100, pos + big);
    else if (e.key === "ArrowDown") p = Math.max(0, pos - big);
    else return;
    e.preventDefault();
    onChange(t, p);
  }

  const viewBox = { x0: vb.x, y0: vb.y, x1: vb.x + vb.w, y1: vb.y + vb.h };
  const poly = (pts: [number, number][]) =>
    pts.map((p) => p.join(",")).join(" ");
  const maxPop = Math.max(...cities.map((c) => c.pop));
  const labelled = new Set(
    [...cities]
      .sort((x, y) => y.pop - x.pop)
      .slice(0, compact ? 0 : cities.length)
      .map((c) => c.name),
  );

  const handles = [1, -1].map((k) => ({
    x: line.px + line.dx * HANDLE_R * k,
    y: line.py + line.dy * HANDLE_R * k,
  }));

  return (
    <div ref={hostRef} className="absolute inset-0">
      <svg
        ref={svgRef}
        className="gs-field block h-full w-full"
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        preserveAspectRatio="none"
        role={locked ? "img" : "application"}
        aria-label={label}
        tabIndex={locked ? -1 : 0}
        data-dragging={drag !== null}
        onPointerDown={(e) => onDown(e, "move")}
        onPointerMove={onMove}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
        onKeyDown={onKey}
      >
        <defs>
          <pattern
            id={`gs-grid-${compact ? "s" : "l"}`}
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M5 0H0V5"
              fill="none"
              stroke="var(--gs-grid)"
              strokeWidth={s(1)}
            />
          </pattern>
        </defs>
        <rect
          x={vb.x}
          y={vb.y}
          width={vb.w}
          height={vb.h}
          fill="var(--gs-field)"
        />
        <rect
          x={vb.x}
          y={vb.y}
          width={vb.w}
          height={vb.h}
          fill={`url(#gs-grid-${compact ? "s" : "l"})`}
        />
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g} stroke="var(--gs-grid-major)" strokeWidth={s(1)}>
            <line x1={g} y1={vb.y} x2={g} y2={vb.y + vb.h} />
            <line x1={vb.x} y1={g} x2={vb.x + vb.w} y2={g} />
          </g>
        ))}
        {/* Corner ticks frame the analysed area. */}
        {!compact &&
          (
            [
              [0, 0, 1, 1],
              [100, 0, -1, 1],
              [0, 100, 1, -1],
              [100, 100, -1, -1],
            ] as const
          ).map(([x, y, sx, sy]) => (
            <path
              key={`${x}-${y}`}
              d={`M${x} ${y + 5 * sy} V${y} H${x + 5 * sx}`}
              fill="none"
              stroke="var(--gs-muted)"
              strokeWidth={s(1.5)}
            />
          ))}

        {showSplit && (
          <g className="gs-tint">
            <polygon
              points={poly(halfPlane(line, "a", viewBox))}
              fill="var(--gs-a)"
              opacity={0.1}
            />
            <polygon
              points={poly(halfPlane(line, "b", viewBox))}
              fill="var(--gs-b)"
              opacity={0.1}
            />
          </g>
        )}

        {cities.map((c) => {
          const sideA = projection(c, theta) < line.threshold;
          const color = dim
            ? "var(--gs-muted)"
            : sideA
              ? "var(--gs-a)"
              : "var(--gs-b)";
          const k = Math.sqrt(c.pop / maxPop);
          const core = 0.9 + k * (compact ? 2.4 : 3);
          return (
            <g key={c.name}>
              {/* Halo ∝ population: the density the cut has to balance. */}
              <circle
                cx={c.x}
                cy={c.y}
                r={core * 2.4}
                fill={color}
                opacity={0.14}
              />
              <circle
                cx={c.x}
                cy={c.y}
                r={core}
                fill={color}
                stroke="var(--gs-field)"
                strokeWidth={s(1.5)}
              />
              {labelled.has(c.name) && (
                <text
                  x={c.x + core + 1.2}
                  y={c.y + 0.9}
                  fontSize={Math.max(2.2, s(11))}
                  fill="var(--gs-muted)"
                  style={{
                    pointerEvents: "none",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {c.name}
                </text>
              )}
            </g>
          );
        })}

        {!dim && (
          <>
            <line
              x1={line.px - line.dx * far}
              y1={line.py - line.dy * far}
              x2={line.px + line.dx * far}
              y2={line.py + line.dy * far}
              stroke="var(--gs-cut)"
              strokeWidth={s(compact ? 1.5 : 2)}
            />
            {!locked && (
              <>
                {/* Wide, invisible grab area along the line. */}
                <line
                  x1={line.px - line.dx * far}
                  y1={line.py - line.dy * far}
                  x2={line.px + line.dx * far}
                  y2={line.py + line.dy * far}
                  stroke="transparent"
                  strokeWidth={s(28)}
                  style={{ cursor: "move" }}
                />
                <rect
                  x={line.px - s(6)}
                  y={line.py - s(6)}
                  width={s(12)}
                  height={s(12)}
                  transform={`rotate(45 ${line.px} ${line.py})`}
                  fill="var(--gs-cut)"
                  style={{ cursor: "move" }}
                />
                {handles.map((h, i) => (
                  <g
                    key={i}
                    onPointerDown={(e) => onDown(e, "rotate")}
                    style={{ cursor: "grab" }}
                  >
                    <circle cx={h.x} cy={h.y} r={s(26)} fill="transparent" />
                    <circle
                      cx={h.x}
                      cy={h.y}
                      r={s(drag === "rotate" ? 12 : 10)}
                      fill="var(--gs-field)"
                      stroke="var(--gs-cut)"
                      strokeWidth={s(2)}
                    />
                    <circle cx={h.x} cy={h.y} r={s(3.5)} fill="var(--gs-cut)" />
                  </g>
                ))}
              </>
            )}
          </>
        )}
      </svg>
    </div>
  );
}
