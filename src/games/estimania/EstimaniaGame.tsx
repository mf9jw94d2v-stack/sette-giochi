import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ShareButton } from "@/games/shared/ShareButton";
import { buildShareText } from "@/games/shared/share";
import { estimaniaAnswers } from "./answers";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  estimaniaEngine,
  scoreRound,
  GREAT_THRESHOLD,
  MAX_POINTS_PER_ROUND,
  ROUNDS_PER_SESSION,
  type EstimaniaSessionData,
} from "./engine";
import { estimaniaGenerator } from "./generator";
import type { EstimaniaRound, EstimaniaState } from "./types";
import {
  formatNumber,
  magnitudeWords,
  parseItalianNumber,
  ratioWords,
  RULER_MAX_EXP,
  RULER_MIN_EXP,
  rulerT,
} from "./numbers";
import "./estimania.css";
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

const EPOCH = "2026-10-27";
const MAX_SCORE = ROUNDS_PER_SESSION * MAX_POINTS_PER_ROUND;

interface Reveal {
  question: string;
  category: string;
  unit?: string;
  answer: number;
  guess: number | null;
  points: number;
}

type Phase = "intro" | "playing" | "finished";

const verdictColor = (points: number) =>
  points >= GREAT_THRESHOLD * MAX_POINTS_PER_ROUND
    ? "var(--es-good)"
    : points >= 50
      ? "var(--es-guess)"
      : "var(--es-bad)";

/**
 * Estimania — «Il quaderno di stima».
 *
 * An editorial page: the question is a headline, the estimate is set in
 * type as large as the screen allows, the notebook of the five rounds runs
 * alongside, and the magnitude ruler underneath spans the full width.
 */
