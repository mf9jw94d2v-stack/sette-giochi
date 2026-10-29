import { useEffect, useMemo, useState } from "react";
import { factAnswers } from "./answers";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Compass,
  HelpCircle,
  Lightbulb,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  BULLSEYE_KM,
  CLOSE_KM,
  factEngine,
  HINT_CAP,
  MAX_POINTS_PER_ROUND,
  ROUNDS_PER_SESSION,
  type FactSessionData,
} from "./engine";
import { factGenerator } from "./generator";
import { greatCircle, pathOf, px, py } from "./geo";
import type { FactGuess, FactLevelData, FactState } from "./types";
import { Pin, WorldMap, type MapFocus } from "./components/WorldMap";
import "./fact-map.css";
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
import { playMiss, playSuccess } from "@/lib/sound";
import type { GameLevel } from "@/types/game";

const EPOCH = "2026-10-27";
const MAX_SCORE = ROUNDS_PER_SESSION * MAX_POINTS_PER_ROUND;

const AIM_LABEL: Record<FactLevelData["aim"], string> = {
  città: "Punta a una città",
  sito: "Punta a un luogo preciso",
  regione: "Punta a una regione",
  paese: "Punta a un paese",
};

function fmtKm(d: number): string {
  if (!Number.isFinite(d)) return "—";
  if (d < 10) return `${d.toFixed(1)} km`;
  return `${Math.round(d).toLocaleString("it-IT")} km`;
}

interface Reveal {
  place: FactLevelData;
  guess: FactGuess | null;
  distanceKm: number;
  points: number;
}

type Phase = "intro" | "playing" | "finished";

/**
 * Fact Map — «L'atlante».
 *
 * The map is the page. Everything else — the round's clue, the score, the
 * actions — floats over it on atlas panels, as on the original, so the
 * thing the player is actually looking at is never squeezed into a box.
 */
