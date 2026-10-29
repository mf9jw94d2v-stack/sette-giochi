import { sizeAnswers } from "./answers";
import { ShareButton } from "@/games/shared/ShareButton";
import { buildShareText } from "@/games/shared/share";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  HelpCircle,
  Keyboard,
  Lock,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  MAX_SESSION_POINTS,
  ROUNDS_PER_SESSION,
  scoreGuess,
  sizeEngine,
  TOLERANCE,
  verdictOf,
  type SizeScore,
  type SizeSessionData,
} from "./engine";
import { sizeGenerator } from "./generator";
import {
  clampRatio,
  drawObject,
  formatFactor,
  formatMetres,
  ratioToMetres,
} from "./geometry";
import { axisWithArticle } from "./types";
import type { SizeObject, SizeRound, SizeState } from "./types";
import { ComparisonStage } from "./components/ComparisonStage";
import {
  applyShortcut,
  isScaleKey,
  ScaleControls,
} from "./components/ScaleControls";
import { RevealPanel } from "./components/RevealPanel";
import { Silhouette } from "./components/Silhouette";
import { C } from "./components/palette";
import "./size-it-up.css";
import type { GamePlayProps } from "@/games/playable";
import { ModeTabs } from "@/games/shared/ModeTabs";
import { RulesDialog } from "@/games/shared/RulesDialog";
import {
  dailyNumber,
  useDailyLock,
  useMute,
  usePersistResult,
  usePrefersReducedMotion,
  type PlayContext,
} from "@/games/shared/session";
import { useGameMode } from "@/games/shared/useGameMode";
import { CountUp } from "@/components/ui/CountUp";
import { formatDayLong } from "@/lib/formatDate";
import { playMiss, playSuccess } from "@/lib/sound";
import type { GameLevel } from "@/types/game";

const EPOCH = "2026-10-27";
const pad2 = (n: number) => String(n).padStart(2, "0");

type Phase = "intro" | "playing" | "finished";

interface Reveal {
  reference: SizeObject;
  target: SizeObject;
  guessM: number;
  score: SizeScore;
}

/**
 * Size It Up — «La tavola naturalistica».
 *
 * The page is an encyclopedia plate. The comparison stage takes all the room
 * there is; under it, two figure captions name what is on it, like the labels
 * in a museum case; the controls are docked along the bottom edge and become
 * the reveal once the scale is locked.
 */
