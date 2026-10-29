import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ShareButton } from "@/games/shared/ShareButton";
import { buildShareText } from "@/games/shared/share";
import { geoAnswers } from "./answers";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  RotateCcw,
  Scissors,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  geoEngine,
  MAX_POINTS_PER_ROUND,
  PERFECT_TOLERANCE,
  ROUNDS_PER_SESSION,
  scoreCut,
  type GeoSessionData,
} from "./engine";
import { geoGenerator } from "./generator";
import { sideCounts } from "./cut";
import type { GeoLevelData, GeoState } from "./types";
import { SliceField } from "./components/SliceField";
import "./geoslice.css";
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

interface Reveal {
  region: GeoLevelData;
  theta: number;
  pos: number;
  pctA: number;
  points: number;
}

type Phase = "intro" | "playing" | "finished";

const pct = (v: number) =>
  `${v.toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

/**
 * GeoSlice — «La console GIS».
 *
 * An instrument, not a map viewer: the field takes the screen and the
 * console is docked at the side (below, on a phone), the way analysis
 * software is laid out. The player cuts by grabbing the line itself.
 */
export function GeoSliceGame({
  mode,
  seed,
  dailyDate,
  context,
  onRestart,
}: GamePlayProps) {
  const level = useMemo<GameLevel<GeoSessionData>>(
    () => geoGenerator.generate(seed),
    [seed],
  );

  const [state, setState] = useState<GeoState>(() => geoEngine.init(level));
  const [phase, setPhase] = useState<Phase>("intro");
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [theta, setTheta] = useState(0);
  const [pos, setPos] = useState(50);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [muted, toggleMute] = useMute();
  const lock = useDailyLock("geoslice", mode, dailyDate);

  const result = geoEngine.getResult(state);
  usePersistResult({
    gameId: "geoslice",
    mode,
    dailyDate,
    levelId: level.id,
    finished: phase === "finished",
    skip: lock.alreadyPlayed,
    result,
    answers: geoAnswers(state),
    generatorVersion: level.generatorVersion,
  });

  useEffect(() => {
    if (lock.alreadyPlayed) setPhase("finished");
  }, [lock.alreadyPlayed]);

  useEffect(() => {
    setTheta(0);
    setPos(50);
  }, [state.current]);

  const current = state.rounds[state.current];

  function submit() {
    if (reveal || !current) return;
    const { pctA, points } = scoreCut(current.data.cities, theta, pos);
    setReveal({ region: current.data, theta, pos, pctA, points });
    setState((s) => geoEngine.applyMove(s, { type: "submit", theta, pos }));
    if (!muted)
      (Math.abs(pctA - 50) <= PERFECT_TOLERANCE ? playSuccess : playMiss)();
  }

  function advance() {
    setReveal(null);
    if (state.finished) setPhase("finished");
  }

  const score =
    lock.alreadyPlayed && lock.storedScore !== null
      ? lock.storedScore
      : result.score;

  // ---- the field: what the big area shows in each phase -------------------
  let field: ReactNode;
  if (phase === "intro") {
    field = (
      <>
        <SliceField
          region={state.rounds[0].data}
          theta={0}
          pos={50}
          locked
          showSplit={false}
          dim
          label={`Anteprima della prima regione: ${state.rounds[0].data.name}`}
        />
        <p className="gs-caption pointer-events-none absolute bottom-3 left-3">
          Anteprima · {state.rounds[0].data.name}
        </p>
      </>
    );
  } else if (phase === "playing") {
    const region = reveal ? reveal.region : current.data;
    field = (
      <SliceField
        region={region}
        theta={reveal ? reveal.theta : theta}
        pos={reveal ? reveal.pos : pos}
        onChange={(t, p) => {
          setTheta(t);
          setPos(p);
        }}
        locked={Boolean(reveal)}
        showSplit={Boolean(reveal)}
        label={
          reveal
            ? `Taglio di ${region.name}: ${pct(reveal.pctA)} da un lato, ${pct(100 - reveal.pctA)} dall'altro`
            : `Regione ${region.name}. Trascina la linea per spostarla, le maniglie per ruotarla; con la tastiera usa le frecce.`
        }
      />
    );
  } else {
    field = lock.alreadyPlayed ? (
      <div className="grid h-full place-items-center p-6 text-center">
        <p className="gs-caption max-w-xs leading-relaxed">
          La partita di oggi è già registrata. Il rapporto di sezione resta
          disponibile solo nella sessione in cui è stata giocata.
        </p>
      </div>
    ) : (
      <SectionReport state={state} />
    );
  }

  return (
    <div className="gs grid [grid-template-areas:'head'_'field'_'body'] lg:h-[calc(100dvh-var(--nav-h))] lg:grid-cols-[minmax(0,1fr)_23rem] lg:grid-rows-[auto_minmax(0,1fr)] lg:[grid-template-areas:'field_head'_'field_body']">
      <section
        aria-label="Campo di analisi"
        className={`relative [grid-area:field] lg:h-auto ${
          phase === "finished"
            ? lock.alreadyPlayed
              ? "h-40"
              : "h-auto"
            : "h-[56dvh] min-h-[300px]"
        }`}
      >
        {field}
      </section>

      <header className="gs-rule flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3 [grid-area:head] lg:border-l">
        <ContextLink context={context} />
        <h1 className="gs-num flex items-center gap-2 text-lg font-bold uppercase tracking-[0.12em]">
          <Scissors
            className="h-4 w-4"
            style={{ color: "var(--gs-a)" }}
            aria-hidden="true"
          />
          Taglio
        </h1>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            className="gs-icon"
            onClick={() => setRulesOpen(true)}
            aria-label="Come si gioca"
            title="Come si gioca"
          >
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="gs-icon"
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
        <div className="w-full">
          <ContextControl context={context} mode={mode} dailyDate={dailyDate} />
        </div>
      </header>

      <aside
        aria-label="Console"
        className="gs-rule safe-bottom flex flex-col gap-5 border-t px-4 py-5 [grid-area:body] lg:overflow-y-auto lg:border-l lg:border-t-0"
      >
        {phase === "intro" && <Briefing onStart={() => setPhase("playing")} />}

        {phase === "playing" && (
          <>
            <RoundMeter
              state={state}
              score={result.score}
              revealing={Boolean(reveal)}
            />
            {reveal ? (
              <SplitReadout
                reveal={reveal}
                isLast={state.finished}
                onNext={advance}
              />
            ) : (
              <CutControls
                region={current.data}
                theta={theta}
                pos={pos}
                onTheta={setTheta}
                onPos={setPos}
                onCut={submit}
              />
            )}
          </>
        )}

        {phase === "finished" && (
          <Totals
            state={state}
            score={score}
            alreadyPlayed={lock.alreadyPlayed}
            mode={mode}
            dailyDate={dailyDate}
            context={context}
            onRestart={onRestart}
          />
        )}

        <p
          className="mt-auto text-xs leading-relaxed"
          style={{ color: "var(--gs-muted)" }}
        >
          Disposizione delle città stilizzata, non cartografica; popolazioni
          approssimate. Conta solo da che parte della linea cade ogni città.
        </p>
      </aside>

      <RulesDialog
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        title="Come si gioca a Taglio"
        className="gs-dialog"
        titleClassName="gs-num text-lg font-bold uppercase tracking-[0.12em]"
        closeClassName="gs-btn mt-5 w-full"
      >
        <ol className="mt-4 space-y-3 text-sm leading-relaxed">
          <li>
            <span className="gs-caption mr-2">01</span>
            Ogni regione ha le sue città: l&apos;alone attorno a ciascuna è
            proporzionale alla popolazione.
          </li>
          <li>
            <span className="gs-caption mr-2">02</span>
            Trascina la linea (o tocca un punto) per spostarla, le due maniglie
            tonde per ruotarla. Le città cambiano colore secondo il lato.
          </li>
          <li>
            <span className="gs-caption mr-2">03</span>
            Taglia quando pensi che la popolazione sia divisa a metà. Il 50/50
            esatto vale {MAX_POINTS_PER_ROUND} punti; ogni punto percentuale di
            scarto ne toglie {MAX_POINTS_PER_ROUND / 50}.
          </li>
          <li>
            <span className="gs-caption mr-2">⌨</span>
            Con il campo selezionato: ← → ruotano, ↑ ↓ spostano, Shift fa passi
            più grandi.
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
      className="gs-caption inline-flex min-h-9 items-center gap-1 hover:text-[var(--gs-text)]"
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
        className="gs-rule inline-flex border p-0.5"
        tabClassName={() => "gs-tab"}
      />
    );
  if (context?.kind === "archive")
    return (
      <p className="gs-caption">
        Archivio · {formatDayLong(context.date)} · fuori serie
      </p>
    );
  return (
    <p className="gs-caption">
      {mode === "daily" && dailyDate
        ? `Sessione #${dailyNumber(dailyDate, EPOCH)}`
        : "Allenamento"}
    </p>
  );
}