export function FactMapGame({
  mode,
  seed,
  dailyDate,
  context,
  onRestart,
}: GamePlayProps) {
  const level = useMemo<GameLevel<FactSessionData>>(
    () => factGenerator.generate(seed),
    [seed],
  );

  const [state, setState] = useState<FactState>(() => factEngine.init(level));
  const [phase, setPhase] = useState<Phase>("intro");
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [guess, setGuess] = useState<FactGuess | null>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [rings, setRings] = useState<[number, number][][] | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [muted, toggleMute] = useMute();
  const lock = useDailyLock("fact-map", mode, dailyDate);

  const result = factEngine.getResult(state);
  usePersistResult({
    gameId: "fact-map",
    mode,
    dailyDate,
    levelId: level.id,
    finished: phase === "finished",
    skip: lock.alreadyPlayed,
    result,
    answers: factAnswers(state),
    generatorVersion: level.generatorVersion,
  });

  useEffect(() => {
    if (lock.alreadyPlayed) setPhase("finished");
  }, [lock.alreadyPlayed]);

  // The world geometry (~127 KB) loads only when this game is opened.
  useEffect(() => {
    let active = true;
    void import("./data/world").then((m) => {
      if (active) setRings(m.WORLD_RINGS);
    });
    return () => {
      active = false;
    };
  }, []);

  const landPath = useMemo(() => {
    if (!rings) return null;
    let d = "";
    for (const ring of rings) {
      ring.forEach(([lon, lat], i) => {
        d += `${i ? "L" : "M"}${px(lon).toFixed(1)} ${py(lat).toFixed(1)} `;
      });
      d += "Z";
    }
    return d;
  }, [rings]);

  useEffect(() => {
    setGuess(null);
    setHintUsed(false);
  }, [state.current]);

  const current = state.rounds[state.current];

  function submit() {
    if (!guess || reveal) return;
    const next = factEngine.applyMove(state, {
      type: "submit",
      lat: guess.lat,
      lon: guess.lon,
      hintUsed,
    });
    const r = next.rounds[state.current];
    setReveal({
      place: current.data,
      guess,
      distanceKm: r.distanceKm,
      points: r.points,
    });
    setState(next);
    if (!muted) (r.distanceKm <= CLOSE_KM ? playSuccess : playMiss)();
  }

  function pass() {
    if (reveal) return;
    const played = state.rounds[state.current];
    const next = factEngine.applyMove(state, { type: "pass" });
    setReveal({
      place: played.data,
      guess: null,
      distanceKm: Infinity,
      points: 0,
    });
    setState(next);
    if (!muted) playMiss();
  }

  function advance() {
    setReveal(null);
    if (state.finished) setPhase("finished");
  }

  // ---- what the map shows, per phase -------------------------------------
  // The reveal card covers the lower part of the screen, more of it on a
  // phone, so the framing keeps the guess and the answer above it.
  const wide = typeof window !== "undefined" && window.innerWidth >= 640;
  const focus: MapFocus =
    phase === "playing" && reveal
      ? {
          key: `reveal-${state.current}`,
          safe: wide ? { top: 0.12, bottom: 0.34 } : { top: 0.2, bottom: 0.5 },
          points: [
            [reveal.place.lon, reveal.place.lat],
            ...(reveal.guess
              ? [[reveal.guess.lon, reveal.guess.lat] as [number, number]]
              : []),
          ],
        }
      : phase === "finished" && !lock.alreadyPlayed
        ? {
            // The diary sits on the left (desktop) or the bottom (phone):
            // frame every stop in the part of the map left visible.
            key: "journal",
            safe: wide
              ? {
                  top: 0.1,
                  bottom: 0.06,
                  left: Math.min(0.5, 412 / window.innerWidth),
                  right: 64 / window.innerWidth,
                }
              : { top: 0.16, bottom: 0.64 },
            points: state.rounds.flatMap((r) => [
              [r.data.lon, r.data.lat] as [number, number],
              ...(r.guess
                ? [[r.guess.lon, r.guess.lat] as [number, number]]
                : []),
            ]),
          }
        : { key: `world-${phase}-${state.current}`, points: [] };

  const score =
    lock.alreadyPlayed && lock.storedScore !== null
      ? lock.storedScore
      : result.score;

  return (
    <div className="fm game-viewport-fixed relative overflow-hidden">
      <WorldMap
        landPath={landPath}
        focus={focus}
        label={
          phase === "playing" && !reveal
            ? `Mappa del mondo: ${current.data.prompt}. Tocca per piazzare lo spillo.`
            : "Mappa del mondo"
        }
        onPick={
          phase === "playing" && !reveal
            ? (lon, lat) => setGuess({ lon, lat })
            : null
        }
      >
        {(u) => (
          <>
            {phase === "playing" && reveal && <Route reveal={reveal} u={u} />}
            {phase === "playing" && !reveal && guess && (
              <Pin
                lon={guess.lon}
                lat={guess.lat}
                u={u}
                color="var(--fm-accent)"
              />
            )}
            {phase === "finished" &&
              !lock.alreadyPlayed &&
              state.rounds.map((r, i) =>
                r.guess ? (
                  <g key={i}>
                    {greatCircle(r.guess, r.data).map((seg, j) => (
                      <path
                        key={j}
                        d={pathOf(seg)}
                        fill="none"
                        stroke="var(--fm-ink)"
                        strokeWidth={u * 1.4}
                        strokeDasharray={`${u * 4} ${u * 3}`}
                      />
                    ))}
                    <Pin
                      lon={r.guess.lon}
                      lat={r.guess.lat}
                      u={u}
                      color="var(--fm-accent)"
                    />
                    <Pin
                      lon={r.data.lon}
                      lat={r.data.lat}
                      u={u}
                      color="var(--fm-truth)"
                      label={String(i + 1)}
                    />
                  </g>
                ) : (
                  <Pin
                    key={i}
                    lon={r.data.lon}
                    lat={r.data.lat}
                    u={u}
                    color="var(--fm-truth)"
                    label={String(i + 1)}
                  />
                ),
              )}
          </>
        )}
      </WorldMap>

      {/* ── masthead + score: one top stack, in flow, so the two can never
            overlap however the header wraps on a narrow screen ── */}
      <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <header className="fm-panel pointer-events-auto flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2">
          <ContextLink context={context} />
          <h1 className="flex items-center gap-1.5 text-lg font-semibold tracking-tight">
            <Compass
              className="h-4 w-4"
              style={{ color: "var(--fm-accent)" }}
              aria-hidden="true"
            />
            Fact Map
          </h1>
          <ContextControl context={context} mode={mode} dailyDate={dailyDate} />
          <div className="ml-auto flex items-center gap-1 sm:ml-0">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded sm:h-9 sm:w-9"
              onClick={() => setRulesOpen(true)}
              aria-label="Come si gioca"
              title="Come si gioca"
            >
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded sm:h-9 sm:w-9"
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
        {phase === "playing" && (
          <ScoreStrip
            state={state}
            score={result.score}
            revealing={Boolean(reveal)}
          />
        )}
      </div>

      {phase === "intro" && (
        <IntroPlate
          mode={mode}
          dailyDate={dailyDate}
          onStart={() => setPhase("playing")}
        />
      )}

      {phase === "playing" && (
        <>
          {reveal ? (
            <RevealCard
              reveal={reveal}
              isLast={state.finished}
              onNext={advance}
            />
          ) : (
            <StopCard
              place={current.data}
              round={state.current + 1}
              total={state.rounds.length}
              guess={guess}
              hintUsed={hintUsed}
              onHint={() => setHintUsed(true)}
              onSubmit={submit}
              onPass={pass}
            />
          )}
        </>
      )}

      {phase === "finished" && (
        <Journal
          state={state}
          score={score}
          alreadyPlayed={lock.alreadyPlayed}
          mode={mode}
          dailyDate={dailyDate}
          onRestart={onRestart}
          context={context}
        />
      )}

      <RulesDialog
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        title="Come si gioca a Fact Map"
        className="fm-dialog"
        titleClassName="text-xl font-semibold"
        closeClassName="fm-btn mt-5 w-full"
      >
        <RulesList />
      </RulesDialog>
    </div>
  );
}

