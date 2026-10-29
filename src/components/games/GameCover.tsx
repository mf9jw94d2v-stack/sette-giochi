import type { CSSProperties, ReactNode } from "react";
import { GAME_THEMES } from "@/games/theme";
import { getGameMeta } from "@/games/registry";
import { cn } from "@/lib/utils";
import { project, WORLD_H, WORLD_W } from "@/games/fact-map/projection";
import { WORLD_COVER_PATH } from "./worldCover";
import { COVER_CITIES, COVER_OUTLINE } from "./geosliceCover";
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

/** Atlante: the real continents, a pin, and the arc to the true place. */
function FactMapArt() {
  // The game's own projection and outline (Natural Earth, simplified).
  const k = 400 / WORLD_W;
  const ty = 200 - (WORLD_H * k) / 2;
  const at = (lon: number, lat: number) => {
    const [x, y] = project(lon, lat);
    return [x * k, y * k + ty] as const;
  };
  const [gx, gy] = at(-66.9, 10.5); // the guess
  const [tx, ty2] = at(-88.57, 20.68); // the true place
  return (
    <>
      <path
        d={WORLD_COVER_PATH}
        transform={`translate(0 ${ty}) scale(${k})`}
        fill="#28302a"
        stroke="#7a8571"
        strokeWidth={0.6 / k}
      />
      <path
        d={`M${gx} ${gy - 4} Q ${(gx + tx) / 2 + 10} ${Math.min(gy, ty2) - 38} ${tx} ${ty2}`}
        fill="none"
        stroke="#ece6d9"
        strokeWidth="2.5"
        strokeDasharray="6 6"
        strokeLinecap="round"
      />
      <circle
        cx={tx}
        cy={ty2}
        r="8"
        fill="#34d399"
        stroke="#0e1a24"
        strokeWidth="3"
      />
      <path
        d={`M${gx} ${gy} c-7 -10 -12 -16 -12 -23 a12 12 0 1 1 24 0 c0 7 -5 13 -12 23z`}
        fill="#f97316"
      />
      <circle cx={gx} cy={gy - 23} r="4.5" fill="#1c0a02" />
    </>
  );
}

/** Taglio: a real country, its cities, and the one straight cut. */
function GeoSliceArt() {
  // Cut through Italy from north-west to south-east, as the game draws it.
  const ax = 70,
    ay = 300,
    bx = 345,
    by = 95;
  const sideA = (x: number, y: number) =>
    (bx - ax) * (y - ay) - (by - ay) * (x - ax) < 0;
  const maxPop = Math.max(...COVER_CITIES.map((c) => c[2]));
  return (
    <>
      <Grid step={25} stroke="rgba(148,163,184,0.06)" />
      {/* The whole country inside the band a landscape cover shows. */}
      <g transform="translate(200 200) scale(0.62) translate(-200 -200)">
        <defs>
          <clipPath id="cv-gs-land">
            <path d={COVER_OUTLINE} />
          </clipPath>
        </defs>
        <path
          d={COVER_OUTLINE}
          fill="#111b2f"
          stroke="#3a4b6b"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <g clipPath="url(#cv-gs-land)" opacity="0.22">
          <polygon
            points={`${ax - 400},${ay + 300} ${bx + 400},${by - 300} -400,-400`}
            fill="#22d3ee"
          />
          <polygon
            points={`${ax - 400},${ay + 300} ${bx + 400},${by - 300} 800,800`}
            fill="#fb923c"
          />
        </g>
        {COVER_CITIES.map(([x, y, pop], i) => {
          const r = 3 + Math.sqrt(pop / maxPop) * 9;
          const c = sideA(x, y) ? "#22d3ee" : "#fb923c";
          return (
            <g key={i} fill={c}>
              <circle cx={x} cy={y} r={r * 2.1} opacity="0.2" />
              <circle cx={x} cy={y} r={r} stroke="#060b16" strokeWidth="2" />
            </g>
          );
        })}
        <line
          x1={ax - 60}
          y1={ay + 45}
          x2={bx + 60}
          y2={by - 45}
          stroke="#f8fafc"
          strokeWidth="3"
        />
        <rect
          x={(ax + bx) / 2 - 7}
          y={(ay + by) / 2 - 7}
          width="14"
          height="14"
          fill="#f8fafc"
          transform={`rotate(45 ${(ax + bx) / 2} ${(ay + by) / 2})`}
        />
      </g>
    </>
  );
}

/** Epoche: the timeline, the amber trap and the needle of the true year. */
function GazillionArt() {
  const stars = scatter(26, 3);
  return (
    <>
      <defs>
        <linearGradient id="cv-gz" x1="0" y1="0" x2="1" y2="1">
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
        y1="118"
        x2="218"
        y2="215"
        stroke="#4ade80"
        strokeWidth="3"
      />
      <circle cx="218" cy="115" r="7" fill="#4ade80" />
    </>
  );
}

