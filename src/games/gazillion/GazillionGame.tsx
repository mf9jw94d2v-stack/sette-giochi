import { useEffect, useMemo, useState } from "react";
import { ShareButton } from "@/games/shared/ShareButton";
import { buildShareText } from "@/games/shared/share";
import { gazillionAnswers } from "./answers";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  HelpCircle,
  Hourglass,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  gazillionEngine,
  MAX_POINTS_PER_ROUND,
  MIN_SPAN,
  ROUNDS_PER_SESSION,
  type GazillionSessionData,
} from "./engine";
import { gazillionGenerator } from "./generator";
import type { GazillionState } from "./types";
import { formatYear } from "./format";
import { clampYear, setEnd } from "./scale";
import { parseItalianNumber } from "@/lib/italianNumber";
import { TrapTimeline, type Trap } from "./components/TrapTimeline";
import "./gazillion.css";
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
import { playFanfare, playMiss, playSuccess } from "@/lib/sound";
import type { GameLevel } from "@/types/game";

const EPOCH = "2026-10-23"; // Gazillion daily #1 (matches the original's epoch)
const MUTE_KEY = "sgp:gazillion:muted";
const MAX_SCORE = ROUNDS_PER_SESSION * MAX_POINTS_PER_ROUND;
/** Where every round's trap starts: the same for all, so it hints nothing. */
const START_TRAP: Trap = { low: 1200, high: 1800 };

interface Reveal {
  prompt: string;
  category: string;
  year: number;
  points: number;
  trapped: boolean;
  trap: Trap | null;
}

type Phase = "intro" | "playing" | "finished";

/**
 * Gazillion — «Il viaggio nel tempo».
 *
 * Built in horizontal bands around a timeline that runs the full width of the
 * screen, as on the original. The event sits above it, the controls below;
 * the timeline itself is where the answer is given and where it is revealed.
 */