function RulesList() {
  return (
    <ol className="mt-4 space-y-3 text-sm leading-relaxed">
      <li>
        <span className="fm-label mr-2">1</span>
        Leggi l&apos;indizio della tappa: ti dice che cosa cercare e se puntare
        a una città, a un luogo preciso o a un paese.
      </li>
      <li>
        <span className="fm-label mr-2">2</span>
        Tocca la mappa per piazzare lo spillo. Trascina per spostarti, usa + e −
        (o la rotella) per avvicinarti.
      </li>
      <li>
        <span className="fm-label mr-2">3</span>
        Entro {BULLSEYE_KM} km dal punto giusto prendi {MAX_POINTS_PER_ROUND}{" "}
        punti, poi il punteggio scende con la distanza. L&apos;indizio aiuta, ma
        abbassa il massimo della tappa a {HINT_CAP}.
      </li>
      <li>
        <span className="fm-label mr-2">⌨</span>
        Da tastiera: le frecce spostano la mappa, + e − la avvicinano, Invio
        piazza lo spillo sul mirino al centro.
      </li>
    </ol>
  );
}

function ContextLink({ context }: { context?: PlayContext }) {
  const to = context?.kind === "archive" ? context.backTo : "/games";
  const label = context?.kind === "archive" ? "Archivio" : "Giochi";
  return (
    <Link
      to={to}
      className="fm-label inline-flex items-center gap-1 hover:text-[var(--fm-ink)]"
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
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
  if (context?.kind === "modes") {
    return (
      <ModeTabs
        value={context.mode}
        onChange={context.onModeChange}
        className="flex rounded-md border border-[var(--fm-rule)] p-0.5"
        tabClassName={() => "fm-tab"}
      />
    );
  }
  if (context?.kind === "archive") {
    return (
      <span className="fm-label first-letter:uppercase">
        Archivio · {formatDayLong(context.date)} · non conta per la serie
      </span>
    );
  }
  return (
    <span className="fm-label">
      {mode === "daily" && dailyDate
        ? `Tappa del giorno #${dailyNumber(dailyDate, EPOCH)}`
        : "Allenamento"}
    </span>
  );
}

/** Intro: an atlas title plate laid over the world, not a card in a void. */
function IntroPlate({
  mode,
  dailyDate,
  onStart,
}: {
  mode: GamePlayProps["mode"];
  dailyDate?: string;
  onStart: () => void;
}) {
  return (
    <section
      aria-labelledby="fm-intro-title"
      className="fm-panel absolute inset-x-3 bottom-3 max-h-[70%] overflow-y-auto p-5 sm:inset-x-auto sm:bottom-auto sm:left-3 sm:top-24 sm:w-[24rem] sm:p-6"
    >
      <p className="fm-label">
        {mode === "daily" && dailyDate
          ? `Viaggio del giorno #${dailyNumber(dailyDate, EPOCH)}`
          : "Viaggio d'allenamento"}{" "}
        · {ROUNDS_PER_SESSION} tappe
      </p>
      <h2
        id="fm-intro-title"
        className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
      >
        Dove nel mondo?
      </h2>
      <p className="mt-2 text-sm" style={{ color: "var(--fm-muted)" }}>
        Un fatto, un luogo. Pianta lo spillo il più vicino possibile: conta la
        distanza vera, sul globo.
      </p>
      <dl className="mt-5 grid grid-cols-3 border-y border-[var(--fm-rule)] py-3 text-center">
        <div>
          <dt className="fm-label">Tappe</dt>
          <dd className="mt-0.5 text-2xl font-semibold tabular-nums">
            {ROUNDS_PER_SESSION}
          </dd>
        </div>
        <div className="border-x border-[var(--fm-rule)]">
          <dt className="fm-label">Centro</dt>
          <dd className="mt-0.5 text-2xl font-semibold tabular-nums">
            {BULLSEYE_KM} km
          </dd>
        </div>
        <div>
          <dt className="fm-label">Massimo</dt>
          <dd className="mt-0.5 text-2xl font-semibold tabular-nums">
            {MAX_SCORE.toLocaleString("it-IT")}
          </dd>
        </div>
      </dl>
      <ul className="mt-4 space-y-1.5 text-sm">
        <li>Tocca per piantare lo spillo, trascina per spostarti.</li>
        <li>
          L&apos;indizio aiuta, ma la tappa vale al massimo {HINT_CAP} punti.
        </li>
      </ul>
      <button type="button" onClick={onStart} className="fm-btn mt-5 w-full">
        Inizia il viaggio
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </section>
  );
}

/** Top-right: total and five stage markers, the journey so far. */
function ScoreStrip({
  state,
  score,
  revealing,
}: {
  state: FactState;
  score: number;
  revealing: boolean;
}) {
  return (
    <div
      role="group"
      className="fm-panel pointer-events-auto flex items-center justify-between gap-3 self-end px-3 py-2"
      aria-label={`Punteggio ${score} su ${MAX_SCORE}`}
    >
      <ol className="flex gap-1.5" aria-label="Tappe">
        {state.rounds.map((r, i) => {
          const done = i < state.current;
          const active = i === state.current && !revealing;
          return (
            <li
              key={i}
              aria-label={`Tappa ${i + 1}${done ? `: ${r.points} punti` : ""}`}
              className="grid h-6 w-6 place-items-center rounded-full border text-[11px] font-semibold tabular-nums"
              style={{
                borderColor: active ? "var(--fm-ink)" : "var(--fm-rule)",
                background: done
                  ? r.points >= 500
                    ? "var(--fm-truth)"
                    : r.points > 0
                      ? "var(--fm-accent)"
                      : "var(--fm-rule)"
                  : "transparent",
                color: done ? "var(--fm-paper)" : "var(--fm-muted)",
              }}
            >
              {i + 1}
            </li>
          );
        })}
      </ol>
      <span className="text-xl font-semibold tabular-nums" aria-hidden="true">
        <CountUp value={score} />
      </span>
    </div>
  );
}

/** Bottom: the stop's clue and the actions, close to the thumb on a phone. */
function StopCard({
  place,
  round,
  total,
  guess,
  hintUsed,
  onHint,
  onSubmit,
  onPass,
}: {
  place: FactLevelData;
  round: number;
  total: number;
  guess: FactGuess | null;
  hintUsed: boolean;
  onHint: () => void;
  onSubmit: () => void;
  onPass: () => void;
}) {
  return (
    <section
      aria-labelledby="fm-stop"
      className="fm-panel safe-bottom absolute inset-x-3 bottom-3 p-4 sm:inset-x-auto sm:left-1/2 sm:w-[min(40rem,calc(100%-7rem))] sm:-translate-x-1/2"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="fm-label">
          Tappa {round} di {total} · {AIM_LABEL[place.aim]}
        </p>
        {place.hint && !hintUsed && (
          <button
            type="button"
            onClick={onHint}
            className="fm-label inline-flex min-h-9 items-center gap-1"
            style={{ color: "var(--fm-accent)" }}
          >
            <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
            Indizio
            <span className="sr-only sm:not-sr-only">(max {HINT_CAP})</span>
          </button>
        )}
      </div>
      <h2
        id="fm-stop"
        className="mt-1.5 text-lg font-semibold leading-snug sm:text-xl"
      >
        {place.prompt}
      </h2>
      {hintUsed && place.hint && (
        <p
          className="mt-2 flex gap-2 border-l-2 pl-3 text-sm"
          style={{ borderColor: "var(--fm-accent)", color: "var(--fm-muted)" }}
        >
          {place.hint}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p
          className="mr-auto text-sm"
          style={{ color: "var(--fm-muted)" }}
          aria-live="polite"
        >
          {guess
            ? `Spillo a ${Math.abs(guess.lat).toFixed(1)}° ${guess.lat >= 0 ? "N" : "S"}, ${Math.abs(guess.lon).toFixed(1)}° ${guess.lon >= 0 ? "E" : "O"} — puoi ancora spostarlo.`
            : "Tocca la mappa per piantare lo spillo."}
        </p>
        <button type="button" onClick={onPass} className="fm-btn fm-btn-quiet">
          Passa
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!guess}
          className="fm-btn"
        >
          Conferma lo spillo
        </button>
      </div>
    </section>
  );
}

/** The route drawn on the globe, from the pin to the real place. */
function Route({ reveal, u }: { reveal: Reveal; u: number }) {
  if (!reveal.guess)
    return (
      <Pin
        lon={reveal.place.lon}
        lat={reveal.place.lat}
        u={u}
        color="var(--fm-truth)"
      />
    );
  return (
    <>
      {greatCircle(reveal.guess, reveal.place).map((seg, i) => (
        <path
          key={i}
          d={pathOf(seg)}
          pathLength={1}
          className="fm-route"
          fill="none"
          stroke="var(--fm-ink)"
          strokeWidth={u * 1.8}
        />
      ))}
      <Pin
        lon={reveal.guess.lon}
        lat={reveal.guess.lat}
        u={u}
        color="var(--fm-accent)"
      />
      <Pin
        lon={reveal.place.lon}
        lat={reveal.place.lat}
        u={u}
        color="var(--fm-truth)"
      />
    </>
  );
}

function RevealCard({
  reveal,
  isLast,
  onNext,
}: {
  reveal: Reveal;
  isLast: boolean;
  onNext: () => void;
}) {
  const verdict = !reveal.guess
    ? "Tappa saltata"
    : reveal.distanceKm <= BULLSEYE_KM
      ? "Centrato"
      : reveal.distanceKm <= CLOSE_KM
        ? "Vicino"
        : "Lontano";
  return (
    <section
      aria-live="polite"
      aria-labelledby="fm-reveal"
      className="fm-panel safe-bottom absolute inset-x-3 bottom-3 p-4 sm:inset-x-auto sm:left-1/2 sm:w-[min(40rem,calc(100%-7rem))] sm:-translate-x-1/2"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="fm-label">{verdict}</p>
        <p
          className="text-2xl font-semibold tabular-nums"
          style={{ color: "var(--fm-accent)" }}
        >
          +<CountUp value={reveal.points} />
        </p>
      </div>
      <h2 id="fm-reveal" className="text-xl font-semibold">
        {reveal.place.label}
      </h2>
      <p className="mt-1 text-sm">
        {reveal.guess ? (
          <>
            Il tuo spillo era a <strong>{fmtKm(reveal.distanceKm)}</strong> —
            distanza misurata sul globo, lungo la linea tracciata.
          </>
        ) : (
          "Nessuno spillo per questa tappa."
        )}
      </p>
      {reveal.place.note && (
        <p
          className="mt-2 border-l-2 pl-3 text-sm"
          style={{ borderColor: "var(--fm-truth)", color: "var(--fm-muted)" }}
        >
          {reveal.place.note}
        </p>
      )}
      <div
        className="mt-3 flex items-center gap-4 text-xs"
        style={{ color: "var(--fm-muted)" }}
      >
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: "var(--fm-accent)" }}
          />
          Il tuo spillo
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: "var(--fm-truth)" }}
          />
          Il luogo giusto
        </span>
      </div>
      <button type="button" onClick={onNext} className="fm-btn mt-4 w-full">
        {isLast ? "Apri il diario di viaggio" : "Prossima tappa"}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </section>
  );
}