export function SizeItUpGame({
  mode,
  seed,
  dailyDate,
  context,
  onRestart,
}: GamePlayProps) {
  const level = useMemo<GameLevel<SizeSessionData>>(
    () => sizeGenerator.generate(seed),
    [seed],
  );
  const reduceMotion = usePrefersReducedMotion();

  const [state, setState] = useState<SizeState>(() => sizeEngine.init(level));
  const [phase, setPhase] = useState<Phase>("intro");
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [ratio, setRatio] = useState(1);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [muted, toggleMute] = useMute();
  const lock = useDailyLock("size-it-up", mode, dailyDate);
  const submittingRef = useRef(false);

  const current = state.rounds[state.current];
  const result = sizeEngine.getResult(state);

  usePersistResult({
    gameId: "size-it-up",
    mode,
    dailyDate,
    levelId: level.id,
    finished: phase === "finished",
    skip: lock.alreadyPlayed,
    result,
    answers: sizeAnswers(state),
    generatorVersion: level.generatorVersion,
  });

  useEffect(() => {
    if (lock.alreadyPlayed) setPhase("finished");
  }, [lock.alreadyPlayed]);

  // Each round opens at its documented starting scale, never at the answer.
  useEffect(() => {
    if (current) setRatio(clampRatio(current.data.startBias));
  }, [current]);

  const submit = useCallback(() => {
    // Guard against a double click producing two answers or two advances.
    if (!current || reveal || submittingRef.current) return;
    submittingRef.current = true;

    const guessM = ratioToMetres(ratio, current.data.reference);
    const score = scoreGuess(current.data.target.sizeM, guessM);
    setReveal({
      reference: current.data.reference,
      target: current.data.target,
      guessM,
      score,
    });
    setState((s) => sizeEngine.applyMove(s, { type: "submit", value: guessM }));
    if (!muted) (score.relErr <= TOLERANCE ? playSuccess : playMiss)();
  }, [current, reveal, ratio, muted]);

  const advance = useCallback(() => {
    submittingRef.current = false;
    setReveal(null);
    if (state.finished) setPhase("finished");
  }, [state.finished]);

  // Keyboard: resize and lock in without ever touching the handle.
  useEffect(() => {
    if (phase !== "playing" || rulesOpen) return;
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      // Never steal keys from a text field.
      if (
        tag === "TEXTAREA" ||
        el?.isContentEditable ||
        (tag === "INPUT" && (el as HTMLInputElement).type !== "range")
      )
        return;
      if (e.key === "Enter") {
        // A held-down Enter must not lock in and then race through reveals.
        if (e.repeat) {
          e.preventDefault();
          return;
        }
        // A focused link, tab or button keeps its own Enter: the lock and
        // "next" buttons do the same thing natively anyway.
        if (el?.closest("a, button, [role='tab']")) return;
        e.preventDefault();
        if (reveal) advance();
        else submit();
        return;
      }
      // The slider handles its own arrow keys.
      if (tag === "INPUT") return;
      if (!reveal && isScaleKey(e.key)) {
        e.preventDefault();
        // Functional update: several presses in one tick each build on the
        // last, instead of all reading the same stale value.
        setRatio((r) => applyShortcut(e.key, e.shiftKey, r) ?? r);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, reveal, submit, advance, rulesOpen]);

  const plateNo =
    mode === "daily" && dailyDate ? pad2(dailyNumber(dailyDate, EPOCH)) : null;

  // During a reveal the engine has already advanced, so the stage must read
  // from the captured reveal — the round just played — not the next one.
  const shownRef = reveal ? reveal.reference : current?.data.reference;
  const shownTarget = reveal ? reveal.target : current?.data.target;
  const roundNumber = reveal
    ? state.current
    : Math.min(state.current + 1, state.rounds.length);

  return (
    <div className="siu game-viewport flex flex-col">
      {/* Phone: back, title and tools on one row, mode and progress on the
          next. Wider: everything on one row, tools last. */}
      <header className="siu-head flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 sm:gap-x-5 sm:px-8">
        <ContextLink context={context} />
        <h1 className="siu-title text-2xl">In Scala</h1>
        <div className="order-4 sm:order-none">
          <ContextControl context={context} mode={mode} plateNo={plateNo} />
        </div>
        <div className="order-5 ml-auto flex items-center gap-1 sm:order-none sm:gap-2">
          {phase === "playing" && (
            <>
              <span className="sr-only">
                Confronto {roundNumber} di {state.rounds.length}
              </span>
              <span className="flex gap-1" aria-hidden="true">
                {state.rounds.map((r, i) => (
                  <span
                    key={i}
                    className="h-1.5 w-3 sm:w-6"
                    style={{
                      backgroundColor:
                        r.guess !== null
                          ? C.red
                          : i === state.current
                            ? C.ink
                            : C.track,
                    }}
                  />
                ))}
              </span>
              <span className="siu-num ml-1 text-xl sm:mx-2">
                {/* The visible number animates; assistive tech gets the
                    settled value instead of whatever frame it lands on. */}
                <span className="sr-only">
                  Punteggio {result.score} su {MAX_SESSION_POINTS}
                </span>
                <span aria-hidden="true">
                  <CountUp value={result.score} />
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "var(--siu-muted)" }}
                  >
                    {" "}
                    / {MAX_SESSION_POINTS}
                  </span>
                </span>
              </span>
            </>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <button
            type="button"
            className="siu-tool"
            onClick={() => setRulesOpen(true)}
            aria-label="Come si gioca"
            title="Come si gioca"
          >
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="siu-tool"
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
        <Intro plateNo={plateNo} onStart={() => setPhase("playing")} />
      )}

      {phase === "playing" && shownRef && shownTarget && (
        <>
          {/* The stage is the page: it takes every pixel the rest leave. */}
          <div className="relative min-h-[260px] flex-1 sm:min-h-[320px]">
            <ComparisonStage
              key={`${shownRef.id}-${shownTarget.id}`}
              reference={shownRef}
              target={shownTarget}
              ratio={reveal ? reveal.guessM / reveal.reference.sizeM : ratio}
              onRatioChange={setRatio}
              locked={Boolean(reveal)}
              truth={reveal ? reveal.target.sizeM : undefined}
              reduceMotion={reduceMotion}
            />
          </div>

          {/* Figure captions, like the labels in a museum case. */}
          <div className="grid gap-x-8 gap-y-2 px-4 py-3 sm:grid-cols-2 sm:px-8">
            <p
              className="siu-caption"
              style={{ "--siu-cap": C.blue } as CSSProperties}
            >
              <span className="siu-label hidden sm:block">
                Fig. 1 · misura nota
              </span>
              <strong>Riferimento: {shownRef.label}</strong>
              <span style={{ color: "var(--siu-muted)" }}>
                {" "}
                — {shownRef.axis} {formatMetres(shownRef.sizeM)}
              </span>
            </p>
            <p
              className="siu-caption"
              style={{ "--siu-cap": C.red } as CSSProperties}
            >
              <span className="siu-label hidden sm:block">
                Fig. 2 · da mettere in scala
              </span>
              <strong>Bersaglio: {shownTarget.label}</strong>
              <span style={{ color: "var(--siu-muted)" }}>
                {" "}
                — regola {axisWithArticle(shownTarget.axis)}
              </span>
            </p>
          </div>

          <div className="siu-dock safe-bottom px-4 pt-4 sm:px-8">
            {reveal ? (
              <RevealPanel
                target={reveal.target}
                guessM={reveal.guessM}
                score={reveal.score}
                onNext={advance}
                isLast={state.finished}
              />
            ) : (
              <Dock
                ratio={ratio}
                onRatio={setRatio}
                reference={shownRef}
                target={shownTarget}
                onLock={submit}
              />
            )}
          </div>
        </>
      )}

      {phase === "finished" && (
        <Gallery
          mode={mode}
          plateNo={plateNo}
          context={context}
          rounds={state.rounds}
          score={
            lock.alreadyPlayed && lock.storedScore !== null
              ? lock.storedScore
              : result.score
          }
          bullseye={Number(result.detail?.bullseye ?? 0)}
          alreadyPlayed={lock.alreadyPlayed}
          onRestart={onRestart}
        />
      )}

      <RulesDialog
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        title="Come si gioca"
        className="siu-dialog"
        titleClassName="siu-title text-3xl"
        closeClassName="siu-btn mt-6 w-full"
      >
        <RulesList />
        <p className="mt-4 text-sm" style={{ color: "var(--siu-muted)" }}>
          Punti: entro il {Math.round(TOLERANCE * 100)}% dal vero ne prendi 100.
          Oltre, calano con il fattore di errore, allo stesso modo se la fai
          troppo grande o troppo piccola: a circa 2,3 volte più grande o più
          piccola del vero si arriva a zero.
        </p>
      </RulesDialog>
    </div>
  );
}