/** Stima: an order of magnitude, the ruler of powers of ten, guess and truth. */
function EstimaniaArt() {
  const x = (i: number) => 52 + i * 37;
  return (
    <>
      <text
        x="200"
        y="182"
        textAnchor="middle"
        fontFamily="Fraunces, Georgia, serif"
        fontSize="112"
        fontWeight="600"
        fill="#2dd4bf"
      >
        10
        <tspan fontSize="58" dy="-50">
          6
        </tspan>
      </text>
      <line
        x1="40"
        y1="250"
        x2="360"
        y2="250"
        stroke="#f1ebdf"
        strokeWidth="2"
      />
      {Array.from({ length: 9 }, (_, i) => (
        <line
          key={i}
          x1={x(i)}
          y1="242"
          x2={x(i)}
          y2="258"
          stroke="#f1ebdf"
          strokeWidth="1.5"
          opacity={0.75}
        />
      ))}
      {/* The guess, one power of ten from the truth. */}
      <path d={`M${x(6)} 236 l10 -15 h-20z`} fill="#fbbf24" />
      <circle cx={x(5) + 6} cy="270" r="7" fill="#4ade80" />
      <path
        d={`M${x(5) + 6} 282 v8 h${x(6) - x(5) - 6} v-8`}
        fill="none"
        stroke="#aaa294"
        strokeWidth="1.5"
      />
    </>
  );
}

/** Quota: altitude climbing in steps toward the mission line. */
function PlainArt() {
  return (
    <>
      <line
        x1="40"
        y1="95"
        x2="340"
        y2="95"
        stroke="#d2fa4b"
        strokeOpacity="0.45"
        strokeDasharray="4 7"
      />
      <path
        d="M45 300 H105 V268 H165 V236 H225 V178 H285 V128 H330"
        fill="none"
        stroke="#d2fa4b"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M332 128 l22 -9 l-6 9 l6 9z" fill="#d2fa4b" />
      <line
        x1="372"
        y1="60"
        x2="372"
        y2="330"
        stroke="rgba(243,245,249,0.16)"
        strokeWidth="2"
      />
      {[95, 150, 210, 270].map((y) => (
        <line
          key={y}
          x1="364"
          y1={y}
          x2="372"
          y2={y}
          stroke="rgba(243,245,249,0.3)"
        />
      ))}
    </>
  );
}

/** Abissi: the rarer the answer, the deeper the dive. */
function KrillionArt() {
  // Three answers: common near the surface, rare in the deep. Narrower bar,
  // rarer answer; the diver sits beside the rarest.
  const answers = [
    { y: 112, w: 150, o: 0.35 },
    { y: 172, w: 96, o: 0.55 },
    { y: 236, w: 46, o: 1 },
  ];
  return (
    <>
      <defs>
        <linearGradient id="cv-kr" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b3a5b" />
          <stop offset="0.4" stopColor="#06182a" />
          <stop offset="1" stopColor="#020409" />
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#cv-kr)" />
      <line
        x1="72"
        y1="60"
        x2="72"
        y2="330"
        stroke="rgba(56,189,248,0.3)"
        strokeWidth="2"
      />
      {Array.from({ length: 7 }, (_, i) => (
        <line
          key={i}
          x1="64"
          y1={78 + i * 40}
          x2="80"
          y2={78 + i * 40}
          stroke="rgba(56,189,248,0.45)"
        />
      ))}
      {answers.map((a) => (
        <rect
          key={a.y}
          x="104"
          y={a.y - 7}
          width={a.w}
          height="14"
          fill="#38bdf8"
          opacity={a.o}
        />
      ))}
      <line
        x1="232"
        y1="40"
        x2="232"
        y2="214"
        stroke="#38bdf8"
        strokeWidth="2"
        strokeDasharray="2 7"
      />
      <circle
        cx="232"
        cy="236"
        r="44"
        fill="none"
        stroke="#38bdf8"
        opacity="0.18"
      />
      <circle
        cx="232"
        cy="236"
        r="26"
        fill="none"
        stroke="#38bdf8"
        opacity="0.38"
      />
      <rect
        x="221"
        y="225"
        width="22"
        height="22"
        fill="#e8f1ff"
        transform="rotate(45 232 236)"
      />
    </>
  );
}

/** In Scala: the reference on the baseline, and the target being resized. */
function SizeItUpArt() {
  return (
    <>
      <Grid step={20} stroke="rgba(185,169,144,0.1)" />
      {/* Reference: a person, to scale with the lighthouse beside it. */}
      <g fill="#93a9f0">
        <circle cx="122" cy="183" r="11" />
        <path d="M107 199 h30 l-4 36 h-4 l-1 20 h-12 l-1 -20 h-4z" />
      </g>
      {/* Target, with its previous size as a ghost: the scale is moving. */}
      <path
        d="M236 255 h36 l-6 -70 h-24z M242 185 v-11 h18 v11z M239 174 l12 -12 l12 12z"
        fill="none"
        stroke="#f2765c"
        strokeOpacity="0.4"
        strokeWidth="2"
        strokeDasharray="5 5"
      />
      <path
        d="M220 255 h68 l-10 -118 h-48z M231 137 v-18 h46 v18z M226 119 l28 -26 l28 26z"
        fill="#f2765c"
      />
      <circle
        cx="296"
        cy="100"
        r="10"
        fill="#f2765c"
        stroke="#1f1a14"
        strokeWidth="4"
      />
      <path
        d="M322 112 v-34 m-7 7 l7 -7 l7 7"
        fill="none"
        stroke="#f2e8d7"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="0"
        y1="255"
        x2="400"
        y2="255"
        stroke="#93a9f0"
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
