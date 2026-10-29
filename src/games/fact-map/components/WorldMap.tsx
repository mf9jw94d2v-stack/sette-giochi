import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Locate, Minus, Plus } from "lucide-react";
import {
  clampView,
  fitWorld,
  frame,
  playView,
  px,
  py,
  screenToLonLat,
  zoomAt,
  type SafeArea,
  type View,
} from "../geo";

/** Movement (px) past which a press becomes a pan instead of a pin. */
const DRAG_THRESHOLD = 5;

export interface MapFocus {
  /** Change this to re-frame the map; the same key never moves it again. */
  key: string;
  /** Places to frame. Empty means the whole world. */
  points: [number, number][];
  /** Screen fractions hidden by floating panels, kept clear when framing. */
  safe?: SafeArea;
}

/**
 * The world map, filling whatever box it is given.
 *
 * - Press and release in place → drops the pin there.
 * - Press and drag → pans. The two are told apart by distance, so a slightly
 *   shaky tap still drops a pin, and panning never drops one by accident.
 * - Wheel, the + / − tools, or + / − keys → zoom around the pointer/centre.
 * - Keyboard: with the map focused, arrows pan, and Enter drops the pin under
 *   the crosshair in the middle — so the game is playable without a pointer.
 *
 * `children` draws overlays in map coordinates; it receives `u`, degrees per
 * screen pixel, so markers keep the same on-screen size at any zoom.
 */
