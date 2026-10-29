import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Move, ZoomIn, ZoomOut } from "lucide-react";
import {
  basePxPerMetre,
  formatMetres,
  clampRatio,
  clampZoom,
  drawObject,
  MAX_RATIO,
  MIN_RATIO,
  ratioToMetres,
  ratioToSlider,
  sliderToRatio,
  zoomToFit,
} from "../geometry";
import type { SizeObject } from "../types";
import { Silhouette } from "./Silhouette";
import { C } from "./palette";

export interface StageProps {
  reference: SizeObject;
  target: SizeObject;
  /** The player's estimate, as a multiple of the reference. */
  ratio: number;
  onRatioChange: (next: number) => void;
  /** Locked after "Blocca la scala": the handle and drag stop responding. */
  locked: boolean;
  /** On reveal, the true size of the target in metres. */
  truth?: number;
  reduceMotion: boolean;
}

const MIN_H = 260;

/**
 * The comparison stage — the whole point of the game.
 *
 * Two silhouettes stand on one baseline: the reference at its known size, the
 * target at whatever size the player claims. The player resizes the target by
 * dragging its corner handle, and the stage can be zoomed independently.
 *
 * THE RULE THIS COMPONENT EXISTS TO KEEP: zooming, resizing the window and
 * dragging the scene change `pxPerMetre` only. The estimate lives in `ratio`,
 * owned by the parent, and nothing here writes to it except an actual resize
 * gesture by the player.
 */
export function ComparisonStage({
  reference,
  target,
  ratio,
  onRatioChange,
  locked,
  truth,
  reduceMotion,
}: StageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 880, height: 420 });
  // `manualZoom` is null while the stage frames itself. Touching the zoom
  // buttons pins it; "Inquadra entrambi" releases it again.
  const [manualZoom, setManualZoom] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  // Measure the stage. This feeds the DISPLAY only — never the estimate.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setBox({ width: r.width, height: Math.max(MIN_H, r.height) });
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  const basePx = basePxPerMetre(reference, box);
  const guessM = ratioToMetres(ratio, reference);

  /**
   * Framing. Both silhouettes must stay whole and on screen: a shape cut off
   * by the edge cannot be compared, which is the one thing this stage is for.
   * So the scene reframes itself as the target grows — both objects shrink
   * TOGETHER, which leaves the comparison between them exactly as it was.
   * Only the drawing changes; `ratio` is untouched.
   */
  const autoZoom = useMemo(
    () =>
      clampZoom(
        Math.min(1, zoomToFit(reference, target, truth ?? guessM, box, basePx)),
      ),
    [reference, target, truth, guessM, box, basePx],
  );
  const zoom = manualZoom ?? autoZoom;
  const pxPerMetre = basePx * zoom;
  const baseline = box.height - 28;

  const refDraw = drawObject(reference, reference.sizeM, pxPerMetre);
  const guessDraw = drawObject(target, guessM, pxPerMetre);
  const truthDraw = truth ? drawObject(target, truth, pxPerMetre) : null;

  const refX = Math.max(refDraw.width / 2 + 16, box.width * 0.2);
  const targetX = Math.min(
    box.width - 16 - Math.max(guessDraw.width, truthDraw?.width ?? 0) / 2,
    Math.max(box.width * 0.62, refX + refDraw.width / 2 + 40),
  );

  const fitBoth = useCallback(() => setManualZoom(null), []);

  // --- resize by dragging the handle -------------------------------------
  const dragRef = useRef<{ startY: number; startRatio: number } | null>(null);

  function onHandleDown(e: React.PointerEvent<SVGGElement>) {
    if (locked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startRatio: ratio };
    setDragging(true);
  }

  function onHandleMove(e: React.PointerEvent<SVGGElement>) {
    const d = dragRef.current;
    if (!d || locked) return;
    // Dragging UP grows the silhouette. One stage height of travel spans about
    // two decades, so big and small objects both stay reachable.
    const dy = d.startY - e.clientY;
    const decades = (dy / Math.max(120, box.height)) * 2;
    const next = clampRatio(d.startRatio * Math.pow(10, decades));
    onRatioChange(next);
  }

  function endDrag(e: React.PointerEvent<SVGGElement>) {
    if (dragRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* the pointer may already be gone */
      }
    }
    dragRef.current = null;
    setDragging(false);
  }

  const handleX = targetX + guessDraw.width / 2;
  const handleY = baseline - guessDraw.height;
  const transition = reduceMotion || dragging ? "none" : "all 220ms ease-out";

  return (
    // The stage fills whatever its parent gives it: the page decides the size,
    // the stage only measures it.
    <div ref={hostRef} className="absolute inset-0">
      <svg
        width="100%"
        height="100%"
        className="absolute inset-0"
        viewBox={`0 0 ${box.width} ${box.height}`}
        role="img"
        aria-label={`Confronto di scala: ${reference.label}, ${reference.axis} ${reference.sizeM} metri, accanto a ${target.label}`}
        style={{ display: "block", touchAction: "none" }}
      >
        <defs>
          <pattern
            id="siu-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M40 0 H0 V40"
              fill="none"
              stroke={C.rule}
              strokeWidth="1"
              opacity="0.35"
            />
          </pattern>
        </defs>

        <rect width={box.width} height={box.height} fill={C.plate} />
        <rect width={box.width} height={box.height} fill="url(#siu-grid)" />

        {/* ground */}
        <line
          x1="0"
          y1={baseline}
          x2={box.width}
          y2={baseline}
          stroke={C.blue}
          strokeWidth="2.5"
        />
        <rect
          y={baseline}
          width={box.width}
          height={box.height - baseline}
          fill={C.blue}
          opacity="0.06"
        />

        <ScaleBar pxPerMetre={pxPerMetre} y={baseline + 16} />

        {/* reference: fixed, with a dotted guide marking its measured extent */}
        <g style={{ transition }}>
          <Silhouette
            object={reference}
            measurePx={refDraw.measurePx}
            x={refX}
            baseline={baseline}
            fill={C.blue}
          />
          <line
            x1={refX + refDraw.width / 2 + 10}
            y1={baseline - refDraw.height}
            x2={refX + refDraw.width / 2 + 10}
            y2={baseline}
            stroke={C.blue}
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.8"
          />
          <line
            x1={refX + refDraw.width / 2 + 5}
            y1={baseline - refDraw.height}
            x2={refX + refDraw.width / 2 + 15}
            y2={baseline - refDraw.height}
            stroke={C.blue}
            strokeWidth="1.5"
          />
        </g>

        {/* on reveal: the real size, behind the player's guess */}
        {truthDraw && (
          <Silhouette
            object={target}
            measurePx={truthDraw.measurePx}
            x={targetX}
            baseline={baseline}
            fill={C.good}
            opacity={0.85}
          />
        )}

        {/* the player's estimate */}
        <g style={{ transition }}>
          <Silhouette
            object={target}
            measurePx={guessDraw.measurePx}
            x={targetX}
            baseline={baseline}
            fill={truth ? "transparent" : C.red}
            opacity={truth ? 1 : 1}
            outline={truth ? C.red : undefined}
            dashed={Boolean(truth)}
          />
        </g>

        {/* resize handle */}
        {!locked && (
          <g
            onPointerDown={onHandleDown}
            onPointerMove={onHandleMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            style={{ cursor: dragging ? "grabbing" : "ns-resize" }}
          >
            {/* generous invisible hit area for touch */}
            <circle cx={handleX} cy={handleY} r="26" fill="transparent" />
            <circle
              cx={handleX}
              cy={handleY}
              r={dragging ? 13 : 11}
              fill={C.red}
              stroke={C.paper}
              strokeWidth="2.5"
              style={{ transition: reduceMotion ? "none" : "r 120ms ease-out" }}
            />
            <path
              d={`M${handleX - 4} ${handleY + 4} l8-8 M${handleX + 4} ${handleY - 4} l-2 0 m2 0 l0 2 M${handleX - 4} ${handleY + 4} l2 0 m-2 0 l0-2`}
              stroke={C.paper}
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        )}
      </svg>

      {/*
        Floating stage controls — display only, they never touch the answer.
        Top-LEFT on purpose: the resize handle always sits at the target's
        top-right corner, and on a narrow screen a tall target put the handle
        straight underneath these buttons, where it could not be grabbed. The
        reference stands on the left and has no handle, so the worst that can
        happen here is covering part of a drawing.
      */}
      <div className="absolute left-3 top-3 flex flex-col gap-1.5">
        <StageButton
          label="Ingrandisci la vista"
          onClick={() => setManualZoom(clampZoom(zoom * 1.5))}
        >
          <ZoomIn className="h-4 w-4" aria-hidden="true" />
        </StageButton>
        <StageButton
          label="Rimpicciolisci la vista"
          onClick={() => setManualZoom(clampZoom(zoom / 1.5))}
        >
          <ZoomOut className="h-4 w-4" aria-hidden="true" />
        </StageButton>
        <StageButton
          label="Inquadra entrambi"
          onClick={fitBoth}
          active={manualZoom !== null}
        >
          <Maximize2 className="h-4 w-4" aria-hidden="true" />
        </StageButton>
      </div>

      {zoom < 0.995 && (
        <p
          className="siu-label pointer-events-none absolute bottom-1.5 right-3 hidden items-center gap-1 text-right sm:flex"
          style={{ letterSpacing: "0.08em" }}
        >
          <Move className="h-3 w-3" aria-hidden="true" />
          Vista ridotta · il confronto non cambia
        </p>
      )}
    </div>
  );
}

function StageButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      data-active={active ? "true" : undefined}
      className="siu-tool"
    >
      {children}
    </button>
  );
}

/** "Nice" scale-bar lengths: 1, 2 and 5 times a power of ten. */
function niceLength(pxPerMetre: number): number {
  const ideal = 110 / pxPerMetre;
  const p = Math.pow(10, Math.floor(Math.log10(ideal)));
  for (const m of [1, 2, 5, 10]) if (m * p * pxPerMetre >= 50) return m * p;
  return 10 * p;
}

/**
 * The plate's scale bar, as on a map or a natural-history drawing: how long a
 * round length is at the current zoom. It only depends on the view, so it
 * says nothing about the answer.
 */
function ScaleBar({ pxPerMetre, y }: { pxPerMetre: number; y: number }) {
  if (!Number.isFinite(pxPerMetre) || pxPerMetre <= 0) return null;
  const m = niceLength(pxPerMetre);
  const w = m * pxPerMetre;
  const x = 14;
  return (
    <g aria-hidden="true">
      <rect x={x} y={y - 3} width={w / 2} height={5} fill={C.ink} />
      <rect
        x={x + w / 2}
        y={y - 3}
        width={w / 2}
        height={5}
        fill={C.paper}
        stroke={C.ink}
        strokeWidth="1"
      />
      <text
        x={x + w + 8}
        y={y + 3}
        fontSize="11"
        fontFamily="Archivo, Inter, sans-serif"
        fontWeight="600"
        fill={C.ink}
      >
        {formatMetres(m)}
      </text>
    </g>
  );
}

export { MIN_RATIO, MAX_RATIO, ratioToSlider, sliderToRatio };
