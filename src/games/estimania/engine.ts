import type { GameEngine, GameLevel, GameResult } from "@/types/game";
import type {
  EstimaniaLevelData,
  EstimaniaMove,
  EstimaniaRound,
  EstimaniaState,
} from "./types";

export interface EstimaniaSessionData {
  rounds: EstimaniaLevelData[];
}

export const ROUNDS_PER_SESSION = 5;
export const MAX_POINTS_PER_ROUND = 100;
/** points/closeness at/above this reads as a strong answer (green). ≈ within 2×. */
export const GREAT_THRESHOLD = 0.7;
/** A "won" session answers every round at least this close. ≈ within 3×. */
export const WIN_THRESHOLD = 0.5;

/**
 * Score a numeric estimate with Estimania's verified formula (see
 * docs/rea-analysis): points = max(0, round(100·(1 − |log10(guess/answer)|))).
 * Exact = 100; 2× or 0.5× = 70; ≥10× or ≤0.1× = 0. Symmetric for over/under.
 */
export function scoreRound(
  answer: number,
  guess: number,
): { points: number; closeness: number } {
  if (!(guess > 0) || !(answer > 0)) return { points: 0, closeness: 0 };
  const points = Math.max(
    0,
    Math.round(
      MAX_POINTS_PER_ROUND * (1 - Math.abs(Math.log10(guess / answer))),
    ),
  );
  return { points, closeness: points / MAX_POINTS_PER_ROUND };
}

export const estimaniaEngine: GameEngine<
  EstimaniaSessionData,
  EstimaniaState,
  EstimaniaMove
> = {
  init(level: GameLevel<EstimaniaSessionData>): EstimaniaState {
    const rounds: EstimaniaRound[] = level.data.rounds.map((data) => ({
      data,
      guess: null,
      points: 0,
      closeness: 0,
    }));
    return { rounds, current: 0, finished: rounds.length === 0 };
  },

  applyMove(state: EstimaniaState, move: EstimaniaMove): EstimaniaState {
    if (state.finished) return state;
    const idx = state.current;
    const round = state.rounds[idx];
    if (!round) return state;

    let updated: EstimaniaRound;
    if (move.type === "submit") {
      const { points, closeness } = scoreRound(round.data.answer, move.value);
      updated = { ...round, guess: move.value, points, closeness };
    } else {
      updated = { ...round, guess: null, points: 0, closeness: 0 };
    }

    const rounds = state.rounds.slice();
    rounds[idx] = updated;
    const next = idx + 1;
    return { rounds, current: next, finished: next >= rounds.length };
  },

  isTerminal: (s) => s.finished,

  getResult(state: EstimaniaState): GameResult {
    const answered = state.rounds.filter((r) => r.guess !== null);
    const score = state.rounds.reduce((sum, r) => sum + r.points, 0);
    const great = state.rounds.filter(
      (r) => r.closeness >= GREAT_THRESHOLD,
    ).length;
    const completed = state.finished;
    const won =
      completed &&
      state.rounds.every(
        (r) => r.guess !== null && r.closeness >= WIN_THRESHOLD,
      );
    return {
      completed,
      score,
      won,
      detail: {
        rounds: state.rounds.length,
        answered: answered.length,
        great,
      },
    };
  },
};