function Briefing({ onStart }: { onStart: () => void }) {
  return (
    <section aria-labelledby="gs-brief">
      <p className="gs-caption">Briefing</p>
      <h2
        id="gs-brief"
        className="gs-num mt-1 text-3xl font-bold leading-tight"
      >
        Taglia la popolazione a metà
      </h2>
      <p className="mt-2 text-sm" style={{ color: "var(--gs-muted)" }}>
        Una linea retta, una regione: metà degli abitanti da una parte, metà
        dall&apos;altra. Le percentuali si vedono solo dopo il taglio.
      </p>
      <dl className="gs-rule mt-5 grid grid-cols-3 border-y">
        {[
          ["Regioni", String(ROUNDS_PER_SESSION)],
          ["Per regione", String(MAX_POINTS_PER_ROUND)],
          ["Perfetto", `±${PERFECT_TOLERANCE}%`],
        ].map(([k, v], i) => (
          <div
            key={k}
            className={`gs-rule py-3 text-center ${i === 1 ? "border-x" : ""}`}
          >
            <dt className="gs-caption">{k}</dt>
            <dd className="gs-num mt-1 text-xl font-bold">{v}</dd>
          </div>
        ))}
      </dl>
      <button type="button" onClick={onStart} className="gs-btn mt-6 w-full">
        Inizia l&apos;analisi
      </button>
    </section>
  );
}