export function GazillionGame({
  mode,
  seed,
  dailyDate,
  context,
  onRestart,
}: GamePlayProps) {
  const level = useMemo<GameLevel<GazillionSessionData>>(
    () => gazillionGenerator.generate(seed),
    [seed],
  );

  const [state, setState] = useState<GazillionState>(() =>
    gazillionEngine.init(level),
  );
  const [phase, setPhase] = useState<Phase>("intro");
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [trap, setTrap] = useState<Trap>(START_TRAP);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [muted, toggleMute] = useMute(MUTE_KEY);
  const lock = useDailyLock("gazillion", mode, dailyDate);

  const result = gazillionEngine.getResult(state);
  usePersistResult({
    gameId: "gazillion",
    mode,
    dailyDate,
    levelId: level.id,
    finished: phase === "finished",
    skip: lock.alreadyPlayed,
    result,
    answers: gazillionAnswers(state),
    generatorVersion: level.generatorVersion,
  });

  useEffect(() => {
    if (lock.alreadyPlayed) setPhase("finished");
  }, [lock.alreadyPlayed]);

  const current = state.rounds[state.current];

  function submit() {
    if (reveal || !current) return;
    const next = gazillionEngine.applyMove(state, {
      type: "submit",
      low: trap.low,
      high: trap.high,
    });
    const played = next.rounds[state.current];
    setReveal({
      prompt: played.data.prompt,
      category: played.data.category,
      year: played.data.year,
      points: played.points,
      trapped: played.trapped,
      trap,
    });
    setState(next);
    if (!muted) (played.trapped ? playSuccess : playMiss)();
  }

  function pass() {
    if (reveal || !current) return;
    const played = state.rounds[state.current];
    const next = gazillionEngine.applyMove(state, { type: "pass" });
    setReveal({
      prompt: played.data.prompt,
      category: played.data.category,
      year: played.data.year,
      points: 0,
      trapped: false,
      trap: null,
    });
    setState(next);
    if (!muted) playMiss();
  }

  function advance() {
    setReveal(null);
    setTrap(START_TRAP);
    if (state.finished) {
      setPhase("finished");
      if (result.won && !muted) playFanfare();
    }
  }

  const score =
    lock.alreadyPlayed && lock.storedScore !== null
      ? lock.storedScore
      : result.score;
  const roundNo = reveal ? state.current : state.current + 1;

  return (
    <div className="gz game-viewport flex flex-col">
      {/* ── band 1: masthead ─────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 pt-4 sm:px-8 sm:pt-6">
        <ContextLink context={context} />
        <h1 className="gz-display flex items-center gap-2 text-xl font-extrabold uppercase tracking-tight">
          <Hourglass
            className="h-5 w-5"
            style={{ color: "var(--gz-amber)" }}
            aria-hidden="true"
          />
          Epoche
        </h1>
        <ContextControl context={context} mode={mode} dailyDate={dailyDate} />
        <div className="ml-auto flex items-center gap-1">
          {phase === "playing" && (
            <div
              role="group"
              aria-label={`Punteggio ${result.score} su ${MAX_SCORE}`}
              className="mr-2 flex items-center gap-3"
            >
              <ol className="hidden gap-1.5 sm:flex" aria-hidden="true">
                {state.rounds.map((r, i) => (
                  <li
                    key={i}
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: i === state.current && !reveal ? 28 : 10,
                      background:
                        i < state.current
                          ? r.trapped
                            ? "var(--gz-hit)"
                            : "var(--gz-miss)"
                          : i === state.current
                            ? "var(--gz-amber)"
                            : "var(--gz-line)",
                    }}
                  />
                ))}
              </ol>
              <span className="gz-year text-lg font-bold" aria-hidden="true">
                <CountUp value={result.score} />
              </span>
            </div>
          )}
          <button
            type="button"
            className="gz-icon"
            onClick={() => setRulesOpen(true)}
            aria-label="Come si gioca"
            title="Come si gioca"
          >
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="gz-icon"
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

      {/* The bands spread over the full height: event at the top, the
          timeline in the middle, the controls at the bottom near the hand. */}
      <div className="safe-bottom flex flex-1 flex-col justify-between gap-8 px-4 py-8 sm:px-8 sm:py-10">
        {phase === "intro" && (
          <>
            <section aria-labelledby="gz-intro" className="max-w-4xl">
              <p className="gz-kicker">
                {mode === "daily" && dailyDate
                  ? `Il viaggio di oggi · #${dailyNumber(dailyDate, EPOCH)}`
                  : "Viaggio d'allenamento"}
              </p>
              <h2
                id="gz-intro"
                className="gz-display mt-3 text-4xl font-extrabold leading-[1.05] sm:text-6xl"
              >
                Intrappola l&apos;anno.
              </h2>
              <p
                className="mt-4 max-w-xl text-base sm:text-lg"
                style={{ color: "var(--gz-muted)" }}
              >
                {ROUNDS_PER_SESSION} eventi della storia. Per ognuno chiudi la
                trappola attorno all&apos;anno in cui è successo: più è stretta,
                più punti — e anche chi la manca di poco porta a casa qualcosa.
              </p>
            </section>
            <TrapTimeline trap={START_TRAP} />
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <button
                type="button"
                onClick={() => setPhase("playing")}
                className="gz-btn"
              >
                Inizia il viaggio
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <ul
                className="flex flex-wrap gap-x-6 gap-y-2 text-sm"
                style={{ color: "var(--gz-muted)" }}
              >
                <li>Trascina le maniglie ambra</li>
                <li>Ampiezza minima {MIN_SPAN} anni</li>
                <li>Fino a {MAX_POINTS_PER_ROUND} punti a evento</li>
              </ul>
            </div>
          </>
        )}

        {phase === "playing" && (
          <>
            {/* ── band 2: the event ─────────────────────────────────── */}
            <section
              aria-labelledby="gz-event"
              aria-live="polite"
              className="max-w-5xl"
            >
              <p className="gz-kicker">
                Evento {Math.min(roundNo, state.rounds.length)} /{" "}
                {state.rounds.length}
                {" · "}
                {(reveal ?? current.data).category}
              </p>
              <h2
                id="gz-event"
                className="gz-display mt-3 text-2xl font-bold leading-tight sm:text-4xl lg:text-5xl"
              >
                {reveal ? reveal.prompt : current.data.prompt}
              </h2>
            </section>

            {/* ── band 3: the timeline, edge to edge ────────────────── */}
            <TrapTimeline
              trap={reveal ? reveal.trap : trap}
              onTrap={reveal ? undefined : setTrap}
              truth={
                reveal ? { year: reveal.year, trapped: reveal.trapped } : null
              }
            />

            {/* ── band 4: the controls, or the verdict ──────────────── */}
            {reveal ? (
              <Verdict
                reveal={reveal}
                isLast={state.finished}
                onNext={advance}
              />
            ) : (
              <TrapControls
                trap={trap}
                onTrap={setTrap}
                onSubmit={submit}
                onPass={pass}
              />
            )}
          </>
        )}

        {phase === "finished" && (
          <Arrival
            state={state}
            score={score}
            alreadyPlayed={lock.alreadyPlayed}
            mode={mode}
            dailyDate={dailyDate}
            context={context}
            onRestart={onRestart}
          />
        )}
      </div>

      <RulesDialog
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        title="Come si gioca a Epoche"
        className="gz-dialog"
        titleClassName="gz-display text-xl font-bold"
        closeClassName="gz-btn mt-5 w-full"
      >
        <ol className="mt-4 space-y-3 text-sm leading-relaxed">
          <li>
            Leggi l&apos;evento e chiudi la trappola sulla linea del tempo:
            trascina le due maniglie ambra, oppure la fascia fra loro per
            spostarla intera. Puoi anche scrivere gli anni.
          </li>
          <li>
            Se l&apos;anno giusto cade dentro, fai punti: fino a{" "}
            {MAX_POINTS_PER_ROUND}, di più quanto più la trappola è stretta.
            L&apos;ampiezza minima è di {MIN_SPAN} anni.
          </li>
          <li>
            Mancarlo di poco vale ancora qualcosa. Gli eventi più antichi sono
            giudicati con più tolleranza: la linea è più compressa a sinistra.
          </li>
          <li>
            Da tastiera: ogni maniglia si muove con ← →, Shift per dieci anni,
            Pag↑/Pag↓ per cento.
          </li>
        </ol>
      </RulesDialog>
    </div>
  );
}

