import type { GameEngine, GameLevel, GameResult } from "@/types/game";
import type { FactLevelData, FactMove, FactRound, FactState } from "./types";

export interface FactSessionData {
  rounds: FactLevelData[];
}

export const ROUNDS_PER_SESSION = 5;
export const MAX_POINTS_PER_ROUND = 1000;
/** Full marks within this radius (km). */
export const BULLSEYE_KM = 50;
/** Distance decay scale (km). */
export const DECAY_KM = 2000;
/** A hint caps the round at this many points. */
export const HINT_CAP = 750;
/** "Close enough" threshold for a won session (km). */
export const CLOSE_KM = 300;

/** Great-circle distance between two lat/lon points, in km. */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Points for a pin at distance `d` km from the target. */
export function scoreDistance(d: number, hintUsed: boolean): number {
  const base =
    d <= BULLSEYE_KM
      ? MAX_POINTS_PER_ROUND
      : Math.round(
          MAX_POINTS_PER_ROUND * Math.exp(-(d - BULLSEYE_KM) / DECAY_KM),
        );
  return hintUsed ? Math.min(base, HINT_CAP) : base;
}

export const factEngine: GameEngine<FactSessionData, FactState, FactMove> = {
  init(level: GameLevel<FactSessionData>): FactState {
    const rounds: FactRound[] = level.data.rounds.map((data) => ({
      data,
      guess: null,
      distanceKm: Infinity,
      points: 0,
      hintUsed: false,
    }));
    return { rounds, current: 0, finished: rounds.length === 0 };
  },

  applyMove(state: FactState, move: FactMove): FactState {
    if (state.finished) return state;
    const idx = state.current;
    const round = state.rounds[idx];
    if (!round) return state;

    let updated: FactRound;
    if (move.type === "submit") {
      const d = haversineKm(move.lat, move.lon, round.data.lat, round.data.lon);
      updated = {
        ...round,
        guess: { lat: move.lat, lon: move.lon },
        distanceKm: d,
        points: scoreDistance(d, move.hintUsed),
        hintUsed: move.hintUsed,
      };
    } else {
      updated = { ...round, guess: null, distanceKm: Infinity, points: 0 };
    }

    const rounds = state.rounds.slice();
    rounds[idx] = updated;
    const next = idx + 1;
    return { rounds, current: next, finished: next >= rounds.length };
  },

  isTerminal: (s) => s.finished,

  getResult(state: FactState): GameResult {
    const score = state.rounds.reduce((sum, r) => sum + r.points, 0);
    const close = state.rounds.filter(
      (r) => r.guess !== null && r.distanceKm <= CLOSE_KM,
    ).length;
    const completed = state.finished;
    const won = completed && close === state.rounds.length;
    return {
      completed,
      score,
      won,
      detail: { rounds: state.rounds.length, close },
    };
  },
};