export function EstimaniaGame({
  mode,
  seed,
  dailyDate,
  context,
  onRestart,
}: GamePlayProps) {
  const level = useMemo<GameLevel<EstimaniaSessionData>>(
    () => estimaniaGenerator.generate(seed),
    [seed],
  );

  const [state, setState] = useState<EstimaniaState>(() =>
    estimaniaEngine.init(level),
  );
  const [phase, setPhase] = useState<Phase>("intro");
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [text, setText] = useState("");
  const [rulesOpen, setRulesOpen] = useState(false);
  const [muted, toggleMute] = useMute();
  const lock = useDailyLock("estimania", mode, dailyDate);

  const result = estimaniaEngine.getResult(state);
  usePersistResult({
    gameId: "estimania",
    mode,
    dailyDate,
    levelId: level.id,
    finished: phase === "finished",
    skip: lock.alreadyPlayed,
    result,
    answers: estimaniaAnswers(state),
    generatorVersion: level.generatorVersion,
  });

  useEffect(() => {
    if (lock.alreadyPlayed) setPhase("finished");
  }, [lock.alreadyPlayed]);

  const current = state.rounds[state.current];
  const parsed = parseItalianNumber(text);
  const valid = parsed !== null && parsed > 0;

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!valid || reveal || !current) return;
    const next = estimaniaEngine.applyMove(state, {
      type: "submit",
      value: parsed,
    });
    const played = next.rounds[state.current];
    setReveal({
      question: played.data.question,
      category: played.data.category,
      unit: played.data.unit,
      answer: played.data.answer,
      guess: parsed,
      points: played.points,
    });
    setState(next);
    if (!muted)
      (played.closeness >= GREAT_THRESHOLD ? playSuccess : playMiss)();
  }

  function pass() {
    if (reveal || !current) return;
    const played = state.rounds[state.current];
    const next = estimaniaEngine.applyMove(state, { type: "pass" });
    setReveal({
      question: played.data.question,
      category: played.data.category,
      unit: played.data.unit,
      answer: played.data.answer,
      guess: null,
      points: 0,
    });
    setState(next);
    if (!muted) playMiss();
  }

  function advance() {
    setReveal(null);
    setText("");
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
    <div className="es game-viewport flex flex-col">
      <header className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-[var(--es-rule)] px-4 py-3 sm:px-10">
        <ContextLink context={context} />
        <h1 className="es-serif text-2xl font-extrabold italic tracking-tight">
          Stima
        </h1>
        <ContextControl context={context} mode={mode} dailyDate={dailyDate} />
        <div className="ml-auto flex items-center gap-1">
          {phase === "playing" && (
            <p className="mr-3 text-right">
              <span className="sr-only">
                Punteggio {result.score} su {MAX_SCORE}
              </span>
              <span
                className="es-num text-2xl font-semibold"
                aria-hidden="true"
              >
                <CountUp value={result.score} />
              </span>
              <span
                className="text-sm"
                style={{ color: "var(--es-muted)" }}
                aria-hidden="true"
              >
                {" "}
                / {MAX_SCORE}
              </span>
            </p>
          )}
          <button
            type="button"
            className="es-icon"
            onClick={() => setRulesOpen(true)}
            aria-label="Come si gioca"
            title="Come si gioca"
          >
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="es-icon"
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

      {phase === "intro" && (
        <Cover
          mode={mode}
          dailyDate={dailyDate}
          onStart={() => setPhase("playing")}
        />
      )}

      {phase === "playing" && (
        <div className="flex flex-1 flex-col">
          <div className="grid flex-1 grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-8 px-4 py-8 sm:px-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
            {/* ── the question and the estimate ─────────────────────── */}
            <section
              aria-labelledby="es-q"
              aria-live="polite"
              className="flex flex-col justify-center gap-8"
            >
              <div>
                <p className="es-kicker">
                  Domanda {Math.min(roundNo, state.rounds.length)} di{" "}
                  {state.rounds.length} · {(reveal ?? current.data).category}
                </p>
                <h2
                  id="es-q"
                  className="es-serif mt-3 text-3xl font-semibold leading-[1.12] sm:text-5xl"
                >
                  {reveal ? reveal.question : current.data.question}
                </h2>
              </div>

              {reveal ? (
                <Answer
                  reveal={reveal}
                  isLast={state.finished}
                  onNext={advance}
                />
              ) : (
                <form onSubmit={submit} className="flex flex-col gap-4">
                  <label
                    htmlFor="es-guess"
                    className="es-kicker"
                    style={{ color: "var(--es-muted)" }}
                  >
                    La tua stima
                    {current.data.unit ? ` (${current.data.unit})` : ""}
                  </label>
                  <div className="flex items-end gap-3">
                    <input
                      id="es-guess"
                      className="es-field"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      aria-describedby="es-guess-words"
                      aria-invalid={text !== "" && !valid}
                      autoFocus
                    />
                    {current.data.unit && (
                      <span
                        className="es-serif pb-3 text-2xl sm:text-4xl"
                        style={{ color: "var(--es-muted)" }}
                      >
                        {current.data.unit}
                      </span>
                    )}
                  </div>
                  <p
                    id="es-guess-words"
                    className="min-h-6 text-sm"
                    style={{ color: "var(--es-muted)" }}
                  >
                    {text === ""
                      ? "Scrivi un numero: va bene anche 1.200 o 2,5."
                      : valid
                        ? `Stai dicendo: ${magnitudeWords(parsed)}`
                        : "Non riesco a leggere questo numero."}
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={!valid}
                      className="es-btn flex-1 sm:flex-none"
                    >
                      Conferma la stima
                    </button>
                    <button
                      type="button"
                      onClick={pass}
                      className="es-btn es-btn-quiet"
                    >
                      Salta
                    </button>
                  </div>
                </form>
              )}
            </section>

            {/* ── the notebook ──────────────────────────────────────── */}
            <Notebook state={state} activeIndex={reveal ? -1 : state.current} />
          </div>

          {/* ── the magnitude ruler, edge to edge ───────────────────── */}
          <MagnitudeRuler
            guess={reveal ? reveal.guess : valid ? parsed : null}
            answer={reveal ? reveal.answer : null}
          />
        </div>
      )}

      {phase === "finished" && (
        <Ledger
          state={state}
          score={score}
          alreadyPlayed={lock.alreadyPlayed}
          mode={mode}
          dailyDate={dailyDate}
          context={context}
          onRestart={onRestart}
        />
      )}

      <RulesDialog
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        title="Come si gioca a Stima"
        className="es-dialog"
        titleClassName="es-serif text-2xl font-semibold"
        closeClassName="es-btn mt-6 w-full"
      >
        <div className="mt-4 space-y-3 text-sm leading-relaxed">
          <p>
            Cinque domande, ognuna con una risposta numerica. Non serve sapere
            il numero esatto: conta l&apos;ordine di grandezza.
          </p>
          <p>
            Il punteggio dipende dal <strong>rapporto</strong> fra la tua stima
            e il valore vero: esatta vale {MAX_POINTS_PER_ROUND}, il doppio o la
            metà vale 70, dieci volte tanto o un decimo vale 0. Sbagliare per
            eccesso o per difetto costa uguale.
          </p>
          <p>
            Scrivi i numeri come li scrivi di solito: 1.200, 2,5 o 1.200.000.
            Sotto il campo leggi in parole che numero hai scritto.
          </p>
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
      className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium hover:underline"
      style={{ color: "var(--es-teal-ink)" }}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
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
        className="inline-flex rounded-xl border border-[var(--es-rule)] p-1"
        tabClassName={() => "es-tab"}
      />
    );
  if (context?.kind === "archive")
    return (
      <p className="es-kicker first-letter:uppercase">
        Archivio · {formatDayLong(context.date)} · fuori serie
      </p>
    );
  return (
    <p className="es-kicker">
      {mode === "daily" && dailyDate
        ? `Numero ${dailyNumber(dailyDate, EPOCH)}`
        : "Allenamento"}
    </p>
  );
}