function ContextLink({ context }: { context?: PlayContext }) {
  const archive = context?.kind === "archive";
  return (
    <Link
      to={archive ? context.backTo : "/games"}
      className="gz-kicker inline-flex min-h-9 items-center gap-1.5 hover:text-[var(--gz-ink)]"
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
      {archive ? "Archivio" : "Giochi"}
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
        className="inline-flex rounded-full border border-[var(--gz-line)] p-1"
        tabClassName={() => "gz-tab"}
      />
    );
  if (context?.kind === "archive")
    return (
      <p className="gz-kicker first-letter:uppercase">
        Archivio · {formatDayLong(context.date)} · non conta per la serie
      </p>
    );
  return (
    <p className="gz-kicker">
      {mode === "daily" && dailyDate
        ? `Sfida di oggi #${dailyNumber(dailyDate, EPOCH)}`
        : "Allenamento"}
    </p>
  );
}

/** A year field that lets the player type freely, committing valid years. */
function YearField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (y: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setText(String(value));
  }, [value, editing]);
  return (
    <label className="flex flex-1 flex-col gap-1.5">
      <span className="gz-kicker">{label}</span>
      <input
        className="gz-input"
        inputMode="numeric"
        value={text}
        onFocus={() => setEditing(true)}
        onBlur={() => {
          setEditing(false);
          const n = parseItalianNumber(text);
          if (n !== null) onCommit(clampYear(n));
          else setText(String(value));
        }}
        onChange={(e) => {
          setText(e.target.value);
          const n = parseItalianNumber(e.target.value);
          if (n !== null) onCommit(clampYear(n));
        }}
        aria-describedby="gz-year-help"
      />
    </label>
  );
}

