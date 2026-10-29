import type { CSSProperties, ReactNode } from "react";
import { GAME_THEMES } from "@/games/theme";
import { getGameMeta } from "@/games/registry";
import { cn } from "@/lib/utils";
import type { GameId } from "@/types/game";

/**
 * A game's cover: the game as it really looks, in miniature. Its own
 * background, its own typeface for the name, and a drawing of its own
 * composition — the depth column for Krillion, the timeline trap for
 * Gazillion, the two silhouettes for Size It Up.
 *
 * The art is a 400×400 drawing scaled to cover the box, with everything
 * important inside x 50–350, y 75–325: so the same cover crops cleanly to a
 * portrait shelf box (3:4) and to a landscape catalogue row (16:10).
 *
 * Purely visual: the art is hidden from assistive tech, the name is real text.
 * The caller decides the box size and wraps it in a link.
 */
export function GameCover({
  id,
  nameSize = "md",
  showName = true,
  className,
  children,
}: {
  id: GameId;
  nameSize?: "sm" | "md" | "lg";
  /** Off for thumbnails too small to carry the name; the caller shows it. */
  showName?: boolean;
  className?: string;
  /** Overlays such as a "Fatta" tag. */
  children?: ReactNode;
}) {
  const t = GAME_THEMES[id];
  const meta = getGameMeta(id);
  const Art = ART[id];
  const nameStyle: CSSProperties = {
    color: t.fg,
    fontFamily: t.font,
    ...t.nameStyle,
  };

  return (
    <div
      className={cn(
        "game-cover relative overflow-hidden rounded-md",
        className,
      )}
      style={{ background: `linear-gradient(180deg, ${t.from}, ${t.to})` }}
    >
      <svg
        viewBox="0 0 400 400"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <Art />
      </svg>
      {showName && (
        <p
          className={cn(
            "absolute inset-x-0 bottom-0 px-3 pb-2.5 leading-none",
            nameSize === "sm" && "text-lg",
            nameSize === "md" && "text-[clamp(1.25rem,2vw,1.6rem)]",
            nameSize === "lg" &&
              "text-[clamp(1.75rem,3.5vw,2.75rem)] px-5 pb-4",
            id === "krillion" &&
              (nameSize === "lg" ? "text-[2.75rem]" : "text-[1.9rem]"),
          )}
          style={nameStyle}
        >
          {meta?.name}
        </p>
      )}
      {children}
    </div>
  );
}

/** "Fatta": today's challenge for this game is done. Sits on a cover. */
export function DoneTag({ label = "Fatta" }: { label?: string }) {
  return (
    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-neutral-900 shadow-sm">
      <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
        <path
          d="M2.5 6.5l2.2 2.2L9.5 3.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </span>
  );
}

/** Deterministic scatter, so the cover is the same on every visit. */
function scatter(n: number, seed: number): [number, number, number][] {
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  return Array.from({ length: n }, () => [rnd(), rnd(), rnd()]);
}

function Grid({
  step,
  stroke,
  from = 0,
  to = 400,
}: {
  step: number;
  stroke: string;
  from?: number;
  to?: number;
}) {
  const lines = [];
  for (let v = from; v <= to; v += step) {
    lines.push(
      <line key={`v${v}`} x1={v} y1={0} x2={v} y2={400} stroke={stroke} />,
      <line key={`h${v}`} x1={0} y1={v} x2={400} y2={v} stroke={stroke} />,
    );
  }
  return <g strokeWidth="1">{lines}</g>;
}

/** Fact Map: graticule, a pin and the great-circle arc to the true place. */
function FactMapArt() {
  return (
    <>
      <Grid step={40} stroke="rgba(43,39,34,0.09)" />
      <path
        d="M110 205 Q 205 70 300 160"
        fill="none"
        stroke="#2b2722"
        strokeWidth="2.5"
        strokeDasharray="7 7"
        strokeLinecap="round"
      />
      <circle
        cx="300"
        cy="160"
        r="9"
        fill="#047857"
        stroke="#faf7f0"
        strokeWidth="3"
      />
      <path
        d="M110 214 C 96 196 88 184 88 172 a22 22 0 1 1 44 0 c0 12 -8 24 -22 42z"
        fill="#c2410c"
      />
      <circle cx="110" cy="172" r="7" fill="#fff7ed" />
    </>
  );
}

