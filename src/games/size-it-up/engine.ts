import type { GameEngine, GameLevel, GameResult } from "@/types/game";
import type { SizeLevelData, SizeMove, SizeRound, SizeState } from "./types";

export interface SizeSessionData {
  rounds: SizeLevelData[];
}

export const ROUNDS_PER_SESSION = 5;
export const MAX_POINTS_PER_ROUND = 100;
export const MAX_SESSION_POINTS = ROUNDS_PER_SESSION * MAX_POINTS_PER_ROUND;

/** Inside this relative error the round is worth full marks. */
export const TOLERANCE = 0.06;

/**
 * SCORING — calibrated against the original, then made symmetric.
 *
 * Three points were observed on magnitudle.com (recorded in
 * docs/rea-analysis/size-it-up.md and verified again on 2026-10-28):
 *
 *   • its own rules text: "an estimate within 6% of the target earns the
 *     full 100";
 *   • a round scored 50/100 at "Off by 36%" (guess 2.74 m, actual 4.3 m);
 *   • a round scored 0/100 at "Off by 1102%" (guess 68.5 cm, actual 5.7 cm).
 *
 * The displayed error is plainly |guess − true| / true, since 68.5/5.7 − 1 =
 * 1102 %. But scoring on that number directly is unfair, because it is not
 * symmetric: guessing twice too big is 100 % off while guessing half as big is
 * only 50 % off, so the same mistake in the other direction would cost twice
 * as much. We therefore decay on the LOG of the ratio, which treats "2× too
 * big" and "2× too small" identically, and we fit it through the two scoring
 * points above:
 *
 *   d      = |log10(guess / true)|            (decades of error)
 *   dTol   = log10(1 + 0.06)        = 0.0253  (edge of the full-marks band)
 *   d(36%) = |log10(2.74 / 4.3)|    = 0.1959  → must give 50
 *   slope  = 50 / (0.1959 − 0.0253) = 293.1 points per decade
 *
 *   points = round(max(0, 100 − (d − dTol) · slope))
 *
 * which reaches zero at d = 0.3665, i.e. about 2.3× out in either direction —
 * comfortably consistent with the observed 0 at 1102 %.
 *
 * LIMIT, stated plainly: two scoring points cannot pin down a curve. The shape
 * between and beyond them is our choice, not a reconstruction of theirs.
 */
const D_TOLERANCE = Math.log10(1 + TOLERANCE);
const D_HALF = Math.abs(Math.log10(2.74 / 4.3));
export const DECAY_PER_DECADE = 50 / (D_HALF - D_TOLERANCE);

export interface SizeScore {
  points: number;
  /** Ordinary relative error |guess − true| / true, as the original shows it. */
  relErr: number;
  /** guess / true — above 1 means too big. */
  factor: number;
}

export function scoreGuess(trueSizeM: number, guessM: number): SizeScore {
  if (
    !Number.isFinite(trueSizeM) ||
    !Number.isFinite(guessM) ||
    trueSizeM <= 0 ||
    guessM <= 0
  ) {
    return { points: 0, relErr: Infinity, factor: Number.NaN };
  }
  const factor = guessM / trueSizeM;
  const relErr = Math.abs(guessM - trueSizeM) / trueSizeM;
  if (relErr <= TOLERANCE)
    return { points: MAX_POINTS_PER_ROUND, relErr, factor };

  const decades = Math.abs(Math.log10(factor));
  const points = Math.max(
    0,
    Math.round(
      MAX_POINTS_PER_ROUND - (decades - D_TOLERANCE) * DECAY_PER_DECADE,
    ),
  );
  return { points, relErr, factor };
}

/** Qualitative verdict shown on the reveal. */
export type SizeVerdict = "perfetta" | "vicina" | "lontana";

export function verdictOf(score: SizeScore): SizeVerdict {
  if (score.points >= MAX_POINTS_PER_ROUND) return "perfetta";
  if (score.points >= 50) return "vicina";
  return "lontana";
}

export const sizeEngine: GameEngine<SizeSessionData, SizeState, SizeMove> = {
  init(level: GameLevel<SizeSessionData>): SizeState {
    const rounds: SizeRound[] = level.data.rounds.map((data) => ({
      data,
      guess: null,
      points: 0,
      relErr: Infinity,
    }));
    return { rounds, current: 0, finished: rounds.length === 0 };
  },

  applyMove(state: SizeState, move: SizeMove): SizeState {
    if (state.finished) return state;
    const idx = state.current;
    const round = state.rounds[idx];
    if (!round) return state;
    // An answer is final: a second submit for the same round changes nothing.
    if (round.guess !== null) return state;

    let updated: SizeRound;
    if (move.type === "submit") {
      const { points, relErr } = scoreGuess(
        round.data.target.sizeM,
        move.value,
      );
      updated = { ...round, guess: move.value, points, relErr };
    } else {
      updated = { ...round, guess: null, points: 0, relErr: Infinity };
    }

    const rounds = state.rounds.slice();
    rounds[idx] = updated;
    const next = idx + 1;
    return { rounds, current: next, finished: next >= rounds.length };
  },

  isTerminal: (s) => s.finished,

  getResult(state: SizeState): GameResult {
    const score = state.rounds.reduce((sum, r) => sum + r.points, 0);
    const bullseye = state.rounds.filter(
      (r) => r.guess !== null && r.relErr <= TOLERANCE,
    ).length;
    const completed = state.finished;
    const won = completed && bullseye === state.rounds.length;
    return {
      completed,
      score,
      won,
      detail: { rounds: state.rounds.length, bullseye },
    };
  },
};