function TrapControls({
  trap,
  onTrap,
  onSubmit,
  onPass,
}: {
  trap: Trap;
  onTrap: (t: Trap) => void;
  onSubmit: () => void;
  onPass: () => void;
}) {
  const span = trap.high - trap.low;
  return (
    <section aria-label="La tua trappola" className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-1 gap-3">
          <YearField
            label="Dal"
            value={trap.low}
            onCommit={(y) => onTrap(setEnd(trap, "low", y))}
          />
          <YearField
            label="Al"
            value={trap.high}
            onCommit={(y) => onTrap(setEnd(trap, "high", y))}
          />
        </div>
        <p className="sm:pb-3 sm:text-right">
          <span className="gz-kicker block">Ampiezza</span>
          <span
            className="gz-year text-2xl font-bold"
            style={{ color: "var(--gz-amber)" }}
          >
            {span.toLocaleString("it-IT")} anni
          </span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onPass}
            className="gz-btn gz-btn-ghost"
          >
            Salta
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="gz-btn flex-1 sm:flex-none"
          >
            Intrappola
          </button>
        </div>
      </div>
      <p
        id="gz-year-help"
        className="text-xs"
        style={{ color: "var(--gz-muted)" }}
      >
        Per gli anni avanti Cristo usa il segno meno: −44 è il 44 a.C. Trappola
        attuale: {formatYear(trap.low)} – {formatYear(trap.high)}.
      </p>
    </section>
  );
}

