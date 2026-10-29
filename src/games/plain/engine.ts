import type { GameEngine, GameLevel, GameResult } from "@/types/game";
import type {
  PlainDirection,
  PlainLevelData,
  PlainMove,
  PlainOutcome,
  PlainRound,
  PlainState,
} from "./types";

export interface PlainSessionData {
  rounds: PlainLevelData[];
}

export const ROUNDS_PER_SESSION = 7;
/** Mission: reach this altitude (metres) across the session. */
export const MISSION_ALTITUDE = 5000;
export const MAX_CLIMB_PER_ROUND = 1000;
/** Relative-error scale for the altitude decay (fit so 57% error ≈ +180 m). */
export const DECAY = 0.333;
export const BULLSEYE_REL = 0.05;
export const CLOSE_REL = 0.25;

/**
 * Altitude gained from a guess. A perfect guess climbs the full 1000 m; the
 * climb decays continuously with the relative error (symmetric for over/under),
 * so a near miss still earns a partial climb — never a flat zero for a close
 * answer. (Model inspired by Plain's verified behaviour; see docs/rea-analysis.)
 */
export function scoreGuess(
  answer: number,
  guess: number,
): {
  climb: number;
  relErr: number;
  pct: number;
  direction: PlainDirection;
  outcome: PlainOutcome;
} {
  if (!(answer > 0) || !Number.isFinite(guess)) {
    return {
      climb: 0,
      relErr: Infinity,
      pct: 0,
      direction: "none",
      outcome: "miss",
    };
  }
  const relErr = Math.abs(guess - answer) / answer;
  const climb = Math.max(
    0,
    Math.round(MAX_CLIMB_PER_ROUND * Math.exp(-relErr / DECAY)),
  );
  const direction: PlainDirection =
    guess < answer ? "under" : guess > answer ? "over" : "exact";
  const outcome: PlainOutcome =
    relErr <= BULLSEYE_REL
      ? "bullseye"
      : relErr <= CLOSE_REL
        ? "close"
        : "miss";
  return { climb, relErr, pct: Math.round(relErr * 100), direction, outcome };
}

export const plainEngine: GameEngine<PlainSessionData, PlainState, PlainMove> =
  {
    init(level: GameLevel<PlainSessionData>): PlainState {
      const rounds: PlainRound[] = level.data.rounds.map((data) => ({
        data,
        guess: null,
        climb: 0,
        relErr: Infinity,
        pct: 0,
        direction: "none",
        outcome: "none",
      }));
      return { rounds, current: 0, finished: rounds.length === 0 };
    },

    applyMove(state: PlainState, move: PlainMove): PlainState {
      if (state.finished) return state;
      const idx = state.current;
      const round = state.rounds[idx];
      if (!round) return state;

      let updated: PlainRound;
      if (move.type === "submit") {
        const s = scoreGuess(round.data.answer, move.value);
        updated = { ...round, guess: move.value, ...s };
      } else {
        updated = {
          ...round,
          guess: null,
          climb: 0,
          relErr: Infinity,
          pct: 0,
          direction: "none",
          outcome: "none",
        };
      }

      const rounds = state.rounds.slice();
      rounds[idx] = updated;
      const next = idx + 1;
      return { rounds, current: next, finished: next >= rounds.length };
    },

    isTerminal: (s) => s.finished,

    getResult(state: PlainState): GameResult {
      const altitude = state.rounds.reduce((sum, r) => sum + r.climb, 0);
      const bullseye = state.rounds.filter(
        (r) => r.outcome === "bullseye",
      ).length;
      const answered = state.rounds.filter((r) => r.guess !== null).length;
      const completed = state.finished;
      const won = completed && altitude >= MISSION_ALTITUDE;
      return {
        completed,
        score: altitude,
        won,
        detail: { altitude, bullseye, answered, mission: MISSION_ALTITUDE },
      };
    },
  };