export function WorldMap({
  landPath,
  focus,
  onPick,
  label,
  children,
}: {
  landPath: string | null;
  focus: MapFocus;
  /** Null when the map should not accept a pin (during a reveal). */
  onPick: ((lon: number, lat: number) => void) | null;
  label: string;
  children?: (u: number) => ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1200, h: 640 });
  const aspect = size.w / Math.max(1, size.h);
  const [view, setView] = useState<View>(() => playView(1200 / 640));
  const [panning, setPanning] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const press = useRef<{
    x: number;
    y: number;
    view: View;
    moved: boolean;
    id: number;
  } | null>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      if (r.width > 0 && r.height > 0) setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Re-frame only when the focus key changes, never on every render.
  const focusKey = focus.key;
  const focusRef = useRef(focus);
  focusRef.current = focus;
  // Has the player moved the map since it was last framed? Until they do,
  // a change of size re-frames from scratch — the first real measurement
  // arrives after mount, and a phone needs a different opening view than the
  // placeholder size. Once they have panned or zoomed, their view is kept.
  const moved = useRef(false);

  // Keep the aspect locked to the screen whenever the box changes size.
  useEffect(() => {
    if (!moved.current) {
      const f = focusRef.current;
      setView(frame(f.points, aspect, 10, 28, f.safe));
    } else {
      setView((v) => clampView({ ...v, h: v.w / aspect }, aspect));
    }
  }, [aspect]);

  useEffect(() => {
    moved.current = false;
    const f = focusRef.current;
    setView(frame(f.points, aspect, 10, 28, f.safe));
    // aspect intentionally read at the moment the focus changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  const zoomBy = useCallback(
    (factor: number, fx = 0.5, fy = 0.5) => {
      moved.current = true;
      setView((v) => zoomAt(v, factor, fx, fy, aspect));
    },
    [aspect],
  );

  // Wheel zoom must cancel the page scroll, which React's passive wheel
  // listener cannot do — so it is attached natively.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const r = el!.getBoundingClientRect();
      zoomBy(
        Math.exp(-e.deltaY * 0.0016),
        (e.clientX - r.left) / r.width,
        (e.clientY - r.top) / r.height,
      );
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  function onPointerDown(e: PointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    press.current = {
      x: e.clientX,
      y: e.clientY,
      view,
      moved: false,
      id: e.pointerId,
    };
    setKeyboard(false);
  }

  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!p.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!p.moved) {
      p.moved = true;
      moved.current = true;
      setPanning(true);
    }
    const degPerPx = p.view.w / size.w;
    setView(
      clampView(
        { ...p.view, x: p.view.x - dx * degPerPx, y: p.view.y - dy * degPerPx },
        aspect,
      ),
    );
  }

  function onPointerUp(e: PointerEvent<SVGSVGElement>) {
    const p = press.current;
    press.current = null;
    setPanning(false);
    if (!p || p.moved || !onPick) return;
    const r = e.currentTarget.getBoundingClientRect();
    const { lon, lat } = screenToLonLat(
      view,
      (e.clientX - r.left) / r.width,
      (e.clientY - r.top) / r.height,
    );
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return;
    onPick(lon, lat);
  }

  function onKeyDown(e: KeyboardEvent<SVGSVGElement>) {
    const step = view.w * 0.08;
    const pan = (dx: number, dy: number) => {
      moved.current = true;
      setView((v) => clampView({ ...v, x: v.x + dx, y: v.y + dy }, aspect));
    };
    switch (e.key) {
      case "ArrowLeft":
        pan(-step, 0);
        break;
      case "ArrowRight":
        pan(step, 0);
        break;
      case "ArrowUp":
        pan(0, -step);
        break;
      case "ArrowDown":
        pan(0, step);
        break;
      case "+":
      case "=":
        zoomBy(1.5);
        break;
      case "-":
      case "_":
        zoomBy(1 / 1.5);
        break;
      case "Enter":
      case " ":
        if (onPick) {
          const { lon, lat } = screenToLonLat(view, 0.5, 0.5);
          if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180)
            onPick(lon, lat);
        }
        break;
      default:
        return;
    }
    e.preventDefault();
    setKeyboard(true);
  }

  const u = view.w / size.w;
  const cx = view.x + view.w / 2;
  const cy = view.y + view.h / 2;

  return (
    <div ref={hostRef} className="absolute inset-0">
      <svg
        className="fm-map block h-full w-full"
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="none"
        role="application"
        aria-label={label}
        aria-roledescription="mappa"
        tabIndex={0}
        data-panning={panning}
        data-locked={!onPick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          press.current = null;
          setPanning(false);
        }}
        onKeyDown={onKeyDown}
        // Only a keyboard focus shows the crosshair: a mouse click also
        // focuses the map, and a crosshair appearing on every tap is noise.
        onFocus={(e) => setKeyboard(e.currentTarget.matches(":focus-visible"))}
        onBlur={() => setKeyboard(false)}
      >
        <rect
          x={view.x - 10}
          y={view.y - 10}
          width={view.w + 20}
          height={view.h + 20}
          fill="var(--fm-ocean)"
        />
        {/* Graticule every 30°: the quiet grid of a printed atlas. */}
        <g stroke="var(--fm-ocean-line)" strokeWidth={u} fill="none">
          {Array.from({ length: 13 }, (_, i) => (
            <line key={`m${i}`} x1={i * 30} y1={0} x2={i * 30} y2={180} />
          ))}
          {Array.from({ length: 7 }, (_, i) => (
            <line key={`p${i}`} x1={0} y1={i * 30} x2={360} y2={i * 30} />
          ))}
        </g>
        {landPath && (
          <path
            d={landPath}
            fill="var(--fm-land)"
            stroke="var(--fm-coast)"
            strokeWidth={u * 0.9}
            strokeLinejoin="round"
          />
        )}
        {children?.(u)}
        {keyboard && onPick && (
          <g stroke="var(--fm-ink)" strokeWidth={u * 1.5} aria-hidden="true">
            <line x1={cx - u * 12} y1={cy} x2={cx + u * 12} y2={cy} />
            <line x1={cx} y1={cy - u * 12} x2={cx} y2={cy + u * 12} />
          </g>
        )}
      </svg>

      {!landPath && (
        <p className="fm-label pointer-events-none absolute inset-0 grid place-items-center">
          Caricamento della mappa…
        </p>
      )}

      <div
        className="fm-panel absolute right-3 top-1/2 flex -translate-y-1/2 flex-col overflow-hidden"
        role="group"
        aria-label="Comandi della mappa"
      >
        <button
          type="button"
          className="fm-tool"
          aria-label="Avvicina"
          onClick={() => zoomBy(1.6)}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="fm-tool"
          aria-label="Allontana"
          onClick={() => zoomBy(1 / 1.6)}
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="fm-tool"
          aria-label="Mostra tutto il mondo"
          onClick={() => setView(fitWorld(aspect))}
        >
          <Locate className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** A map pin: a drop shape whose tip sits exactly on the coordinate. */
export function Pin({
  lon,
  lat,
  u,
  color,
  label,
}: {
  lon: number;
  lat: number;
  u: number;
  color: string;
  label?: string;
}) {
  const x = px(lon);
  const y = py(lat);
  const s = u * 15;
  return (
    <g className="fm-pin">
      <path
        d={`M${x} ${y} c${-s * 0.15} ${-s * 0.45} ${-s * 0.55} ${-s * 0.6} ${-s * 0.55} ${-s} a${s * 0.55} ${s * 0.55} 0 1 1 ${s * 1.1} 0 c0 ${s * 0.4} ${-s * 0.4} ${s * 0.55} ${-s * 0.55} ${s} Z`}
        fill={color}
        stroke="var(--fm-paper)"
        strokeWidth={u * 1.6}
      />
      <circle
        cx={x}
        cy={y - s}
        r={s * (label ? 0.4 : 0.22)}
        fill="var(--fm-paper)"
      />
      {label && (
        <text
          x={x}
          y={y - s * 0.97}
          textAnchor="middle"
          fontSize={u * 9}
          fontWeight={700}
          fill={color}
          dominantBaseline="middle"
          style={{ pointerEvents: "none" }}
        >
          {label}
        </text>
      )}
    </g>
  );
}