/** GeoSlice: a field of cities cut in two by one straight line. */
function GeoSliceArt() {
  // The cut runs from (70, 320) to (330, 60); cities left of it are side A.
  const side = (x: number, y: number) =>
    (330 - 70) * (y - 320) - (60 - 320) * (x - 70) < 0;
  const cities = scatter(70, 7).map(([a, b, c]) => {
    const x = 50 + a * 300;
    const y = 70 + b * 230;
    return { x, y, r: 1.6 + c * c * 5, a: side(x, y) };
  });
  return (
    <>
      <Grid step={25} stroke="rgba(148,163,184,0.07)" />
      <Grid step={100} stroke="rgba(148,163,184,0.14)" />
      {cities.map((p, i) => (
        <g key={i} fill={p.a ? "#22d3ee" : "#fb923c"}>
          <circle cx={p.x} cy={p.y} r={p.r * 2.6} opacity="0.18" />
          <circle cx={p.x} cy={p.y} r={p.r} />
        </g>
      ))}
      <line
        x1="70"
        y1="320"
        x2="330"
        y2="60"
        stroke="#f8fafc"
        strokeWidth="2.5"
      />
      <circle
        cx="200"
        cy="190"
        r="7"
        fill="#060b16"
        stroke="#f8fafc"
        strokeWidth="2.5"
      />
    </>
  );
}

/** Gazillion: the timeline, the amber trap and the needle of the true year. */
function GazillionArt() {
  const stars = scatter(26, 3);
  return (
    <>
      <defs>
        <linearGradient id="cv-gz" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0c0a1d" />
          <stop offset="0.55" stopColor="#1e0b2e" />
          <stop offset="1" stopColor="#4c0519" />
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#cv-gz)" />
      {stars.map(([a, b, c], i) => (
        <circle
          key={i}
          cx={a * 400}
          cy={20 + b * 110}
          r={0.6 + c}
          fill="#fdf2f8"
          opacity={0.25 + c * 0.4}
        />
      ))}
      <line
        x1="0"
        y1="185"
        x2="400"
        y2="185"
        stroke="rgba(253,242,248,0.3)"
        strokeWidth="1.5"
      />
      {Array.from({ length: 14 }, (_, i) => (
        <line
          key={i}
          x1={20 + i * 28}
          y1={i % 3 === 0 ? 173 : 179}
          x2={20 + i * 28}
          y2={i % 3 === 0 ? 197 : 191}
          stroke="rgba(253,242,248,0.35)"
        />
      ))}
      <rect
        x="150"
        y="160"
        width="110"
        height="50"
        fill="rgba(251,191,36,0.22)"
      />
      <line
        x1="150"
        y1="160"
        x2="260"
        y2="160"
        stroke="#fbbf24"
        strokeWidth="2"
      />
      <line
        x1="150"
        y1="210"
        x2="260"
        y2="210"
        stroke="#fbbf24"
        strokeWidth="2"
      />
      <rect x="144" y="150" width="12" height="70" rx="6" fill="#fbbf24" />
      <rect x="254" y="150" width="12" height="70" rx="6" fill="#fbbf24" />
      <line
        x1="218"
        y1="125"
        x2="218"
        y2="215"
        stroke="#4ade80"
        strokeWidth="3"
      />
      <circle cx="218" cy="122" r="6" fill="#4ade80" />
    </>
  );
}

/** Estimania: an order of magnitude set like a magazine figure, and the ruler. */
function EstimaniaArt() {
  return (
    <>
      <line
        x1="40"
        y1="88"
        x2="360"
        y2="88"
        stroke="#d8d1c3"
        strokeWidth="1.5"
      />
      <text
        x="200"
        y="200"
        textAnchor="middle"
        fontFamily="Fraunces, Georgia, serif"
        fontSize="104"
        fontWeight="600"
        fill="#0d9488"
      >
        10
        <tspan fontSize="56" dy="-46">
          6
        </tspan>
      </text>
      <line
        x1="50"
        y1="250"
        x2="350"
        y2="250"
        stroke="#1c1917"
        strokeWidth="2"
      />
      {Array.from({ length: 9 }, (_, i) => (
        <g key={i}>
          <line
            x1={50 + i * 37.5}
            y1="242"
            x2={50 + i * 37.5}
            y2="258"
            stroke="#1c1917"
            strokeWidth="1.5"
          />
        </g>
      ))}
      <path d="M275 236 l9 -14 h-18z" fill="#b45309" />
    </>
  );
}