/** The cover: a magazine front page for today's issue. */
function Cover({
  mode,
  dailyDate,
  onStart,
}: {
  mode: GamePlayProps["mode"];
  dailyDate?: string;
  onStart: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <section
        aria-labelledby="es-cover"
        className="grid flex-1 items-center gap-10 px-4 py-10 sm:px-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]"
      >
        <div>
          <p className="es-kicker">
            {mode === "daily" && dailyDate
              ? `Il numero di oggi · ${dailyNumber(dailyDate, EPOCH)}`
              : "Numero d'allenamento"}
          </p>
          <h2
            id="es-cover"
            className="es-serif mt-4 text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl"
          >
            Quanto sai
            <br />
            <em
              className="font-extrabold"
              style={{ color: "var(--es-teal-ink)" }}
            >
              avvicinarti?
            </em>
          </h2>
          <p
            className="mt-6 max-w-xl text-lg"
            style={{ color: "var(--es-muted)" }}
          >
            {ROUNDS_PER_SESSION} domande, cinque numeri da stimare. Non serve
            saperli: conta quanto ci vai vicino in ordini di grandezza.
          </p>
          <button type="button" onClick={onStart} className="es-btn mt-8">
            Inizia
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <aside
          aria-label="Come si conta"
          className="border-t border-[var(--es-rule)] pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0"
        >
          <p className="es-kicker">Come si conta</p>
          <dl className="mt-4 divide-y divide-[var(--es-rule)]">
            {/* Computed from the scoring formula itself, not typed in. */}
            {(
              [
                ["Esatta", 1],
                ["Il doppio, o la metà", 2],
                ["Il triplo, o un terzo", 3],
                ["Dieci volte, o un decimo", 10],
              ] as const
            )
              .map(([k, factor]) => [k, scoreRound(1, factor).points] as const)
              .map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-baseline justify-between py-3"
                >
                  <dt>{k}</dt>
                  <dd className="es-num text-2xl font-semibold">{v}</dd>
                </div>
              ))}
          </dl>
          <p className="mt-4 text-sm" style={{ color: "var(--es-muted)" }}>
            Punti a domanda, sul rapporto fra stima e valore vero. Massimo{" "}
            {MAX_SCORE}.
          </p>
        </aside>
      </section>
      <MagnitudeRuler guess={null} answer={null} />
    </div>
  );
}