/** The three steps, shared by the intro plate and the rules dialog. */
function RulesList() {
  const steps = [
    "La sagoma blu è il riferimento: la sua misura è scritta sotto.",
    "Trascina la maniglia rossa, usa il cursore o i tasti + e − per dare la scala a quella rossa.",
    `Blocca la scala: entro il ${Math.round(TOLERANCE * 100)}% dal vero sono 100 punti.`,
  ];
  return (
    <ol className="mt-4 space-y-3">
      {steps.map((t, i) => (
        <li key={t} className="flex gap-3">
          <span
            className="siu-num text-2xl leading-none"
            style={{ color: C.red }}
          >
            {i + 1}
          </span>
          <span>{t}</span>
        </li>
      ))}
    </ol>
  );
}

function ContextLink({ context }: { context?: PlayContext }) {
  const archive = context?.kind === "archive";
  return (
    <Link
      to={archive ? context.backTo : "/games"}
      className="siu-label inline-flex min-h-11 items-center gap-1 hover:text-[var(--siu-ink)]"
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
      {archive ? "Archivio" : "Giochi"}
    </Link>
  );
}

function ContextControl({
  context,
  mode,
  plateNo,
}: {
  context?: PlayContext;
  mode: GamePlayProps["mode"];
  plateNo: string | null;
}) {
  if (context?.kind === "modes")
    return (
      <ModeTabs
        value={context.mode}
        onChange={context.onModeChange}
        className="inline-flex"
        tabClassName={() => "siu-tab"}
      />
    );
  if (context?.kind === "archive")
    return (
      <p className="siu-label">
        Archivio · {formatDayLong(context.date)} · fuori serie
      </p>
    );
  return (
    <p className="siu-label">
      {mode === "daily" && plateNo ? `Tavola n. ${plateNo}` : "Allenamento"}
    </p>
  );
}

