import { useEffect, useRef, type MouseEvent } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { CountUp } from "@/components/ui/CountUp";
import { formatFactor, formatMetres } from "../geometry";
import { TOLERANCE, verdictOf, type SizeScore } from "../engine";
import type { SizeObject } from "../types";
import { C } from "./palette";

/** Each verdict is a word first; the colour only repeats it. */
const VERDICT: Record<string, { text: string; color: string; bg: string }> = {
  perfetta: { text: "In proporzione", color: C.good, bg: C.goodSoft },
  vicina: { text: "Quasi", color: C.ink, bg: C.track },
  lontana: { text: "Fuori scala", color: C.red, bg: C.redSoft },
};

/**
 * What the player learns after locking in, docked where the controls were:
 * their estimate against the truth, by how much and in which direction, what
 * it scored, and where the figure comes from so they can check it.
 */
export function RevealPanel({
  target,
  guessM,
  score,
  onNext,
  isLast,
}: {
  target: SizeObject;
  guessM: number;
  score: SizeScore;
  onNext: () => void;
  isLast: boolean;
}) {
  const verdict = VERDICT[verdictOf(score)];
  const tooBig = score.factor > 1;
  const within = score.relErr <= TOLERANCE;
  const next = useRef<HTMLButtonElement>(null);

  // On a phone this button appears exactly where "Blocca la scala" was, so
  // the rest of a quick double or triple tap would land on it and skip the
  // reveal. Those follow-up taps carry a click count above 1; a deliberate
  // tap (1) or a keyboard press (0) goes through.
  const onNextClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (e.detail > 1) return;
    onNext();
  };

  // The lock button is gone, so focus would fall to the page: put it on the
  // one thing to do next instead.
  useEffect(() => {
    next.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="siu-rise mx-auto max-w-6xl">
      <div className="grid gap-x-8 gap-y-4 lg:grid-cols-[minmax(14rem,auto)_minmax(0,1fr)_auto] lg:items-center">
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <span
              className="siu-stamp"
              style={{ color: verdict.color, backgroundColor: verdict.bg }}
            >
              {verdict.text}
            </span>
            <h3 className="mt-1.5 truncate text-lg font-bold">
              {target.label}
            </h3>
          </div>
          <p
            className="siu-num ml-auto text-4xl lg:ml-2"
            style={{ color: C.red }}
          >
            +<CountUp value={score.points} />
            <span
              className="text-base font-semibold"
              style={{ color: "var(--siu-muted)" }}
            >
              {" "}
              / 100
            </span>
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <Fact label="La tua stima" color={C.red}>
            {formatMetres(guessM)}
          </Fact>
          <Fact label={`Misura reale (${target.axis})`} color={C.good}>
            {formatMetres(target.sizeM)}
          </Fact>
          <Fact label="Scarto">
            {Number.isFinite(score.relErr)
              ? `${Math.round(score.relErr * 100)}%`
              : "—"}
          </Fact>
          <Fact label="Direzione" small>
            {within ? "Centrata" : `${formatFactor(score.factor)} del vero`}
          </Fact>
        </dl>

        <button
          ref={next}
          type="button"
          onClick={onNextClick}
          className="siu-btn w-full lg:w-auto"
        >
          {isLast ? "Vedi il risultato" : "Prossimo confronto"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div
        className="mt-4 flex flex-col gap-1.5 border-t pt-3 text-sm lg:flex-row lg:items-baseline lg:gap-6"
        style={{ borderColor: "var(--siu-rule)", color: "var(--siu-muted)" }}
      >
        {!within && (
          <p style={{ color: "var(--siu-ink)" }}>
            L&apos;hai fatta {tooBig ? "più grande" : "più piccola"} di quanto
            sia davvero.
          </p>
        )}
        {target.note && (
          <p style={{ color: "var(--siu-ink)" }}>{target.note}</p>
        )}
        <p className="lg:ml-auto">
          Fonte della misura: {target.source}
          {target.sourceUrl && (
            <>
              {" — "}
              <a
                href={target.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-6 items-center gap-1 underline"
              >
                verifica
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </>
          )}
          {target.precision && <> · {target.precision}</>}
        </p>
      </div>
    </div>
  );
}

function Fact({
  label,
  color,
  small,
  children,
}: {
  label: string;
  color?: string;
  small?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="siu-label" style={{ letterSpacing: "0.08em" }}>
        {label}
      </dt>
      <dd
        className={small ? "mt-0.5 font-semibold" : "siu-num mt-0.5 text-2xl"}
        style={{ color }}
      >
        {children}
      </dd>
    </div>
  );
}