function Verdict({
  reveal,
  isLast,
  onNext,
}: {
  reveal: Reveal;
  isLast: boolean;
  onNext: () => void;
}) {
  const missBy = reveal.trap
    ? reveal.year < reveal.trap.low
      ? reveal.trap.low - reveal.year
      : reveal.year - reveal.trap.high
    : null;
  return (
    <section
      aria-live="polite"
      className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-4">
        <span
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full"
          style={{
            background: reveal.trapped ? "var(--gz-hit)" : "var(--gz-miss)",
            color: "var(--gz-on-mark)",
          }}
          aria-hidden="true"
        >
          {reveal.trapped ? (
            <Check className="h-7 w-7" />
          ) : (
            <X className="h-7 w-7" />
          )}
        </span>
        <div>
          <p className="gz-display text-xl font-bold">
            {reveal.trapped
              ? "Intrappolato!"
              : reveal.trap
                ? `Mancato di ${missBy?.toLocaleString("it-IT")} ${missBy === 1 ? "anno" : "anni"}`
                : "Evento saltato"}
          </p>
          <p className="text-sm" style={{ color: "var(--gz-muted)" }}>
            Era il <span className="gz-year">{formatYear(reveal.year)}</span>
            {reveal.trap && (
              <>
                {" "}
                — la tua trappola:{" "}
                <span className="gz-year">
                  {formatYear(reveal.trap.low)} – {formatYear(reveal.trap.high)}
                </span>
              </>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-5">
        <span
          className="gz-year text-4xl font-bold"
          style={{ color: "var(--gz-amber)" }}
        >
          +<CountUp value={reveal.points} />
        </span>
        <button type="button" onClick={onNext} className="gz-btn">
          {isLast ? "Vedi risultato" : "Prossimo evento"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

/** Results: the whole session on a single timeline, then the log. */
function Arrival({
  state,
  score,
  alreadyPlayed,
  mode,
  dailyDate,
  context,
  onRestart,
}: {
  state: GazillionState;
  score: number;
  alreadyPlayed: boolean;
  mode: GamePlayProps["mode"];
  dailyDate?: string;
  context?: PlayContext;
  onRestart?: () => void;
}) {
  const trapped = state.rounds.filter((r) => r.trapped).length;
  const archive = context?.kind === "archive";
  return (
    <section aria-labelledby="gz-arrival" className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="gz-kicker">Fine del viaggio</p>
          <h2
            id="gz-arrival"
            className="gz-display mt-2 text-3xl font-extrabold sm:text-5xl"
          >
            {mode === "daily" && dailyDate
              ? `Sfida di oggi #${dailyNumber(dailyDate, EPOCH)} completata`
              : "Allenamento completato"}
          </h2>
        </div>
        <p className="text-right">
          <span
            className="gz-year block text-6xl font-bold sm:text-7xl"
            style={{ color: "var(--gz-amber)" }}
          >
            <CountUp value={score} />
          </span>
          <span className="gz-kicker">
            su {MAX_SCORE.toLocaleString("it-IT")}
          </span>
        </p>
      </div>

      {alreadyPlayed ? (
        <p className="text-base">
          Hai già giocato la sfida di oggi: il risultato ufficiale conta una
          volta sola.
        </p>
      ) : (
        <>
          <TrapTimeline
            events={state.rounds.map((r) => ({
              year: r.data.year,
              trapped: r.trapped,
              label: r.data.prompt,
              trap: r.guess ? { low: r.guess.low, high: r.guess.high } : null,
            }))}
          />
          <ol className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {state.rounds.map((r, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="gz-year grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold"
                  style={{
                    background: r.trapped ? "var(--gz-hit)" : "var(--gz-miss)",
                    color: "var(--gz-on-mark)",
                  }}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block">{r.data.prompt}</span>
                  <span
                    className="gz-year text-xs"
                    style={{ color: "var(--gz-muted)" }}
                  >
                    {formatYear(r.data.year)}
                    {r.guess
                      ? ` · trappola ${formatYear(r.guess.low)} – ${formatYear(r.guess.high)}`
                      : " · saltato"}
                  </span>
                </span>
                <span className="gz-year text-sm font-bold">{r.points}</span>
              </li>
            ))}
          </ol>
          <p className="text-sm" style={{ color: "var(--gz-muted)" }}>
            Centrati {trapped} / {state.rounds.length}
            {trapped === state.rounds.length ? " — partita perfetta!" : ""}
          </p>
        </>
      )}

      <div className="flex flex-wrap gap-3">
        {context?.kind !== "archive" && (
          <ShareButton
            className="gz-btn gz-btn-ghost"
            text={buildShareText({
              gameId: "gazillion",
              number:
                mode === "daily" && dailyDate
                  ? dailyNumber(dailyDate, EPOCH)
                  : null,
              // After a reload only the stored score is known, not the rounds.
              ratios: alreadyPlayed
                ? undefined
                : state.rounds.map((r) => r.points / 1000),
              scoreText: `${score.toLocaleString("it-IT")} punti su 5.000`,
            })}
          />
        )}
        {mode === "practice" && onRestart && !archive && (
          <button type="button" onClick={onRestart} className="gz-btn">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Nuovo viaggio
          </button>
        )}
        <Link
          to={archive ? context.backTo : "/games"}
          className="gz-btn gz-btn-ghost"
        >
          {archive ? "Torna all'archivio" : "Tutti i giochi"}
        </Link>
      </div>
    </section>
  );
}

/** The Gazillion page: the game owns the whole viewport. */
export function GazillionPlayPage() {
  const { board, context, restart } = useGameMode();
  return (
    <GazillionGame
      key={board.key}
      mode={board.mode}
      seed={board.seed}
      dailyDate={board.dailyDate}
      context={context}
      onRestart={restart}
    />
  );
}