/** Plain: the altitude climbing in steps toward the mission line. */
function PlainArt() {
  return (
    <>
      <line
        x1="40"
        y1="95"
        x2="340"
        y2="95"
        stroke="rgba(243,245,249,0.28)"
        strokeDasharray="4 7"
      />
      <path
        d="M45 300 H105 V268 H165 V236 H225 V178 H285 V128 H330"
        fill="none"
        stroke="#d2fa4b"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path d="M332 128 l20 -8 l-6 8 l6 8z" fill="#d2fa4b" />
      <line
        x1="372"
        y1="60"
        x2="372"
        y2="330"
        stroke="rgba(243,245,249,0.16)"
        strokeWidth="2"
      />
      {[90, 150, 210, 270].map((y) => (
        <line
          key={y}
          x1="364"
          y1={y}
          x2="372"
          y2={y}
          stroke="rgba(243,245,249,0.28)"
        />
      ))}
    </>
  );
}

/** Krillion: the depth gauge and the submersible going down. */
function KrillionArt() {
  return (
    <>
      <defs>
        <linearGradient id="cv-kr" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b3a5b" />
          <stop offset="0.38" stopColor="#06182a" />
          <stop offset="1" stopColor="#020409" />
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#cv-kr)" />
      <line x1="70" y1="40" x2="70" y2="360" stroke="rgba(56,189,248,0.25)" />
      {Array.from({ length: 7 }, (_, i) => (
        <g key={i}>
          <line
            x1="62"
            y1={60 + i * 40}
            x2="78"
            y2={60 + i * 40}
            stroke="rgba(56,189,248,0.4)"
          />
          <text
            x="86"
            y={65 + i * 40}
            fontFamily="VT323, monospace"
            fontSize="16"
            fill="#8fa9cc"
          >
            {(i + 1) * 1000}
          </text>
        </g>
      ))}
      <line
        x1="230"
        y1="30"
        x2="230"
        y2="200"
        stroke="#38bdf8"
        strokeWidth="2"
        strokeDasharray="2 7"
      />
      <circle
        cx="230"
        cy="222"
        r="44"
        fill="none"
        stroke="#38bdf8"
        opacity="0.18"
      />
      <circle
        cx="230"
        cy="222"
        r="26"
        fill="none"
        stroke="#38bdf8"
        opacity="0.35"
      />
      <rect
        x="219"
        y="211"
        width="22"
        height="22"
        fill="#38bdf8"
        transform="rotate(45 230 222)"
      />
    </>
  );
}

/** Size It Up: two silhouettes on one baseline, the red one being resized. */
function SizeItUpArt() {
  return (
    <>
      <Grid step={20} stroke="rgba(207,180,156,0.4)" />
      <path d="M100 255 h28 l-6 -100 l-8 -16 l-8 16z" fill="#1e3a8a" />
      <line
        x1="140"
        y1="139"
        x2="140"
        y2="255"
        stroke="#1e3a8a"
        strokeDasharray="4 4"
      />
      <path
        d="M222 255 h56 l-10 -138 h-36z M236 117 v-18 h28 v18z M232 99 l18 -18 l18 18z"
        fill="#ab341f"
      />
      <circle
        cx="282"
        cy="84"
        r="9"
        fill="#ab341f"
        stroke="#fff8ef"
        strokeWidth="3"
      />
      <line
        x1="0"
        y1="255"
        x2="400"
        y2="255"
        stroke="#1e3a8a"
        strokeWidth="3"
      />
    </>
  );
}

const ART: Record<GameId, () => ReactNode> = {
  "fact-map": FactMapArt,
  geoslice: GeoSliceArt,
  gazillion: GazillionArt,
  estimania: EstimaniaArt,
  plain: PlainArt,
  krillion: KrillionArt,
  "size-it-up": SizeItUpArt,
};
