import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ShareButton } from "@/games/shared/ShareButton";
import { buildShareText } from "@/games/shared/share";
import { plainAnswers } from "./answers";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  Plane,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  MAX_CLIMB_PER_ROUND,
  MISSION_ALTITUDE,
  plainEngine,
  ROUNDS_PER_SESSION,
  type PlainSessionData,
} from "./engine";
import { plainGenerator } from "./generator";
import type { PlainDirection, PlainOutcome, PlainState } from "./types";
import "./plain.css";
import type { GamePlayProps } from "@/games/playable";
import { ModeTabs } from "@/games/shared/ModeTabs";
import { RulesDialog } from "@/games/shared/RulesDialog";
import {
  dailyNumber,
  useDailyLock,
  useMute,
  usePersistResult,
  type PlayContext,
} from "@/games/shared/session";
import { useGameMode } from "@/games/shared/useGameMode";
import { CountUp } from "@/components/ui/CountUp";
import { formatDayLong } from "@/lib/formatDate";
import { parseItalianNumber } from "@/lib/italianNumber";
import { playMiss, playSuccess } from "@/lib/sound";
import type { GameLevel } from "@/types/game";

const EPOCH = "2026-10-27";
/** The rail tops out at the most a session can climb. */
const RAIL_TOP = ROUNDS_PER_SESSION * MAX_CLIMB_PER_ROUND;

const OUTCOME: Record<Exclude<PlainOutcome, "none">, string> = {
  bullseye: "In pieno",
  close: "Vicino",
  miss: "Lontano",
};
const DIRECTION: Record<Exclude<PlainDirection, "none">, string> = {
  under: "sotto",
  over: "sopra",
  exact: "esatto",
};

const fmt = (n: number) =>
  n.toLocaleString("it-IT", { maximumFractionDigits: 2 });
const pad2 = (n: number) => String(n).padStart(2, "0");

interface Reveal {
  question: string;
  unit: string;
  answer: number;
  guess: number | null;
  climb: number;
  pct: number;
  direction: PlainDirection;
  outcome: PlainOutcome;
  note?: string;
}

type Phase = "intro" | "playing" | "finished";

/**
 * Plain — «Il volo notturno».
 *
 * Minimal, but not empty: the question set very large on the left, a single
 * field under it, and an altitude rail running the full height on the right
 * where the plane climbs. Nothing is boxed; space does the separating.
 */