/** Results: every stop stays on the map; the journal lists them in order. */
function Journal({
  state,
  score,
  alreadyPlayed,
  mode,
  dailyDate,
  onRestart,
  context,
}: {
  state: FactState;
  score: number;
  alreadyPlayed: boolean;
  mode: GamePlayProps["mode"];
  dailyDate?: string;
  onRestart?: () => void;
  context?: PlayContext;
}) {
  const close = state.rounds.filter(
    (r) => r.guess !== null && r.distanceKm <= CLOSE_KM,
  ).length;
  return (
    <section
      aria-labelledby="fm-journal"
      className="fm-panel absolute inset-x-3 bottom-3 max-h-[62%] overflow-y-auto p-5 sm:inset-x-auto sm:bottom-3 sm:left-3 sm:top-24 sm:max-h-none sm:w-[24rem]"
    >
      <p className="fm-label flex items-center gap-1.5">
        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
        Diario di viaggio
      </p>
      <h2 id="fm-journal" className="mt-1 text-2xl font-semibold">
        {mode === "daily" && dailyDate
          ? `Viaggio #${dailyNumber(dailyDate, EPOCH)} concluso`
          : "Viaggio concluso"}
      </h2>
      <p
        className="mt-3 text-5xl font-semibold tabular-nums"
        style={{ color: "var(--fm-accent)" }}
      >
        <CountUp value={score} />
      </p>
      <p className="text-sm" style={{ color: "var(--fm-muted)" }}>
        su {MAX_SCORE.toLocaleString("it-IT")} punti
      </p>

      {alreadyPlayed ? (
        <p className="mt-4 text-sm">
          Hai già giocato la sfida di oggi: conta una volta sola. Il diario
          delle tappe resta sulla partita che hai giocato.
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm">
            {close} di {state.rounds.length} tappe entro {CLOSE_KM} km.
          </p>
          <ol className="mt-4 divide-y divide-[var(--fm-rule)] border-y border-[var(--fm-rule)]">
            {state.rounds.map((r, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5 text-sm">
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold"
                  style={{
                    background: "var(--fm-truth)",
                    color: "var(--fm-paper)",
                  }}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {r.data.label}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "var(--fm-muted)" }}
                  >
                    {r.guess ? fmtKm(r.distanceKm) : "saltata"}
                    {r.hintUsed ? " · con indizio" : ""}
                  </span>
                </span>
                <span className="font-semibold tabular-nums">{r.points}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {mode === "practice" && onRestart && context?.kind !== "archive" && (
          <button type="button" onClick={onRestart} className="fm-btn flex-1">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Nuovo viaggio
          </button>
        )}
        <Link
          to={context?.kind === "archive" ? context.backTo : "/games"}
          className="fm-btn fm-btn-quiet flex-1"
        >
          {context?.kind === "archive"
            ? "Torna all'archivio"
            : "Tutti i giochi"}
        </Link>
      </div>
    </section>
  );
}

/** The Fact Map page: the game owns the whole viewport. */
export function FactMapPlayPage() {
  const { board, context, restart } = useGameMode();
  return (
    <FactMapGame
      key={board.key}
      mode={board.mode}
      seed={board.seed}
      dailyDate={board.dailyDate}
      context={context}
      onRestart={restart}
    />
  );
}