function RoundMeter({
  state,
  score,
  revealing,
}: {
  state: GeoState;
  score: number;
  revealing: boolean;
}) {
  const n = revealing ? state.current : state.current + 1;
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="gs-caption">
          Regione {String(Math.min(n, state.rounds.length)).padStart(2, "0")} /{" "}
          {String(state.rounds.length).padStart(2, "0")}
        </p>
        <ol className="mt-2 flex gap-1" aria-hidden="true">
          {state.rounds.map((_, i) => (
            <li
              key={i}
              className="h-1.5 w-10"
              style={{
                background:
                  i < state.current
                    ? "var(--gs-text)"
                    : i === state.current && !revealing
                      ? "var(--gs-a)"
                      : "var(--gs-rule)",
              }}
            />
          ))}
        </ol>
      </div>
      <p
        className="text-right"
        aria-label={`Punteggio ${score} su ${MAX_SCORE}`}
      >
        <span className="gs-caption block">Punteggio</span>
        <span className="gs-num text-2xl font-bold" aria-hidden="true">
          <CountUp value={score} />
          <span className="text-sm" style={{ color: "var(--gs-muted)" }}>
            /{MAX_SCORE}
          </span>
        </span>
      </p>
    </div>
  );
}

function CutControls({
  region,
  theta,
  pos,
  onTheta,
  onPos,
  onCut,
}: {
  region: GeoLevelData;
  theta: number;
  pos: number;
  onTheta: (v: number) => void;
  onPos: (v: number) => void;
  onCut: () => void;
}) {
  const counts = sideCounts(region.cities, theta, pos);
  return (
    <section aria-labelledby="gs-region" className="flex flex-col gap-5">
      <div>
        <h2 id="gs-region" className="gs-num text-4xl font-bold leading-none">
          {region.name}
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--gs-muted)" }}>
          Dividi la popolazione in due metà uguali.
        </p>
      </div>

      <dl className="gs-rule grid grid-cols-2 border">
        <div className="gs-rule border-r p-3">
          <dt className="gs-caption">Angolo</dt>
          <dd className="gs-num mt-1 text-2xl font-bold">
            {String(Math.round(theta)).padStart(3, "0")}°
          </dd>
        </div>
        <div className="p-3">
          <dt className="gs-caption">Città per lato</dt>
          <dd className="gs-num mt-1 text-2xl font-bold">
            <span style={{ color: "var(--gs-a)" }}>{counts.a}</span>
            <span style={{ color: "var(--gs-muted)" }}> · </span>
            <span style={{ color: "var(--gs-b)" }}>{counts.b}</span>
          </dd>
        </div>
      </dl>

      <div className="space-y-2">
        <label className="block">
          <span className="gs-caption">Rotazione</span>
          <input
            type="range"
            className="gs-range"
            min={0}
            max={179}
            step={1}
            value={Math.round(theta)}
            onChange={(e) => onTheta(Number(e.target.value))}
            aria-valuetext={`${Math.round(theta)} gradi`}
          />
        </label>
        <label className="block">
          <span className="gs-caption">Posizione</span>
          <input
            type="range"
            className="gs-range"
            min={0}
            max={100}
            step={0.5}
            value={pos}
            onChange={(e) => onPos(Number(e.target.value))}
          />
        </label>
      </div>

      <button type="button" onClick={onCut} className="gs-btn w-full">
        <Scissors className="h-4 w-4" aria-hidden="true" />
        Taglia
      </button>
    </section>
  );
}