export function PlainGame({
  mode,
  seed,
  dailyDate,
  context,
  onRestart,
}: GamePlayProps) {
  const level = useMemo<GameLevel<PlainSessionData>>(
    () => plainGenerator.generate(seed),
    [seed],
  );

  const [state, setState] = useState<PlainState>(() => plainEngine.init(level));
  const [phase, setPhase] = useState<Phase>("intro");
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [text, setText] = useState("");
  const [rulesOpen, setRulesOpen] = useState(false);
  const [muted, toggleMute] = useMute();
  const lock = useDailyLock("plain", mode, dailyDate);

  const result = plainEngine.getResult(state);
  usePersistResult({
    gameId: "plain",
    mode,
    dailyDate,
    levelId: level.id,
    finished: phase === "finished",
    skip: lock.alreadyPlayed,
    result,
    answers: plainAnswers(state),
    generatorVersion: level.generatorVersion,
  });

  useEffect(() => {
    if (lock.alreadyPlayed) setPhase("finished");
  }, [lock.alreadyPlayed]);

  const current = state.rounds[state.current];
  const parsed = parseItalianNumber(text);
  const valid = parsed !== null;
  const altitude = result.score;

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!valid || reveal || !current) return;
    const next = plainEngine.applyMove(state, {
      type: "submit",
      value: parsed,
    });
    const played = next.rounds[state.current];
    setReveal({
      question: played.data.question,
      unit: played.data.unit,
      answer: played.data.answer,
      guess: parsed,
      climb: played.climb,
      pct: played.pct,
      direction: played.direction,
      outcome: played.outcome,
      note: played.data.note,
    });
    setState(next);
    if (!muted) (played.outcome === "miss" ? playMiss : playSuccess)();
  }

  function pass() {
    if (reveal || !current) return;
    const played = state.rounds[state.current];
    const next = plainEngine.applyMove(state, { type: "pass" });
    setReveal({
      question: played.data.question,
      unit: played.data.unit,
      answer: played.data.answer,
      guess: null,
      climb: 0,
      pct: 0,
      direction: "none",
      outcome: "miss",
      note: played.data.note,
    });
    setState(next);
    if (!muted) playMiss();
  }

  function advance() {
    setReveal(null);
    setText("");
    if (state.finished) setPhase("finished");
  }

  // Enter moves on from a reveal, as it confirms an answer.
  useEffect(() => {
    if (!reveal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const shownAltitude =
    lock.alreadyPlayed && lock.storedScore !== null
      ? lock.storedScore
      : altitude;
  const roundNo = reveal ? state.current : state.current + 1;

  return (
    <div className="pl game-viewport grid grid-cols-[minmax(0,1fr)_4.5rem] sm:grid-cols-[minmax(0,1fr)_8rem]">
      <div className="flex min-w-0 flex-col">
        <header className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 pt-5 sm:px-12 sm:pt-8">
          <ContextLink context={context} />
          <h1 className="text-lg font-semibold tracking-tight">Quota</h1>
          <ContextControl context={context} mode={mode} dailyDate={dailyDate} />
          <div className="ml-auto flex items-center gap-1">
            {phase === "playing" && (
              <span
                className="pl-mono mr-2 text-sm"
                style={{ color: "var(--pl-muted)" }}
              >
                {pad2(Math.min(roundNo, state.rounds.length))} /{" "}
                {pad2(state.rounds.length)}
              </span>
            )}
            <button
              type="button"
              className="pl-icon"
              onClick={() => setRulesOpen(true)}
              aria-label="Come si gioca"
              title="Come si gioca"
            >
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="pl-icon"
              onClick={toggleMute}
              aria-label={muted ? "Attiva l'audio" : "Disattiva l'audio"}
              aria-pressed={muted}
            >
              {muted ? (
                <VolumeX className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Volume2 className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </header>

        <div className="safe-bottom flex flex-1 flex-col justify-center px-5 py-10 sm:px-12">
          {phase === "intro" && (
            <section aria-labelledby="pl-intro" className="max-w-4xl">
              <p className="pl-label">
                {mode === "daily" && dailyDate
                  ? `volo del giorno · ${pad2(dailyNumber(dailyDate, EPOCH))}`
                  : "volo d'allenamento"}
              </p>
              <h2
                id="pl-intro"
                className="mt-4 text-[clamp(2.75rem,8vw,6rem)] font-semibold leading-[0.95] tracking-[-0.045em]"
              >
                Sali fino a{" "}
                <span style={{ color: "var(--pl-lime)" }}>
                  {fmt(MISSION_ALTITUDE)} m
                </span>
                .
              </h2>
              <p
                className="mt-6 max-w-lg text-lg"
                style={{ color: "var(--pl-muted)" }}
              >
                {ROUNDS_PER_SESSION} domande, ognuna una misura. Più ti avvicini
                al valore vero, più l&apos;aereo sale: fino a{" "}
                {fmt(MAX_CLIMB_PER_ROUND)} m a risposta.
              </p>
              <button
                type="button"
                onClick={() => setPhase("playing")}
                className="pl-btn mt-10"
              >
                <Plane className="h-4 w-4 -rotate-45" aria-hidden="true" />
                Decolla
              </button>
            </section>
          )}

          {phase === "playing" && (
            <section
              aria-labelledby="pl-q"
              aria-live="polite"
              className="max-w-5xl"
            >
              <h2
                id="pl-q"
                className="text-[clamp(1.9rem,5vw,4.25rem)] font-semibold leading-[1.02] tracking-[-0.04em]"
              >
                {reveal ? reveal.question : current.data.question}
              </h2>

              {reveal ? (
                <Readout
                  reveal={reveal}
                  isLast={state.finished}
                  onNext={advance}
                />
              ) : (
                <form onSubmit={submit} className="mt-10 max-w-2xl">
                  <label htmlFor="pl-guess" className="sr-only">
                    La tua risposta in {current.data.unit}
                  </label>
                  <div className="flex items-baseline gap-3">
                    <input
                      id="pl-guess"
                      className="pl-field"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      aria-invalid={text !== "" && !valid}
                      aria-describedby="pl-hint"
                      autoFocus
                    />
                    <span
                      className="pl-mono text-2xl"
                      style={{ color: "var(--pl-muted)" }}
                    >
                      {current.data.unit}
                    </span>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button type="submit" disabled={!valid} className="pl-btn">
                      Conferma
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={pass}
                      className="pl-btn pl-btn-text"
                    >
                      Salta
                    </button>
                    <p id="pl-hint" className="pl-label ml-auto">
                      {text !== "" && !valid
                        ? "numero non leggibile"
                        : "invio per confermare"}
                    </p>
                  </div>
                </form>
              )}
            </section>
          )}

          {phase === "finished" && (
            <FlightLog
              state={state}
              altitude={shownAltitude}
              alreadyPlayed={lock.alreadyPlayed}
              mode={mode}
              dailyDate={dailyDate}
              context={context}
              onRestart={onRestart}
            />
          )}
        </div>
      </div>

      <AltitudeRail altitude={phase === "intro" ? 0 : shownAltitude} />

      <RulesDialog
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        title="Come si gioca a Quota"
        className="pl-dialog"
        titleClassName="text-xl font-semibold tracking-tight"
        closeClassName="pl-btn mt-6 w-full"
      >
        <div
          className="mt-4 space-y-3 text-sm leading-relaxed"
          style={{ color: "var(--pl-muted)" }}
        >
          <p>
            {ROUNDS_PER_SESSION} domande, ognuna con una misura da indovinare:
            un&apos;altezza, una distanza, un peso.
          </p>
          <p>
            Ogni risposta fa salire l&apos;aereo: esatta vale{" "}
            {fmt(MAX_CLIMB_PER_ROUND)} m, poi la salita cala con l&apos;errore
            in percentuale, sia sopra sia sotto. La missione è arrivare a{" "}
            {fmt(MISSION_ALTITUDE)} m.
          </p>
          <p>Scrivi i numeri come al solito — 1.200 o 2,5 — e premi Invio.</p>
        </div>
      </RulesDialog>
    </div>
  );
}

function ContextLink({ context }: { context?: PlayContext }) {
  const archive = context?.kind === "archive";
  return (
    <Link
      to={archive ? context.backTo : "/games"}
      className="pl-label inline-flex min-h-9 items-center gap-1 hover:text-[var(--pl-text)]"
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
      {archive ? "archivio" : "giochi"}
    </Link>
  );
}

function ContextControl({
  context,
  mode,
  dailyDate,
}: {
  context?: PlayContext;
  mode: GamePlayProps["mode"];
  dailyDate?: string;
}) {
  if (context?.kind === "modes")
    return (
      <ModeTabs
        value={context.mode}
        onChange={context.onModeChange}
        className="inline-flex gap-1"
        tabClassName={() => "pl-tab"}
      />
    );
  if (context?.kind === "archive")
    return (
      <p className="pl-label">
        archivio · {formatDayLong(context.date).toLowerCase()} · fuori serie
      </p>
    );
  return (
    <p className="pl-label">
      {mode === "daily" && dailyDate
        ? `volo ${pad2(dailyNumber(dailyDate, EPOCH))}`
        : "allenamento"}
    </p>
  );
}

function Readout({
  reveal,
  isLast,
  onNext,
}: {
  reveal: Reveal;
  isLast: boolean;
  onNext: () => void;
}) {
  return (
    <div className="pl-rise mt-10 max-w-3xl">
      <dl className="grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-3">
        <div>
          <dt className="pl-label">valore vero</dt>
          <dd
            className="mt-1 text-[clamp(2.25rem,6vw,4rem)] font-semibold leading-none tracking-[-0.04em]"
            style={{ color: "var(--pl-lime)" }}
          >
            {fmt(reveal.answer)}
            <span
              className="pl-mono ml-2 text-xl"
              style={{ color: "var(--pl-muted)" }}
            >
              {reveal.unit}
            </span>
          </dd>
        </div>
        <div>
          <dt className="pl-label">la tua risposta</dt>
          <dd className="mt-1 text-[clamp(2.25rem,6vw,4rem)] font-semibold leading-none tracking-[-0.04em]">
            {reveal.guess === null ? "—" : fmt(reveal.guess)}
          </dd>
        </div>
        <div>
          <dt className="pl-label">quota guadagnata</dt>
          <dd className="pl-mono mt-1 text-[clamp(2.25rem,6vw,4rem)] font-semibold leading-none">
            +<CountUp value={reveal.climb} />
            <span className="ml-1 text-xl" style={{ color: "var(--pl-muted)" }}>
              m
            </span>
          </dd>
        </div>
      </dl>
      <p className="mt-6 text-lg">
        {reveal.guess === null
          ? "Domanda saltata."
          : reveal.direction === "exact"
            ? "Esatto."
            : `${OUTCOME[reveal.outcome as Exclude<PlainOutcome, "none">]} — ${reveal.pct}% ${DIRECTION[reveal.direction as Exclude<PlainDirection, "none">]}.`}
      </p>
      {reveal.note && (
        <p className="mt-2 max-w-xl" style={{ color: "var(--pl-muted)" }}>
          {reveal.note}
        </p>
      )}
      <button type="button" onClick={onNext} className="pl-btn mt-8">
        {isLast ? "Atterra" : "Avanti"}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * The full-height altitude rail. The plane sits at the altitude reached; a
 * lime trail runs up to it; the mission line marks 5000 m.
 */
function AltitudeRail({ altitude }: { altitude: number }) {
  const y = (a: number) => `${Math.max(0, Math.min(1, a / RAIL_TOP)) * 100}%`;
  const marks = Array.from({ length: RAIL_TOP / 1000 + 1 }, (_, i) => i * 1000);
  const reached = altitude >= MISSION_ALTITUDE;
  return (
    <aside
      aria-label={`Quota ${fmt(altitude)} metri su ${fmt(MISSION_ALTITUDE)}`}
      // Pinned to the viewport: the rail is the instrument, and it must stay
      // in sight when the results run longer than one screen.
      className="sticky top-[var(--nav-h)] h-[calc(100dvh-var(--nav-h))] self-start border-l border-[var(--pl-line)]"
    >
      <div className="absolute inset-x-0 bottom-16 top-24 sm:top-28">
        {marks.map((m) => (
          <div
            key={m}
            aria-hidden="true"
            className="absolute inset-x-0 flex items-center gap-1.5"
            style={{ bottom: y(m) }}
          >
            <span
              className="h-px w-2.5"
              style={{ background: "var(--pl-line)" }}
            />
            <span
              className="pl-mono text-[10px] sm:text-[11px]"
              style={{ color: "var(--pl-muted)" }}
            >
              {m === 0 ? "0" : `${m / 1000}k`}
            </span>
          </div>
        ))}
        {/* Mission line. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 border-t border-dashed"
          style={{ bottom: y(MISSION_ALTITUDE), borderColor: "var(--pl-lime)" }}
        >
          <span
            className="pl-mono absolute -top-5 right-1.5 hidden text-[10px] sm:inline"
            style={{ color: "var(--pl-lime)" }}
          >
            missione
          </span>
        </div>
        {/* Trail and plane. */}
        <span
          aria-hidden="true"
          className="pl-trail absolute bottom-0 left-1/2 w-0.5 -translate-x-1/2"
          style={{ height: y(altitude), background: "var(--pl-lime)" }}
        />
        <span
          aria-hidden="true"
          className="pl-plane absolute left-1/2 grid h-9 w-9 -translate-x-1/2 translate-y-1/2 place-items-center rounded-full"
          style={{
            bottom: y(altitude),
            background: reached ? "var(--pl-lime)" : "var(--pl-night)",
            border: "1px solid var(--pl-lime)",
          }}
        >
          <Plane
            className="h-4 w-4 -rotate-45"
            style={{ color: reached ? "var(--pl-lime-ink)" : "var(--pl-lime)" }}
          />
        </span>
      </div>
      <p
        className="pl-mono absolute inset-x-0 bottom-3 text-center text-xs sm:text-sm"
        aria-hidden="true"
      >
        <CountUp value={Math.round(altitude)} /> m
      </p>
    </aside>
  );
}

/** Results: the flight profile, round by round, against the mission line. */
function FlightLog({
  state,
  altitude,
  alreadyPlayed,
  mode,
  dailyDate,
  context,
  onRestart,
}: {
  state: PlainState;
  altitude: number;
  alreadyPlayed: boolean;
  mode: GamePlayProps["mode"];
  dailyDate?: string;
  context?: PlayContext;
  onRestart?: () => void;
}) {
  const reached = altitude >= MISSION_ALTITUDE;
  const archive = context?.kind === "archive";
  let sum = 0;
  const points = [0, ...state.rounds.map((r) => (sum += r.climb))];
  const W = 700;
  const H = 220;
  const x = (i: number) => (i / state.rounds.length) * W;
  const yy = (a: number) => H - (a / RAIL_TOP) * H;
  const path = points
    .map(
      (a, i) =>
        `${i ? "H" : "M"}${x(i).toFixed(1)}${i ? ` V${yy(a).toFixed(1)}` : ` ${yy(a).toFixed(1)}`}`,
    )
    .join(" ");

  return (
    <section aria-labelledby="pl-log" className="max-w-5xl">
      <p className="pl-label">
        {mode === "daily" && dailyDate
          ? `volo ${pad2(dailyNumber(dailyDate, EPOCH))} · atterrato`
          : "allenamento · atterrato"}
      </p>
      <h2
        id="pl-log"
        className="mt-3 text-[clamp(2.5rem,7vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.045em]"
      >
        {reached ? "Missione compiuta." : "Missione non compiuta."}
      </h2>
      <p className="pl-mono mt-4 text-3xl" style={{ color: "var(--pl-lime)" }}>
        <CountUp value={altitude} /> m
        <span className="ml-2 text-base" style={{ color: "var(--pl-muted)" }}>
          su {fmt(MISSION_ALTITUDE)} m
        </span>
      </p>
      <p className="sr-only">
        {mode === "daily"
          ? "Sfida di oggi completata."
          : "Allenamento completato."}
      </p>

      {alreadyPlayed ? (
        <p className="mt-6 text-lg" style={{ color: "var(--pl-muted)" }}>
          Hai già giocato la sfida di oggi: conta una volta sola.
        </p>
      ) : (
        <>
          <figure className="mt-10">
            <svg
              viewBox={`-8 -14 ${W + 16} ${H + 34}`}
              className="h-auto w-full"
              role="img"
              aria-label={`Profilo di volo: ${points
                .slice(1)
                .map((a, i) => `domanda ${i + 1}, ${a} metri`)
                .join("; ")}`}
            >
              <line
                x1={0}
                x2={W}
                y1={yy(MISSION_ALTITUDE)}
                y2={yy(MISSION_ALTITUDE)}
                stroke="var(--pl-lime)"
                strokeDasharray="4 6"
                opacity={0.6}
              />
              <line x1={0} x2={W} y1={H} y2={H} stroke="var(--pl-line)" />
              <path
                d={path}
                fill="none"
                stroke="var(--pl-lime)"
                strokeWidth={2.5}
              />
              {points.slice(1).map((a, i) => (
                <g key={i}>
                  <circle
                    cx={x(i + 1)}
                    cy={yy(a)}
                    r={4}
                    fill="var(--pl-lime)"
                  />
                  <text
                    x={x(i + 1)}
                    y={H + 16}
                    textAnchor="middle"
                    fontSize={16}
                    fill="var(--pl-muted)"
                    className="pl-mono"
                  >
                    {pad2(i + 1)}
                  </text>
                </g>
              ))}
            </svg>
          </figure>
          <ol className="mt-8 grid gap-x-10 gap-y-3 sm:grid-cols-2">
            {state.rounds.map((r, i) => (
              <li key={i} className="flex items-baseline gap-3 text-sm">
                <span className="pl-mono" style={{ color: "var(--pl-muted)" }}>
                  {pad2(i + 1)}
                </span>
                <span className="min-w-0 flex-1">{r.data.question}</span>
                <span
                  className="pl-mono"
                  style={{
                    color: r.climb > 0 ? "var(--pl-lime)" : "var(--pl-muted)",
                  }}
                >
                  +{r.climb}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        {context?.kind !== "archive" && (
          <ShareButton
            className="pl-btn pl-btn-text"
            text={buildShareText({
              gameId: "plain",
              number:
                mode === "daily" && dailyDate
                  ? dailyNumber(dailyDate, EPOCH)
                  : null,
              // After a reload only the stored score is known, not the rounds.
              ratios: alreadyPlayed
                ? undefined
                : state.rounds.map((r) => r.climb / 1000),
              scoreText: `${altitude.toLocaleString("it-IT")} m di quota`,
            })}
          />
        )}
        {mode === "practice" && onRestart && !archive && (
          <button type="button" onClick={onRestart} className="pl-btn">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Nuovo volo
          </button>
        )}
        <Link
          to={archive ? context.backTo : "/games"}
          className="pl-btn pl-btn-text"
        >
          {archive ? "Torna all'archivio" : "Tutti i giochi"}
        </Link>
      </div>
    </section>
  );
}

/** The Plain page: the game owns the whole viewport. */
export function PlainPlayPage() {
  const { board, context, restart } = useGameMode();
  return (
    <PlainGame
      key={board.key}
      mode={board.mode}
      seed={board.seed}
      dailyDate={board.dailyDate}
      context={context}
      onRestart={restart}
    />
  );
}
