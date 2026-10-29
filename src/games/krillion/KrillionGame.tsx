import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ShareButton } from "@/games/shared/ShareButton";
import { buildShareText } from "@/games/shared/share";
import { krillionAnswers } from "./answers";
import { Link } from "react-router-dom";
import { HelpCircle, Volume2, VolumeX } from "lucide-react";
import {
  DEPTH_PER_POINT,
  krillionEngine,
  lookupAnswer,
  ROUNDS_PER_SESSION,
  SECONDS_PER_PROMPT,
  type KrillionSessionData,
} from "./engine";
import { krillionGenerator } from "./generator";
import {
  TIER_LABEL,
  TIER_ORDER,
  TIER_POINTS,
  type KrillionState,
  type KrillionTier,
} from "./types";
import "./krillion.css";
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
const MAX_DEPTH = ROUNDS_PER_SESSION * TIER_POINTS.krillion * DEPTH_PER_POINT; // 7000 m
const OXYGEN_CELLS = 10;

const TIER_COLOR: Record<KrillionTier, string> = {
  plankton: "var(--kr-t-plankton)",
  tooClever: "var(--kr-t-tooClever)",
  schooler: "var(--kr-t-schooler)",
  rare: "var(--kr-t-rare)",
  deepCut: "var(--kr-t-deepCut)",
  krillion: "var(--kr-t-krillion)",
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const metres = (n: number) => `${n.toLocaleString("it-IT")} M`;

interface Reveal {
  prompt: string;
  tier: KrillionTier | null;
  answer: string | null;
  points: number;
  timedOut: boolean;
}

type Phase = "intro" | "playing" | "finished";

/**
 * Krillion — «La discesa».
 *
 * The page is the water column: a depth gauge the full height of the
 * screen on the left, from the surface to the trench floor, and a sonar
 * terminal on the right where the answers are typed as commands.
 */
export function KrillionGame({
  mode,
  seed,
  dailyDate,
  context,
  onRestart,
}: GamePlayProps) {
  const level = useMemo<GameLevel<KrillionSessionData>>(
    () => krillionGenerator.generate(seed),
    [seed],
  );

  const [state, setState] = useState<KrillionState>(() =>
    krillionEngine.init(level),
  );
  const [phase, setPhase] = useState<Phase>("intro");
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [text, setText] = useState("");
  const [rejected, setRejected] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_PROMPT);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [muted, toggleMute] = useMute();
  const lock = useDailyLock("krillion", mode, dailyDate);

  const result = krillionEngine.getResult(state);
  usePersistResult({
    gameId: "krillion",
    mode,
    dailyDate,
    levelId: level.id,
    finished: phase === "finished",
    skip: lock.alreadyPlayed,
    result,
    answers: krillionAnswers(state),
    generatorVersion: level.generatorVersion,
  });

  useEffect(() => {
    if (lock.alreadyPlayed) setPhase("finished");
  }, [lock.alreadyPlayed]);

  const current = state.rounds[state.current];

  function dive(e?: FormEvent) {
    e?.preventDefault();
    if (reveal || !current) return;
    const match = lookupAnswer(current.data, text);
    if (!match) {
      // Unknown answers are refused without penalty: the clock keeps going.
      setRejected((n) => n + 1);
      return;
    }
    const next = krillionEngine.applyMove(state, {
      type: "accept",
      answer: match.label,
      tier: match.tier,
    });
    setReveal({
      prompt: current.data.prompt,
      tier: match.tier,
      answer: match.label,
      points: TIER_POINTS[match.tier],
      timedOut: false,
    });
    setState(next);
    if (!muted) playSuccess();
  }

  function pass(timedOut = false) {
    if (reveal) return;
    const played = state.rounds[state.current];
    if (!played) return;
    const next = krillionEngine.applyMove(state, { type: "pass" });
    setReveal({
      prompt: played.data.prompt,
      tier: null,
      answer: null,
      points: 0,
      timedOut,
    });
    setState(next);
    if (!muted) playMiss();
  }

  // 25 seconds of oxygen per prompt; it runs out → the prompt is passed.
  // Paused while a result is on screen.
  const expire = useRef<() => void>(() => {});
  expire.current = () => {
    if (phase === "playing" && !reveal) pass(true);
  };
  useEffect(() => {
    if (phase !== "playing" || reveal) return;
    setTimeLeft(SECONDS_PER_PROMPT);
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          expire.current();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, reveal, state.current]);

  function advance() {
    setReveal(null);
    setText("");
    setRejected(0);
    if (state.finished) setPhase("finished");
  }

  // Enter moves on from a result, like confirming the next command.
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

  // The engine's score is already the depth in metres.
  const depth =
    lock.alreadyPlayed && lock.storedScore !== null
      ? lock.storedScore
      : result.score;
  const roundNo = reveal ? state.current : state.current + 1;

  return (
    <div className="kr game-viewport grid grid-cols-[3.5rem_minmax(0,1fr)] sm:grid-cols-[9rem_minmax(0,1fr)]">
      <DepthColumn depth={phase === "intro" ? 0 : depth} />

      <div className="flex min-w-0 flex-col">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--kr-line)] px-4 py-3 sm:px-10">
          <ContextLink context={context} />
          <h1
            className="text-3xl tracking-widest"
            style={{ color: "var(--kr-sonar)" }}
          >
            ABISSI
          </h1>
          <ContextControl context={context} mode={mode} dailyDate={dailyDate} />
          <div className="ml-auto flex items-center">
            <button
              type="button"
              className="kr-icon"
              onClick={() => setRulesOpen(true)}
              aria-label="Come si gioca"
              title="Come si gioca"
            >
              <HelpCircle className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="kr-icon"
              onClick={toggleMute}
              aria-label={muted ? "Attiva l'audio" : "Disattiva l'audio"}
              aria-pressed={muted}
            >
              {muted ? (
                <VolumeX className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Volume2 className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </header>

        <div className="safe-bottom flex flex-1 flex-col justify-center px-4 py-8 sm:px-10">
          {phase === "intro" && (
            <section aria-labelledby="kr-intro" className="max-w-3xl">
              <p className="kr-dim">
                {">"} SONAR PRONTO ·{" "}
                {mode === "daily" && dailyDate
                  ? `IMMERSIONE N. ${pad2(dailyNumber(dailyDate, EPOCH))}`
                  : "IMMERSIONE D'ALLENAMENTO"}
              </p>
              <h2
                id="kr-intro"
                className="mt-3 text-5xl leading-none sm:text-7xl"
              >
                TROVA LA RISPOSTA
                <br />
                <span style={{ color: "var(--kr-sonar)" }}>
                  CHE NESSUNO DÀ.
                </span>
              </h2>
              <div className="mt-8 space-y-1">
                <p>
                  {">"} {ROUNDS_PER_SESSION} DOMANDE APERTE. NOMINA QUALCOSA CHE
                  CI STA.
                </p>
                <p>
                  {">"} PIÙ È RARA LA RISPOSTA, PIÙ SCENDI. FINO A{" "}
                  {metres(MAX_DEPTH)}.
                </p>
                <p>
                  {">"} {SECONDS_PER_PROMPT} SECONDI D&apos;OSSIGENO A DOMANDA.
                </p>
              </div>
              <TierLadder className="mt-8" />
              <button
                type="button"
                onClick={() => setPhase("playing")}
                className="kr-cmd kr-cmd-solid mt-8"
              >
                [ INIZIA LA DISCESA ]
              </button>
            </section>
          )}

          {phase === "playing" && (
            <section aria-labelledby="kr-q" className="max-w-4xl">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="kr-dim">
                  {">"} DOMANDA {pad2(Math.min(roundNo, state.rounds.length))}/
                  {pad2(state.rounds.length)}
                </p>
                {!reveal && <Oxygen timeLeft={timeLeft} />}
              </div>
              <h2
                id="kr-q"
                className="mt-3 text-4xl uppercase leading-none sm:text-6xl"
              >
                {reveal ? reveal.prompt : current.data.prompt}
              </h2>
              {!reveal && current.data.constraint && (
                <p className="kr-dim mt-2">({current.data.constraint})</p>
              )}

              {reveal ? (
                <Printout
                  reveal={reveal}
                  isLast={state.finished}
                  onNext={advance}
                />
              ) : (
                <form onSubmit={dive} className="mt-8">
                  <label htmlFor="kr-answer" className="sr-only">
                    La tua risposta
                  </label>
                  <div
                    key={rejected}
                    className={`flex items-center gap-3 border-b-2 pb-1 ${rejected ? "kr-reject" : ""}`}
                    style={{
                      borderColor: rejected
                        ? "var(--kr-oxygen)"
                        : "var(--kr-sonar)",
                    }}
                  >
                    <span
                      className="text-3xl"
                      style={{ color: "var(--kr-sonar)" }}
                      aria-hidden="true"
                    >
                      {">"}
                    </span>
                    <input
                      id="kr-answer"
                      className="kr-prompt"
                      value={text}
                      autoFocus
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="LA TUA RISPOSTA"
                      onChange={(e) => {
                        setText(e.target.value);
                        if (rejected) setRejected(0);
                      }}
                      aria-describedby="kr-status"
                    />
                  </div>
                  <p
                    id="kr-status"
                    role="status"
                    className="mt-2 min-h-7"
                    style={{
                      color: rejected ? "var(--kr-oxygen)" : "var(--kr-muted)",
                    }}
                  >
                    {rejected
                      ? "> RISPOSTA NON RICONOSCIUTA · RIPROVA, NESSUNA PENALITÀ"
                      : "> INVIO PER IMMERGERTI"}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={!text.trim()}
                      className="kr-cmd kr-cmd-solid"
                    >
                      [ IMMERGITI ]
                    </button>
                    <button
                      type="button"
                      onClick={() => pass(false)}
                      className="kr-cmd kr-cmd-quiet"
                    >
                      [ PASSA ]
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}

          {phase === "finished" && (
            <DiveLog
              state={state}
              depth={depth}
              alreadyPlayed={lock.alreadyPlayed}
              mode={mode}
              dailyDate={dailyDate}
              context={context}
              onRestart={onRestart}
            />
          )}
        </div>
      </div>

      <RulesDialog
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        title="> COME SI GIOCA"
        className="kr-dialog"
        titleClassName="text-3xl"
        closeLabel="[ CHIUDI ]"
        closeClassName="kr-cmd mt-5 w-full"
      >
        <div className="mt-3 space-y-2">
          <p>
            Ogni domanda è aperta: «nomina un uccello», «nomina un fiume». Va
            bene qualunque risposta giusta che il gioco conosce.
          </p>
          <p>
            Ogni risposta ha una rarità. Le più ovvie valgono poco, le più rare
            fino a {TIER_POINTS.krillion} punti: ogni punto è {DEPTH_PER_POINT}{" "}
            metri di discesa.
          </p>
          <p>
            Hai {SECONDS_PER_PROMPT} secondi d&apos;ossigeno a domanda. Una
            risposta che il gioco non conosce viene rifiutata senza penalità.
          </p>
          <p className="kr-dim">
            Nota: la rarità qui è stabilita a mano per ogni risposta, non
            misurata sulle risposte degli altri giocatori come
            nell&apos;originale.
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
      className="kr-dim inline-flex min-h-9 items-center hover:text-[var(--kr-text)]"
    >
      {"<"} {archive ? "ARCHIVIO" : "GIOCHI"}
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
        tabClassName={() => "kr-tab uppercase"}
      />
    );
  if (context?.kind === "archive")
    return (
      <p className="kr-dim uppercase">
        ARCHIVIO · {formatDayLong(context.date)} · FUORI SERIE
      </p>
    );
  return (
    <p className="kr-dim">
      {mode === "daily" && dailyDate
        ? `IMMERSIONE N. ${pad2(dailyNumber(dailyDate, EPOCH))}`
        : "ALLENAMENTO"}
    </p>
  );
}

/** Oxygen as ten cells that empty: the timer, read at a glance. */
function Oxygen({ timeLeft }: { timeLeft: number }) {
  const full = Math.ceil((timeLeft / SECONDS_PER_PROMPT) * OXYGEN_CELLS);
  const low = timeLeft <= 5;
  return (
    <p
      className="flex items-center gap-2"
      style={{ color: low ? "var(--kr-oxygen)" : "var(--kr-sonar)" }}
      role="timer"
      aria-label={`Ossigeno: ${timeLeft} secondi`}
    >
      <span aria-hidden="true">O₂</span>
      <span className="flex gap-0.5" aria-hidden="true">
        {Array.from({ length: OXYGEN_CELLS }, (_, i) => (
          <span
            key={i}
            className="h-4 w-2.5"
            style={{
              background: i < full ? "currentColor" : "transparent",
              border: "1px solid currentColor",
              opacity: i < full ? 1 : 0.35,
            }}
          />
        ))}
      </span>
      <span className="w-8 text-right" aria-hidden="true">
        {pad2(timeLeft)}s
      </span>
    </p>
  );
}

/** The six rarity tiers, shallow to deep; one can be highlighted. */
function TierLadder({
  highlight,
  className,
}: {
  highlight?: KrillionTier | null;
  className?: string;
}) {
  return (
    <ol
      className={`grid grid-cols-2 gap-x-6 sm:grid-cols-3 ${className ?? ""}`}
      aria-label="Livelli di rarità"
    >
      {TIER_ORDER.map((t) => (
        <li
          key={t}
          className="flex items-baseline justify-between gap-3 border-b border-[var(--kr-line)] py-1"
          style={{
            color: highlight === t ? "var(--kr-on-sonar)" : TIER_COLOR[t],
            background: highlight === t ? TIER_COLOR[t] : "transparent",
            paddingInline: highlight === t ? "0.4rem" : 0,
          }}
          aria-current={highlight === t ? "true" : undefined}
        >
          <span className="truncate uppercase">{TIER_LABEL[t]}</span>
          <span>{TIER_POINTS[t]}</span>
        </li>
      ))}
    </ol>
  );
}

/** The sonar's verdict, printed line by line. */
function Printout({
  reveal,
  isLast,
  onNext,
}: {
  reveal: Reveal;
  isLast: boolean;
  onNext: () => void;
}) {
  return (
    <div className="mt-8" aria-live="polite">
      <div className="space-y-1 text-2xl">
        {reveal.tier ? (
          <>
            <p className="kr-print">
              {">"} RISPOSTA ACCETTATA:{" "}
              <span className="uppercase">{reveal.answer}</span>
            </p>
            <p
              className="kr-print"
              style={{
                animationDelay: "160ms",
                color: TIER_COLOR[reveal.tier],
              }}
            >
              {">"} RARITÀ:{" "}
              <span className="uppercase">{TIER_LABEL[reveal.tier]}</span>
            </p>
            <p
              className="kr-print"
              style={{ animationDelay: "320ms", color: "var(--kr-sonar)" }}
            >
              {">"} +{reveal.points} PT · DISCESA DI{" "}
              <CountUp value={reveal.points * DEPTH_PER_POINT} /> M
            </p>
          </>
        ) : (
          <p className="kr-print kr-dim">
            {">"} {reveal.timedOut ? "OSSIGENO ESAURITO" : "DOMANDA SALTATA"} ·
            RESTI A GALLA
          </p>
        )}
      </div>
      <TierLadder highlight={reveal.tier} className="mt-6" />
      <button
        type="button"
        onClick={onNext}
        className="kr-cmd kr-cmd-solid mt-8"
      >
        {isLast ? "[ RISALI ]" : "[ PROSSIMA ]"}
      </button>
    </div>
  );
}

/**
 * The full-height depth gauge: surface at the top, trench floor at the
 * bottom, the submersible at the depth reached so far.
 */
function DepthColumn({ depth }: { depth: number }) {
  const t = Math.max(0, Math.min(1, depth / MAX_DEPTH));
  const marks = Array.from(
    { length: MAX_DEPTH / 1000 + 1 },
    (_, i) => i * 1000,
  );
  return (
    <aside
      aria-label={`Profondità ${depth} metri su ${MAX_DEPTH}`}
      className="sticky top-[var(--nav-h)] h-[calc(100dvh-var(--nav-h))] self-start border-r border-[var(--kr-line)]"
    >
      <p
        className="kr-dim absolute inset-x-0 top-2 text-center text-base"
        aria-hidden="true"
      >
        ≋ 0 M
      </p>
      <div className="absolute inset-x-0 bottom-16 top-12">
        {marks.slice(1).map((m) => (
          <div
            key={m}
            aria-hidden="true"
            className="absolute inset-x-0 flex items-center justify-end gap-1 pr-1.5"
            style={{ top: `${(m / MAX_DEPTH) * 100}%` }}
          >
            <span className="kr-dim hidden text-base sm:inline">
              {m.toLocaleString("it-IT")}
            </span>
            <span
              className="h-px w-2.5"
              style={{ background: "var(--kr-line)" }}
            />
          </div>
        ))}
        {/* The trail behind the submersible. */}
        <span
          aria-hidden="true"
          className="kr-diver absolute left-1/2 top-0 w-px -translate-x-1/2 border-l border-dashed"
          style={{ height: `${t * 100}%`, borderColor: "var(--kr-sonar)" }}
        />
        <span
          aria-hidden="true"
          className="kr-diver absolute left-1/2 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center"
          style={{
            top: `${t * 100}%`,
            background: "var(--kr-sonar)",
            color: "var(--kr-on-sonar)",
            boxShadow: "0 0 18px var(--kr-glow)",
          }}
        >
          ◆
        </span>
      </div>
      <p
        className="absolute inset-x-0 bottom-3 text-center text-lg sm:text-2xl"
        style={{ color: "var(--kr-sonar)" }}
        aria-hidden="true"
      >
        <CountUp value={depth} />
        <span className="kr-dim text-sm sm:text-base"> M</span>
      </p>
    </aside>
  );
}

/** Results: the dive log, printed like a terminal report. */
function DiveLog({
  state,
  depth,
  alreadyPlayed,
  mode,
  dailyDate,
  context,
  onRestart,
}: {
  state: KrillionState;
  depth: number;
  alreadyPlayed: boolean;
  mode: GamePlayProps["mode"];
  dailyDate?: string;
  context?: PlayContext;
  onRestart?: () => void;
}) {
  const archive = context?.kind === "archive";
  const rare = state.rounds.filter(
    (r) => r.tier === "rare" || r.tier === "deepCut" || r.tier === "krillion",
  ).length;
  return (
    <section aria-labelledby="kr-log" className="max-w-4xl">
      <p className="kr-dim">
        {">"} REGISTRO D&apos;IMMERSIONE ·{" "}
        {mode === "daily" && dailyDate
          ? `N. ${pad2(dailyNumber(dailyDate, EPOCH))}`
          : "ALLENAMENTO"}
      </p>
      <h2 id="kr-log" className="mt-2 text-5xl leading-none sm:text-7xl">
        {mode === "daily"
          ? "SFIDA DI OGGI COMPLETATA"
          : "ALLENAMENTO COMPLETATO"}
      </h2>
      <p className="mt-4 text-4xl" style={{ color: "var(--kr-sonar)" }}>
        PROFONDITÀ: <CountUp value={depth} /> M
        <span className="kr-dim text-2xl"> / {metres(MAX_DEPTH)}</span>
      </p>

      {alreadyPlayed ? (
        <p className="mt-6">
          {">"} HAI GIÀ GIOCATO LA SFIDA DI OGGI: CONTA UNA VOLTA SOLA.
        </p>
      ) : (
        <>
          <p className="kr-dim mt-6" aria-hidden="true">
            {"-".repeat(48)}
          </p>
          <ol className="mt-1">
            {state.rounds.map((r, i) => (
              <li
                key={i}
                className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] gap-x-3 py-1"
              >
                <span className="kr-dim">#{pad2(i + 1)}</span>
                <span className="min-w-0">
                  <span className="block truncate uppercase">
                    {r.data.prompt}
                  </span>
                  <span
                    style={{
                      color: r.tier ? TIER_COLOR[r.tier] : "var(--kr-muted)",
                    }}
                  >
                    {r.answer
                      ? `${r.answer.toUpperCase()} · ${TIER_LABEL[r.tier!].toUpperCase()}`
                      : "— SALTATA"}
                  </span>
                </span>
                <span style={{ color: "var(--kr-sonar)" }}>
                  {r.points ? `+${metres(r.points * DEPTH_PER_POINT)}` : "0 M"}
                </span>
              </li>
            ))}
          </ol>
          <p className="kr-dim mt-1" aria-hidden="true">
            {"-".repeat(48)}
          </p>
          <p className="mt-2">
            {">"} RISPOSTE RARE O PIÙ: {rare} / {state.rounds.length}
          </p>
        </>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {context?.kind !== "archive" && (
          <ShareButton
            className="kr-cmd kr-cmd-quiet"
            text={buildShareText({
              gameId: "krillion",
              number:
                mode === "daily" && dailyDate
                  ? dailyNumber(dailyDate, EPOCH)
                  : null,
              // After a reload only the stored score is known, not the rounds.
              ratios: alreadyPlayed
                ? undefined
                : state.rounds.map((r) => r.points / 100),
              scoreText: `${depth.toLocaleString("it-IT")} m di profondità`,
            })}
          />
        )}
        {mode === "practice" && onRestart && !archive && (
          <button
            type="button"
            onClick={onRestart}
            className="kr-cmd kr-cmd-solid"
          >
            [ NUOVA IMMERSIONE ]
          </button>
        )}
        <Link
          to={archive ? context.backTo : "/games"}
          className="kr-cmd kr-cmd-quiet"
        >
          {archive ? "[ ARCHIVIO ]" : "[ TUTTI I GIOCHI ]"}
        </Link>
      </div>
    </section>
  );
}

/** The Krillion page: the game owns the whole viewport. */
export function KrillionPlayPage() {
  const { board, context, restart } = useGameMode();
  return (
    <KrillionGame
      key={board.key}
      mode={board.mode}
      seed={board.seed}
      dailyDate={board.dailyDate}
      context={context}
      onRestart={restart}
    />
  );
}