/** The verdict: two big readings and how far the cut is from the middle. */
function SplitReadout({
  reveal,
  isLast,
  onNext,
}: {
  reveal: Reveal;
  isLast: boolean;
  onNext: () => void;
}) {
  const off = Math.abs(reveal.pctA - 50);
  const perfect = off <= PERFECT_TOLERANCE;
  return (
    <section
      aria-live="polite"
      aria-labelledby="gs-split"
      className="flex flex-col gap-5"
    >
      <div>
        <p className="gs-caption">{reveal.region.name} · rapporto di sezione</p>
        <h2 id="gs-split" className="sr-only">
          Risultato del taglio
        </h2>
        <div className="mt-2 flex items-end justify-between">
          <p
            className="gs-num text-4xl font-bold"
            style={{ color: "var(--gs-a)" }}
          >
            {pct(reveal.pctA)}
          </p>
          <p
            className="gs-num text-4xl font-bold"
            style={{ color: "var(--gs-b)" }}
          >
            {pct(100 - reveal.pctA)}
          </p>
        </div>
        {/* The balance bar, with the 50 % mark it was meant to hit. */}
        <div className="relative mt-3 flex h-3" aria-hidden="true">
          <span
            style={{ width: `${reveal.pctA}%`, background: "var(--gs-a)" }}
          />
          <span className="flex-1" style={{ background: "var(--gs-b)" }} />
          <span
            className="absolute -bottom-1.5 -top-1.5 left-1/2 w-0.5 -translate-x-1/2"
            style={{ background: "var(--gs-cut)" }}
          />
        </div>
      </div>

      <dl className="gs-rule grid grid-cols-2 border">
        <div className="gs-rule border-r p-3">
          <dt className="gs-caption">Scarto dal 50/50</dt>
          <dd className="gs-num mt-1 text-2xl font-bold">
            {off.toLocaleString("it-IT", { maximumFractionDigits: 1 })} pt
          </dd>
        </div>
        <div className="p-3">
          <dt className="gs-caption">
            {perfect ? "Taglio perfetto" : "Punti"}
          </dt>
          <dd
            className="gs-num mt-1 text-2xl font-bold"
            style={{ color: perfect ? "var(--gs-ok)" : "var(--gs-text)" }}
          >
            +<CountUp value={reveal.points} />
          </dd>
        </div>
      </dl>

      <button type="button" onClick={onNext} className="gs-btn w-full">
        {isLast ? "Rapporto finale" : "Prossima regione"}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </section>
  );
}

