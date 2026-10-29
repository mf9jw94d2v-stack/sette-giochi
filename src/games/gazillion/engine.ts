import type { GameEngine, GameLevel, GameResult } from "@/types/game";
import type {
  GazillionLevelData,
  GazillionMove,
  GazillionRound,
  GazillionState,
} from "./types";

/** A playable Gazillion level is a session of rounds. */
export interface GazillionSessionData {
  rounds: GazillionLevelData[];
}

export const ROUNDS_PER_SESSION = 5;
export const MAX_POINTS_PER_ROUND = 1000;
/** Minimum span (years) between the two handles. */
export const MIN_SPAN = 8;

// Scoring constants reproduced from the original Gazillion mechanic so our
// scoring matches the real game (verified from its public client — see
// docs/game-analysis.md). This is an original implementation of a mathematical
// formula, not copied code or data.
const W_SCALE = 10;
const W_POW = 1.3;
const NEAR_SHARE = 0.5; // partial-credit ceiling for a near miss
const NEAR_FADE = 3; // how fast near-miss credit fades with distance
const UNIVERSE_AGE = 13.8e9; // years; tolerance tapers toward this
const NOW_YEAR = new Date().getFullYear();

/** Astronomical year numbering (no year 0): 1 BC = 0, 2 BC = -1, … */
function astro(year: number): number {
  return year < 0 ? year + 1 : year;
}
/** Years before the present. */
function yearsAgo(year: number, now: number): number {
  return now - astro(year);
}
function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * Per-event tolerance: older events get a wider "fair" window, so pinning an
 * ancient year scores comparably to pinning a recent one. `age` is years-ago.
 */
export function tolerance(age: number): number {
  const s = clamp01((Math.log10(Math.max(age, 1)) - 3) / 2);
  const sm = s * s * (3 - 2 * s); // smoothstep
  return (3 + age * (0.08 + 0.22 * sm)) * (1 - age / (1.3 * UNIVERSE_AGE));
}

const narrowOf = (width: number, t: number): number =>
  1 / (1 + Math.pow(width / (W_SCALE * t), W_POW));

/**
 * Score a trap [low, high] (years) against the true year.
 *  - Trapping the year scores up to 1000; a tighter trap scores more.
 *  - Missing still earns partial credit (capped at NEAR_SHARE) that fades with
 *    distance — a one-year miss is never a flat zero.
 */
export function scoreRound(
  year: number,
  low: number,
  high: number,
  now: number = NOW_YEAR,
): { trapped: boolean; points: number } {
  if (low > high) [low, high] = [high, low];
  // In "years ago": o = older handle (low year), n = newer handle (high year).
  const o = yearsAgo(low, now);
  const n = yearsAgo(high, now);
  const evOld = yearsAgo(year, now) + 0.5;
  const evNew = yearsAgo(year, now) - 0.5;
  const width = Math.max(0, o - n);
  const t = tolerance(yearsAgo(year, now));

  const trapped = o >= evNew && n <= evOld;
  if (trapped) {
    return {
      trapped: true,
      points: Math.max(1, Math.round(1000 * narrowOf(width, t))),
    };
  }
  const missBy = evNew > o ? evNew - o : n - evOld;
  const points = Math.round(
    1000 *
      NEAR_SHARE *
      narrowOf(width + missBy, t) *
      Math.exp(-missBy / (NEAR_FADE * t)),
  );
  return { trapped: false, points: Math.max(0, points) };
}

export const gazillionEngine: GameEngine<
  GazillionSessionData,
  GazillionState,
  GazillionMove
> = {
  init(level: GameLevel<GazillionSessionData>): GazillionState {
    const rounds: GazillionRound[] = level.data.rounds.map((data) => ({
      data,
      guess: null,
      points: 0,
      trapped: false,
    }));
    return { rounds, current: 0, finished: rounds.length === 0 };
  },

  applyMove(state: GazillionState, move: GazillionMove): GazillionState {
    if (state.finished) return state;
    const idx = state.current;
    const round = state.rounds[idx];
    if (!round) return state;

    let updated: GazillionRound;
    if (move.type === "submit") {
      const { trapped, points } = scoreRound(
        round.data.year,
        move.low,
        move.high,
      );
      const low = Math.min(move.low, move.high);
      const high = Math.max(move.low, move.high);
      updated = { ...round, guess: { low, high }, trapped, points };
    } else {
      updated = { ...round, guess: null, trapped: false, points: 0 };
    }

    const rounds = state.rounds.slice();
    rounds[idx] = updated;
    const nextIndex = idx + 1;
    return {
      rounds,
      current: nextIndex,
      finished: nextIndex >= rounds.length,
    };
  },

  isTerminal(state: GazillionState): boolean {
    return state.finished;
  },

  getResult(state: GazillionState): GameResult {
    const answered = state.rounds.filter((r) => r.guess !== null);
    const score = state.rounds.reduce((sum, r) => sum + r.points, 0);
    const trappedCount = state.rounds.filter((r) => r.trapped).length;
    const completed = state.finished;
    // A "clean run" (won) traps every round.
    const won = completed && trappedCount === state.rounds.length;
    return {
      completed,
      score,
      won,
      detail: {
        rounds: state.rounds.length,
        answered: answered.length,
        trappedCount,
        perfect: won,
      },
    };
  },
};
