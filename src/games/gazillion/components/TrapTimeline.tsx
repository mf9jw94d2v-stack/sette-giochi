import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { formatYear } from "../format";
import {
  AXIS_MAX_YEAR,
  AXIS_MIN_YEAR,
  ERA_BANDS,
  TICKS,
  setEnd,
  slide,
  tToYear,
  yearToT,
} from "../scale";

export interface Trap {
  low: number;
  high: number;
}

/** A finished round, for the results timeline. */
export interface PlottedEvent {
  year: number;
  trapped: boolean;
  label: string;
  trap: Trap | null;
}

/**
 * The timeline — the centrepiece of the page, spanning its full width.
 *
 * In play it carries the trap: two amber handles and the band between them.
 * Drag a handle to move that end, drag the band to slide the whole trap.
 * Each handle is also a keyboard slider (←/→ one year, Shift ten, PgUp/PgDn a
 * hundred), so the pointer is never the only way in.
 *
 * On reveal a needle drops onto the true year. In the results every event of
 * the session is plotted at once.
 */
export function TrapTimeline({
  trap,
  onTrap,
  truth,
  events,
}: {
  trap?: Trap | null;
  onTrap?: (t: Trap) => void;
  /** The revealed year and whether the trap caught it. */
  truth?: { year: number; trapped: boolean } | null;
  events?: PlottedEvent[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  // 0 until measured: assuming a width let the era labels spill past a
  // phone's edge for a frame, which briefly made the page scroll sideways.
  const [width, setWidth] = useState(0);
  const drag = useRef<{
    kind: "low" | "high" | "band";
    startT: number;
    trap: Trap;
  } | null>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tAt = (clientX: number) => {
    const r = trackRef.current!.getBoundingClientRect();
    return (clientX - r.left) / r.width;
  };

  function begin(e: PointerEvent<HTMLElement>, kind: "low" | "high" | "band") {
    if (!onTrap || !trap) return;
    e.preventDefault();
    e.stopPropagation();
    trackRef.current?.setPointerCapture(e.pointerId);
    drag.current = { kind, startT: tAt(e.clientX), trap };
  }

  function move(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || !onTrap) return;
    const t = tAt(e.clientX);
    if (d.kind === "band") onTrap(slide(d.trap, t - d.startT));
    else onTrap(setEnd(d.trap, d.kind, tToYear(t)));
  }

  function key(e: KeyboardEvent<HTMLDivElement>, end: "low" | "high") {
    if (!onTrap || !trap) return;
    const step =
      e.key === "PageUp" || e.key === "PageDown" ? 100 : e.shiftKey ? 10 : 1;
    const dir =
      e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "PageUp"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowDown" || e.key === "PageDown"
          ? -1
          : 0;
    if (!dir) return;
    e.preventDefault();
    onTrap(setEnd(trap, end, trap[end] + dir * step));
  }

  // Keep tick labels clear of each other (a label is ~80px wide): a phone
  // simply shows fewer of them.
  const ticks: number[] = [];
  for (const y of TICKS) {
    const x = yearToT(y) * width;
    const last = ticks.length ? yearToT(ticks[ticks.length - 1]) * width : -1e9;
    if (x - last >= 92) ticks.push(y);
  }

  const pct = (y: number) => `${yearToT(y) * 100}%`;

  return (
    <div className="select-none">
      {/* Era names above the track. */}
      <div className="relative h-6" aria-hidden="true">
        {ERA_BANDS.map((era) => {
          const w = (yearToT(era.to) - yearToT(era.from)) * width;
          return (
            <span
              key={era.label}
              className="gz-kicker absolute top-0 truncate px-1.5 text-[10px] tracking-[0.06em]"
              style={{ left: pct(era.from), width: w }}
              title={era.label}
            >
              {/* Full name if it fits, a short one if not, nothing rather
                  than a name cut in half. */}
              {w > 120 ? era.label : w > 62 ? era.short : ""}
            </span>
          );
        })}
      </div>

      <div
        ref={trackRef}
        className="gz-track relative h-[clamp(6rem,20dvh,11rem)]"
        onPointerMove={move}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        {/* Eras as alternating bands: time made visible. */}
        {ERA_BANDS.map((era, i) => (
          <span
            key={era.label}
            aria-hidden="true"
            className="absolute inset-y-6"
            style={{
              left: pct(era.from),
              width: `${(yearToT(era.to) - yearToT(era.from)) * 100}%`,
              background: i % 2 ? "var(--gz-band-a)" : "var(--gz-band-b)",
              borderLeft: "1px solid var(--gz-line)",
            }}
          />
        ))}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-1/2 h-px"
          style={{ background: "var(--gz-line)" }}
        />

        {/* The trap. */}
        {trap && (
          <>
            <div
              aria-hidden="true"
              className="absolute inset-y-4"
              onPointerDown={(e) => begin(e, "band")}
              style={{
                left: pct(trap.low),
                width: `calc(${pct(trap.high)} - ${pct(trap.low)})`,
                background: truth
                  ? truth.trapped
                    ? "var(--gz-hit-soft)"
                    : "var(--gz-trap-soft)"
                  : "var(--gz-trap)",
                borderTop: "2px solid var(--gz-amber)",
                borderBottom: "2px solid var(--gz-amber)",
                cursor: onTrap ? "grab" : "default",
              }}
            />
            {onTrap &&
              (["low", "high"] as const).map((end) => (
                <div
                  key={end}
                  role="slider"
                  tabIndex={0}
                  aria-label={
                    end === "low"
                      ? "Inizio dell'intervallo"
                      : "Fine dell'intervallo"
                  }
                  aria-valuemin={AXIS_MIN_YEAR}
                  aria-valuemax={AXIS_MAX_YEAR}
                  aria-valuenow={trap[end]}
                  aria-valuetext={formatYear(trap[end])}
                  className="gz-handle"
                  style={{ left: pct(trap[end]) }}
                  onPointerDown={(e) => begin(e, end)}
                  onKeyDown={(e) => key(e, end)}
                />
              ))}
          </>
        )}

        {/* Reveal: the needle on the true year. */}
        {truth && (
          <div
            className="gz-needle absolute inset-y-0 -ml-px w-0.5"
            style={{
              left: pct(truth.year),
              background: truth.trapped ? "var(--gz-hit)" : "var(--gz-miss)",
            }}
          >
            <span
              className="gz-year absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-bold"
              style={{
                background: truth.trapped ? "var(--gz-hit)" : "var(--gz-miss)",
                color: "var(--gz-on-mark)",
              }}
            >
              {formatYear(truth.year)}
            </span>
          </div>
        )}

        {/* Results: every event of the session. */}
        {events?.map((ev, i) => (
          <div key={i}>
            {ev.trap && (
              <span
                aria-hidden="true"
                className="absolute"
                style={{
                  left: pct(ev.trap.low),
                  width: `calc(${pct(ev.trap.high)} - ${pct(ev.trap.low)})`,
                  top: `${18 + i * 12}%`,
                  height: 5,
                  borderRadius: 999,
                  background: "var(--gz-trap-strong)",
                }}
              />
            )}
            <span
              className="gz-needle absolute w-0.5"
              style={{
                left: pct(ev.year),
                top: `${10 + i * 12}%`,
                bottom: 0,
                background: ev.trapped ? "var(--gz-hit)" : "var(--gz-miss)",
              }}
              title={`${ev.label} — ${formatYear(ev.year)}`}
            >
              <span
                className="gz-year absolute -left-2.5 -top-2.5 grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold"
                style={{
                  background: ev.trapped ? "var(--gz-hit)" : "var(--gz-miss)",
                  color: "var(--gz-on-mark)",
                }}
              >
                {i + 1}
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* Years under the track. */}
      <div className="relative h-5" aria-hidden="true">
        {ticks.map((y) => {
          // The labels at either end hang inwards so they are never clipped.
          const t = yearToT(y);
          const align =
            t < 0.04 ? "" : t > 0.96 ? "-translate-x-full" : "-translate-x-1/2";
          return (
            <span
              key={y}
              className={`gz-year absolute whitespace-nowrap text-[11px] ${align}`}
              style={{ left: pct(y), color: "var(--gz-muted)" }}
            >
              {y === 1 ? "1 d.C." : formatYear(y)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