function Intro({
  plateNo,
  onStart,
}: {
  plateNo: string | null;
  onStart: () => void;
}) {
  return (
    <section
      aria-labelledby="siu-intro"
      className="safe-bottom flex flex-1 items-center px-5 py-10 sm:px-12"
    >
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <p className="siu-label">
            {plateNo
              ? `Tavola del giorno · n. ${plateNo}`
              : "Tavola d'allenamento"}
          </p>
          <h2
            id="siu-intro"
            className="siu-title mt-3 text-[clamp(3rem,9vw,7.5rem)]"
          >
            Dai a ogni cosa la sua{" "}
            <span style={{ color: C.red }}>vera scala</span>.
          </h2>
          <p className="mt-5 max-w-md text-lg">
            {ROUNDS_PER_SESSION} confronti. Ridimensiona la sagoma rossa finché
            non ti sembra grande quanto è davvero, accanto a quella blu.
          </p>
          <button type="button" onClick={onStart} className="siu-btn mt-8">
            Inizia
          </button>
        </div>

        <div className="siu-plate p-6 sm:p-8">
          <p className="siu-label">Legenda della tavola</p>
          <ul className="mt-4 space-y-3">
            {[
              { c: C.blue, k: "Blu", t: "il riferimento, a grandezza nota" },
              { c: C.red, k: "Rossa", t: "la tua stima, che regoli tu" },
              { c: C.good, k: "Verde", t: "la misura vera, dopo che blocchi" },
            ].map((l) => (
              <li key={l.k} className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0"
                  style={{ backgroundColor: l.c }}
                />
                <span>
                  <strong>{l.k}</strong> — {l.t}
                </span>
              </li>
            ))}
          </ul>
          <div
            className="mt-6 border-t pt-4"
            style={{ borderColor: "var(--siu-rule)" }}
          >
            <RulesList />
          </div>
          <p
            className="mt-5 flex items-start gap-2 text-sm"
            style={{ color: "var(--siu-muted)" }}
          >
            <Keyboard className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Da tastiera: + e − per la scala, Shift per i passi fini, Invio per
            bloccare.
          </p>
        </div>
      </div>
    </section>
  );
}

function Dock({
  ratio,
  onRatio,
  reference,
  target,
  onLock,
}: {
  ratio: number;
  onRatio: (r: number) => void;
  reference: SizeObject;
  target: SizeObject;
  onLock: () => void;
}) {
  const guessM = ratioToMetres(ratio, reference);
  return (
    <div className="mx-auto grid max-w-6xl items-center gap-x-8 gap-y-3 lg:grid-cols-[minmax(16rem,auto)_minmax(0,1fr)_auto]">
      <p className="text-sm lg:max-w-xs">
        Stai dicendo che {target.label} misura{" "}
        <strong className="siu-num text-2xl" style={{ color: C.red }}>
          {formatMetres(guessM)}
        </strong>{" "}
        <span style={{ color: "var(--siu-muted)" }}>
          — {formatFactor(ratio)} del riferimento
        </span>
      </p>
      <ScaleControls
        ratio={ratio}
        onChange={onRatio}
        disabled={false}
        targetLabel={target.label}
        valuePrefix={formatMetres(guessM)}
      />
      <button
        type="button"
        onClick={onLock}
        className="siu-btn w-full lg:w-auto"
      >
        <Lock className="h-4 w-4" aria-hidden="true" />
        Blocca la scala
      </button>
    </div>
  );
}

const VERDICT_WORD = {
  perfetta: "In proporzione",
  vicina: "Quasi",
  lontana: "Fuori scala",
} as const;