/** Results field: small multiples, one per region, each with its cut. */
function SectionReport({ state }: { state: GeoState }) {
  return (
    <div
      className="grid h-full grid-cols-1 gap-px sm:grid-cols-3"
      style={{ background: "var(--gs-rule)" }}
    >
      {state.rounds.map((r, i) => (
        <figure
          key={i}
          className="relative min-h-[220px]"
          style={{ background: "var(--gs-field)" }}
        >
          {r.cut && (
            <SliceField
              region={r.data}
              theta={r.cut.theta}
              pos={r.cut.pos}
              locked
              showSplit
              compact
              label={`${r.data.name}: ${pct(r.pctA)} e ${pct(100 - r.pctA)}`}
            />
          )}
          <figcaption className="pointer-events-none absolute inset-x-3 top-3 flex items-baseline justify-between">
            <span className="gs-caption" style={{ color: "var(--gs-text)" }}>
              {String(i + 1).padStart(2, "0")} · {r.data.name}
            </span>
            <span className="gs-num text-sm font-bold">{r.points}</span>
          </figcaption>
          {r.cut && (
            <p className="gs-num pointer-events-none absolute inset-x-3 bottom-3 flex justify-between text-lg font-bold">
              <span style={{ color: "var(--gs-a)" }}>{pct(r.pctA)}</span>
              <span style={{ color: "var(--gs-b)" }}>{pct(100 - r.pctA)}</span>
            </p>
          )}
        </figure>
      ))}
    </div>
  );
}

function Totals({
  state,
  score,
  alreadyPlayed,
  mode,
  dailyDate,
  context,
  onRestart,
}: {
  state: GeoState;
  score: number;
  alreadyPlayed: boolean;
  mode: GamePlayProps["mode"];
  dailyDate?: string;
  context?: PlayContext;
  onRestart?: () => void;
}) {
  const perfect = state.rounds.filter(
    (r) => r.cut && Math.abs(r.pctA - 50) <= PERFECT_TOLERANCE,
  ).length;
  const archive = context?.kind === "archive";
  return (
    <section aria-labelledby="gs-total" className="flex flex-col gap-4">
      <p className="gs-caption">
        {mode === "daily" && dailyDate
          ? `Sessione #${dailyNumber(dailyDate, EPOCH)} chiusa`
          : "Sessione chiusa"}
      </p>
      <h2 id="gs-total" className="gs-num text-6xl font-bold leading-none">
        <CountUp value={score} />
      </h2>
      <p className="gs-caption">su {MAX_SCORE} punti</p>
      {alreadyPlayed ? (
        <p className="text-sm">
          Hai già giocato la sfida di oggi: conta una volta sola.
        </p>
      ) : (
        <p className="text-sm">
          {perfect} {perfect === 1 ? "taglio perfetto" : "tagli perfetti"} su{" "}
          {state.rounds.length}.
        </p>
      )}
      <div className="flex flex-col gap-2">
        {context?.kind !== "archive" && (
          <ShareButton
            className="gs-btn gs-btn-line w-full"
            text={buildShareText({
              gameId: "geoslice",
              number:
                mode === "daily" && dailyDate
                  ? dailyNumber(dailyDate, EPOCH)
                  : null,
              // After a reload only the stored score is known, not the rounds.
              ratios: alreadyPlayed
                ? undefined
                : state.rounds.map((r) => r.points / 1000),
              scoreText: `${score.toLocaleString("it-IT")} punti su 3.000`,
            })}
          />
        )}
        {mode === "practice" && onRestart && !archive && (
          <button type="button" onClick={onRestart} className="gs-btn w-full">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Nuova sessione
          </button>
        )}
        <Link
          to={archive ? context.backTo : "/games"}
          className="gs-btn gs-btn-line w-full"
        >
          {archive ? "Torna all'archivio" : "Tutti i giochi"}
        </Link>
      </div>
    </section>
  );
}

/** The GeoSlice page: the game owns the whole viewport. */
export function GeoSlicePlayPage() {
  const { board, context, restart } = useGameMode();
  return (
    <GeoSliceGame
      key={board.key}
      mode={board.mode}
      seed={board.seed}
      dailyDate={board.dailyDate}
      context={context}
      onRestart={restart}
    />
  );
}
