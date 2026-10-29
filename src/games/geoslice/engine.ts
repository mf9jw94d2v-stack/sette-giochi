import type { GameEngine, GameLevel, GameResult } from "@/types/game";
import type {
  GeoCity,
  GeoLevelData,
  GeoMove,
  GeoRound,
  GeoState,
} from "./types";

export interface GeoSessionData {
  rounds: GeoLevelData[];
}

export const ROUNDS_PER_SESSION = 3;
export const MAX_POINTS_PER_ROUND = 1000;
/** Within this %-points of a perfect 50/50 split counts as a bullseye. */
export const PERFECT_TOLERANCE = 2;

/** Signed projection of each city onto the cut's normal direction. */
export function projection(c: GeoCity, thetaDeg: number): number {
  const t = (thetaDeg * Math.PI) / 180;
  return c.x * Math.cos(t) + c.y * Math.sin(t);
}

/**
 * Score a cut. `pos` (0–100) maps to a threshold within the cities' projection
 * range; population with projection below the threshold is side A. Score peaks
 * at a perfect 50/50 split and decays linearly to 0 at an all-on-one-side cut.
 */
export function scoreCut(
  cities: readonly GeoCity[],
  thetaDeg: number,
  pos: number,
): { pctA: number; points: number; threshold: number } {
  const total = cities.reduce((s, c) => s + c.pop, 0);
  const projs = cities.map((c) => projection(c, thetaDeg));
  const min = Math.min(...projs);
  const max = Math.max(...projs);
  const threshold = min + (Math.max(0, Math.min(100, pos)) / 100) * (max - min);
  let popA = 0;
  cities.forEach((c, i) => {
    if (projs[i] < threshold) popA += c.pop;
  });
  const pctA = total > 0 ? (popA / total) * 100 : 0;
  const err = Math.abs(pctA - 50);
  const points = Math.max(0, Math.round(MAX_POINTS_PER_ROUND * (1 - err / 50)));
  return { pctA, points, threshold };
}

export const geoEngine: GameEngine<GeoSessionData, GeoState, GeoMove> = {
  init(level: GameLevel<GeoSessionData>): GeoState {
    const rounds: GeoRound[] = level.data.rounds.map((data) => ({
      data,
      cut: null,
      pctA: 0,
      points: 0,
    }));
    return { rounds, current: 0, finished: rounds.length === 0 };
  },

  applyMove(state: GeoState, move: GeoMove): GeoState {
    if (state.finished) return state;
    const idx = state.current;
    const round = state.rounds[idx];
    if (!round) return state;

    let updated: GeoRound;
    if (move.type === "submit") {
      const { pctA, points } = scoreCut(
        round.data.cities,
        move.theta,
        move.pos,
      );
      updated = {
        ...round,
        cut: { theta: move.theta, pos: move.pos },
        pctA,
        points,
      };
    } else {
      updated = { ...round, cut: null, pctA: 0, points: 0 };
    }

    const rounds = state.rounds.slice();
    rounds[idx] = updated;
    const next = idx + 1;
    return { rounds, current: next, finished: next >= rounds.length };
  },

  isTerminal: (s) => s.finished,

  getResult(state: GeoState): GameResult {
    const score = state.rounds.reduce((sum, r) => sum + r.points, 0);
    const perfect = state.rounds.filter(
      (r) => r.cut !== null && Math.abs(r.pctA - 50) <= PERFECT_TOLERANCE,
    ).length;
    const completed = state.finished;
    const won = completed && perfect === state.rounds.length;
    return {
      completed,
      score,
      won,
      detail: { rounds: state.rounds.length, perfect },
    };
  },
};