/** Final screen: the session as a gallery of plates, one per comparison. */
function Gallery({
  mode,
  plateNo,
  context,
  rounds,
  score,
  bullseye,
  alreadyPlayed,
  onRestart,
}: {
  mode: GamePlayProps["mode"];
  plateNo: string | null;
  context?: PlayContext;
  rounds: SizeRound[];
  score: number;
  bullseye: number;
  alreadyPlayed: boolean;
  onRestart?: () => void;
}) {
  const pct = Math.round((score / MAX_SESSION_POINTS) * 100);
  const played = rounds.filter((r) => r.guess !== null);
  const archive = context?.kind === "archive";

  return (
    <section
      aria-labelledby="siu-done"
      className="safe-bottom flex flex-1 flex-col px-4 py-8 sm:px-8 sm:py-12"
    >
      <div className="mx-auto my-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
          <div>
            <p className="siu-label">
              {plateNo ? `Tavola n. ${plateNo}` : "Tavola d'allenamento"}
            </p>
            <h2
              id="siu-done"
              className="siu-title mt-2 text-[clamp(2.25rem,6vw,4.5rem)]"
            >
              {mode === "daily" && plateNo
                ? `Sfida di oggi #${Number(plateNo)} completata`
                : "Allenamento completato"}
            </h2>
          </div>
          <div className="lg:ml-auto">
            <p
              className="siu-num text-7xl leading-none"
              style={{ color: C.red }}
            >
              <CountUp value={score} />
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--siu-muted)" }}>
              su {MAX_SESSION_POINTS} · {pct}%
            </p>
          </div>
        </div>

        <p className="mt-4 text-base">
          {alreadyPlayed
            ? "Hai già giocato la sfida di oggi: conta una volta sola."
            : `${bullseye} proporzioni perfette su ${rounds.length}`}
        </p>

        {played.length > 0 && (
          <ol className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {played.map((r, i) => (
              <PlateFigure key={i} n={i + 1} round={r} />
            ))}
          </ol>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          {context?.kind !== "archive" && (
            <ShareButton
              className="siu-btn siu-btn-ghost"
              text={buildShareText({
                gameId: "size-it-up",
                number:
                  plateNo !== null && mode === "daily" ? Number(plateNo) : null,
                // After a reload only the stored score is known, not the rounds.
                ratios: alreadyPlayed
                  ? undefined
                  : rounds.map((r) => r.points / 100),
                scoreText: `${score.toLocaleString("it-IT")} punti su 500`,
              })}
            />
          )}
          {mode === "practice" && onRestart && !archive && (
            <button type="button" onClick={onRestart} className="siu-btn">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Rigioca
            </button>
          )}
          <Link
            to={archive ? context.backTo : "/games"}
            className="siu-btn siu-btn-ghost"
          >
            {archive ? "Torna all'archivio" : "Tutti i giochi"}
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * One finished comparison, redrawn small: the reference, the true size in
 * green and the player's estimate as a dashed vermilion outline over it.
 */
function PlateFigure({ n, round }: { n: number; round: SizeRound }) {
  const { reference, target } = round.data;
  const guess = round.guess ?? 0;
  const score = scoreGuess(target.sizeM, guess);
  const W = 240;
  const H = 190;
  const base = H - 16;

  // Fit all three drawings inside the thumbnail at one common scale.
  const a = drawObject(reference, reference.sizeM, 1);
  const g = drawObject(target, guess, 1);
  const t = drawObject(target, target.sizeM, 1);
  const k = Math.min(
    (base - 10) / Math.max(a.height, g.height, t.height),
    (W - 36) / (a.width + Math.max(g.width, t.width)),
  );
  const refX = 12 + (a.width * k) / 2;
  const targetX = W - 12 - (Math.max(g.width, t.width) * k) / 2;

  return (
    <li className="siu-plate flex flex-col p-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`${reference.label} accanto a ${target.label}: la tua stima ${formatMetres(guess)}, misura vera ${formatMetres(target.sizeM)}`}
      >
        <line
          x1="0"
          y1={base}
          x2={W}
          y2={base}
          stroke={C.blue}
          strokeWidth="1.5"
        />
        <Silhouette
          object={reference}
          measurePx={reference.sizeM * k}
          x={refX}
          baseline={base}
          fill={C.blue}
        />
        <Silhouette
          object={target}
          measurePx={target.sizeM * k}
          x={targetX}
          baseline={base}
          fill={C.good}
          opacity={0.85}
        />
        <Silhouette
          object={target}
          measurePx={guess * k}
          x={targetX}
          baseline={base}
          fill="transparent"
          outline={C.red}
          dashed
        />
        {/* A size too small to see at this scale still gets a marker. */}
        {t.height * k < 4 && <Marker x={targetX} y={base} color={C.good} />}
        {g.height * k < 4 && guess > 0 && (
          <Marker x={targetX} y={base} color={C.red} />
        )}
      </svg>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="siu-label">Fig. {n}</span>
        <span className="siu-num text-xl">{round.points}</span>
      </div>
      <p className="font-semibold leading-tight">{target.label}</p>
      <p className="mt-1 text-sm" style={{ color: "var(--siu-muted)" }}>
        {formatMetres(guess)} contro {formatMetres(target.sizeM)}
      </p>
      <p className="siu-label mt-auto pt-2" style={{ color: C.ink }}>
        {VERDICT_WORD[verdictOf(score)]}
      </p>
    </li>
  );
}

function Marker({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <path
      d={`M${x - 5} ${y - 14} h10 l-5 8 z`}
      fill={color}
      aria-hidden="true"
    />
  );
}

/** Page with Oggi / Allenamento for Size It Up. */
export function SizeItUpPlayPage() {
  const { board, context, restart } = useGameMode();
  return (
    <SizeItUpGame
      key={board.key}
      mode={board.mode}
      seed={board.seed}
      dailyDate={board.dailyDate}
      context={context}
      onRestart={restart}
    />
  );
}