function Answer({
  reveal,
  isLast,
  onNext,
}: {
  reveal: Reveal;
  isLast: boolean;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-6 border-y border-[var(--es-rule)] py-5">
        <div>
          <p className="es-kicker" style={{ color: "var(--es-muted)" }}>
            La tua stima
          </p>
          <p
            className="es-num mt-1 text-3xl font-semibold sm:text-5xl"
            style={{ color: "var(--es-guess)" }}
          >
            {reveal.guess === null ? "—" : formatNumber(reveal.guess)}
          </p>
        </div>
        <div>
          <p className="es-kicker">Valore vero</p>
          <p
            className="es-num mt-1 text-3xl font-semibold sm:text-5xl"
            style={{ color: "var(--es-teal-ink)" }}
          >
            {formatNumber(reveal.answer)}
            {reveal.unit && <span className="text-xl"> {reveal.unit}</span>}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-lg">
          {reveal.guess === null
            ? "Domanda saltata."
            : `Stima ${ratioWords(reveal.guess, reveal.answer)}.`}
        </p>
        <p
          className="es-num text-4xl font-semibold"
          style={{ color: verdictColor(reveal.points) }}
        >
          +<CountUp value={reveal.points} />
        </p>
      </div>
      <button type="button" onClick={onNext} className="es-btn self-start">
        {isLast ? "Chiudi il quaderno" : "Prossima domanda"}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/** The five rounds as notebook lines, filled in as they are played. */
function Notebook({
  state,
  activeIndex,
}: {
  state: EstimaniaState;
  activeIndex: number;
}) {
  return (
    <aside
      aria-label="Quaderno della partita"
      className="border-t border-[var(--es-rule)] pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0"
    >
      <p className="es-kicker">Il quaderno</p>
      <ol className="mt-4 divide-y divide-[var(--es-rule)]">
        {state.rounds.map((r, i) => {
          const done = i < state.current;
          const active = i === activeIndex;
          return (
            <li key={i} className="flex items-baseline gap-3 py-3">
              <span
                className="es-num w-5 text-sm"
                style={{ color: "var(--es-muted)" }}
              >
                {i + 1}
              </span>
              <span
                className="min-w-0 flex-1 truncate text-sm"
                style={{
                  color: done || active ? "var(--es-ink)" : "var(--es-muted)",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {done || active ? r.data.question : "· · ·"}
              </span>
              <span
                className="es-num text-lg font-semibold"
                style={{
                  color: done ? verdictColor(r.points) : "var(--es-rule)",
                }}
              >
                {done ? r.points : "—"}
              </span>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

/**
 * The magnitude ruler: fixed decades from 0,1 to 100 milioni, so it never
 * hints at an answer. While typing it shows where the estimate sits; on
 * reveal it shows the true value and the band that would have scored 70+.
 */
function MagnitudeRuler({
  guess,
  answer,
}: {
  guess: number | null;
  answer: number | null;
}) {
  const decades = Array.from(
    { length: RULER_MAX_EXP - RULER_MIN_EXP + 1 },
    (_, i) => RULER_MIN_EXP + i,
  );
  const pct = (v: number) => `${rulerT(v) * 100}%`;
  const label = (e: number) =>
    e < 0 ? "0,1" : e < 3 ? formatNumber(10 ** e) : magnitudeWords(10 ** e);

  return (
    <figure
      aria-label="Righello degli ordini di grandezza"
      className="border-t border-[var(--es-rule)] px-4 pb-8 pt-6 sm:px-10"
      style={{ background: "var(--es-paper-2)" }}
    >
      <div className="relative h-16">
        {/* The 70-point band: within a factor of two of the truth. */}
        {answer !== null && (
          <span
            aria-hidden="true"
            className="absolute top-3 h-10 rounded"
            style={{
              left: pct(answer / 2),
              width: `calc(${pct(answer * 2)} - ${pct(answer / 2)})`,
              background: "var(--es-teal-soft)",
            }}
          />
        )}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-8 h-px"
          style={{ background: "var(--es-ink)" }}
        />
        {decades.map((e) => (
          <span
            key={e}
            aria-hidden="true"
            className="absolute top-5 h-6 w-px"
            style={{ left: pct(10 ** e), background: "var(--es-ink)" }}
          />
        ))}
        {guess !== null && (
          <span
            className="es-pin absolute top-0 -ml-px w-0.5"
            style={{
              left: pct(guess),
              height: 44,
              background: "var(--es-guess)",
            }}
            title="La tua stima"
          />
        )}
        {answer !== null && (
          <span
            className="es-pin absolute top-2 -ml-px w-0.5"
            style={{
              left: pct(answer),
              height: 52,
              background: "var(--es-teal-ink)",
            }}
            title="Valore vero"
          />
        )}
      </div>
      <div className="relative mt-1 h-5" aria-hidden="true">
        {decades.map((e, i) => (
          <span
            key={e}
            className={`es-num absolute whitespace-nowrap text-xs ${
              i === 0
                ? ""
                : i === decades.length - 1
                  ? "-translate-x-full"
                  : "-translate-x-1/2"
            } ${i % 2 ? "hidden sm:inline" : ""}`}
            style={{ left: pct(10 ** e), color: "var(--es-muted)" }}
          >
            {label(e)}
          </span>
        ))}
      </div>
      <figcaption
        className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs"
        style={{ color: "var(--es-muted)" }}
      >
        <span>Ogni tacca vale dieci volte la precedente.</span>
        {guess !== null && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-3 w-0.5"
              style={{ background: "var(--es-guess)" }}
            />{" "}
            la tua stima
          </span>
        )}
        {answer !== null && (
          <>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-3 w-0.5"
                style={{ background: "var(--es-teal-ink)" }}
              />{" "}
              valore vero
            </span>
            <span>
              la fascia chiara vale {scoreRound(1, 2).points} punti o più
            </span>
          </>
        )}
      </figcaption>
    </figure>
  );
}

/** Results: the notebook becomes a full ledger with a bar for every round. */
function Ledger({
  state,
  score,
  alreadyPlayed,
  mode,
  dailyDate,
  context,
  onRestart,
}: {
  state: EstimaniaState;
  score: number;
  alreadyPlayed: boolean;
  mode: GamePlayProps["mode"];
  dailyDate?: string;
  context?: PlayContext;
  onRestart?: () => void;
}) {
  const archive = context?.kind === "archive";
  return (
    <section
      aria-labelledby="es-ledger"
      className="flex flex-1 flex-col gap-8 px-4 py-10 sm:px-10"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="es-kicker">
            {mode === "daily" && dailyDate
              ? `Numero ${dailyNumber(dailyDate, EPOCH)} · chiuso`
              : "Allenamento · chiuso"}
          </p>
          <h2
            id="es-ledger"
            className="es-serif mt-3 text-4xl font-semibold sm:text-6xl"
          >
            {mode === "daily"
              ? "Sfida di oggi completata"
              : "Allenamento completato"}
          </h2>
        </div>
        <p className="text-right">
          <span
            className="es-num block text-7xl font-semibold leading-none sm:text-8xl"
            style={{ color: "var(--es-teal-ink)" }}
          >
            <CountUp value={score} />
          </span>
          <span className="es-kicker" style={{ color: "var(--es-muted)" }}>
            su {MAX_SCORE}
          </span>
        </p>
      </div>

      {alreadyPlayed ? (
        <p className="text-lg">
          Hai già giocato la sfida di oggi: il risultato ufficiale conta una
          volta sola.
        </p>
      ) : (
        <div>
          {/* No minimum width: on a phone the question wraps and every
              number stays in view, instead of scrolling the table sideways. */}
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">
              Le cinque domande, con stima, valore vero e punti
            </caption>
            <thead>
              <tr
                className="es-kicker border-b-2 border-[var(--es-ink)]"
                style={{ color: "var(--es-muted)" }}
              >
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Domanda
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-semibold">
                  Stima
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-semibold">
                  Vero
                </th>
                <th
                  scope="col"
                  className="hidden w-40 py-2 pr-4 font-semibold sm:table-cell"
                >
                  Scarto
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  Punti
                </th>
              </tr>
            </thead>
            <tbody>
              {state.rounds.map((r, i) => (
                <LedgerRow key={i} round={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {context?.kind !== "archive" && (
          <ShareButton
            className="es-btn es-btn-quiet"
            text={buildShareText({
              gameId: "estimania",
              number:
                mode === "daily" && dailyDate
                  ? dailyNumber(dailyDate, EPOCH)
                  : null,
              // After a reload only the stored score is known, not the rounds.
              ratios: alreadyPlayed
                ? undefined
                : state.rounds.map((r) => r.points / 100),
              scoreText: `${score.toLocaleString("it-IT")} punti su 500`,
            })}
          />
        )}
        {mode === "practice" && onRestart && !archive && (
          <button type="button" onClick={onRestart} className="es-btn">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Nuovo quaderno
          </button>
        )}
        <Link
          to={archive ? context.backTo : "/games"}
          className="es-btn es-btn-quiet"
        >
          {archive ? "Torna all'archivio" : "Tutti i giochi"}
        </Link>
      </div>
    </section>
  );
}

/** One ledger line; the bar shows the miss in decades, centred on the truth. */
function LedgerRow({ round }: { round: EstimaniaRound }) {
  const g = round.guess;
  const decades = g && g > 0 ? Math.log10(g / round.data.answer) : null;
  const clamped = decades === null ? 0 : Math.max(-1, Math.min(1, decades));
  return (
    <tr className="border-b border-[var(--es-rule)] align-baseline">
      <td className="es-serif py-3 pr-3 text-sm sm:pr-4 sm:text-base">
        {round.data.question}
      </td>
      <td
        className="es-num py-3 pr-4 text-right text-lg"
        style={{ color: "var(--es-guess)" }}
      >
        {g ? formatNumber(g) : "—"}
      </td>
      <td className="es-num whitespace-nowrap py-3 pr-3 text-right text-base sm:pr-4 sm:text-lg">
        {formatNumber(round.data.answer)}
        {round.data.unit ? (
          <span className="text-sm"> {round.data.unit}</span>
        ) : null}
      </td>
      <td
        className="hidden py-3 pr-4 sm:table-cell"
        aria-label={g ? ratioWords(g, round.data.answer) : "saltata"}
      >
        <span
          className="relative block h-2 rounded"
          style={{ background: "var(--es-paper-2)" }}
        >
          <span
            className="absolute -top-1 left-1/2 h-4 w-px"
            style={{ background: "var(--es-ink)" }}
          />
          {decades !== null && (
            <span
              className="absolute top-0 h-2 rounded"
              style={{
                left: clamped < 0 ? `${50 + clamped * 50}%` : "50%",
                width: `${Math.abs(clamped) * 50}%`,
                background: verdictColor(round.points),
              }}
            />
          )}
        </span>
      </td>
      <td
        className="es-num py-3 text-right text-xl font-semibold"
        style={{ color: verdictColor(round.points) }}
      >
        {round.points}
      </td>
    </tr>
  );
}

/** The Estimania page: the game owns the whole viewport. */
export function EstimaniaPlayPage() {
  const { board, context, restart } = useGameMode();
  return (
    <EstimaniaGame
      key={board.key}
      mode={board.mode}
      seed={board.seed}
      dailyDate={board.dailyDate}
      context={context}
      onRestart={restart}
    />
  );
}
