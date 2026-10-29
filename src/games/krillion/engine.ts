import type { GameEngine, GameLevel, GameResult } from "@/types/game";
import {
  TIER_POINTS,
  type KrillionLevelData,
  type KrillionMove,
  type KrillionPrompt,
  type KrillionRound,
  type KrillionState,
  type KrillionTier,
} from "./types";

export interface KrillionSessionData {
  rounds: KrillionLevelData[];
}

export const ROUNDS_PER_SESSION = 7;
export const SECONDS_PER_PROMPT = 25;
export const DEPTH_PER_POINT = 10;

/** Normalise an answer for matching: lowercase, no accents, single spaces. */
export function normalizeAnswer(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Look up a typed answer in a prompt; returns the match or null. */
export function lookupAnswer(
  prompt: KrillionPrompt,
  text: string,
): { label: string; tier: KrillionTier } | null {
  const q = normalizeAnswer(text);
  if (!q) return null;
  for (const a of prompt.answers) {
    if (normalizeAnswer(a.label) === q) return { label: a.label, tier: a.tier };
    if (a.aliases?.some((al) => normalizeAnswer(al) === q))
      return { label: a.label, tier: a.tier };
  }
  return null;
}

export const krillionEngine: GameEngine<
  KrillionSessionData,
  KrillionState,
  KrillionMove
> = {
  init(level: GameLevel<KrillionSessionData>): KrillionState {
    const rounds: KrillionRound[] = level.data.rounds.map((data) => ({
      data,
      answer: null,
      tier: null,
      points: 0,
    }));
    return { rounds, current: 0, finished: rounds.length === 0 };
  },

  applyMove(state: KrillionState, move: KrillionMove): KrillionState {
    if (state.finished) return state;
    const idx = state.current;
    const round = state.rounds[idx];
    if (!round) return state;

    let updated: KrillionRound;
    if (move.type === "accept") {
      updated = {
        ...round,
        answer: move.answer,
        tier: move.tier,
        points: TIER_POINTS[move.tier],
      };
    } else {
      updated = { ...round, answer: null, tier: null, points: 0 };
    }

    const rounds = state.rounds.slice();
    rounds[idx] = updated;
    const next = idx + 1;
    return { rounds, current: next, finished: next >= rounds.length };
  },

  isTerminal: (s) => s.finished,

  getResult(state: KrillionState): GameResult {
    const points = state.rounds.reduce((sum, r) => sum + r.points, 0);
    const depth = points * DEPTH_PER_POINT;
    const answered = state.rounds.filter((r) => r.tier !== null).length;
    const krillions = state.rounds.filter((r) => r.tier === "krillion").length;
    const completed = state.finished;
    const won = completed && answered === state.rounds.length;
    return {
      completed,
      score: depth,
      won,
      detail: {
        points,
        depth,
        answered,
        krillions,
        rounds: state.rounds.length,
      },
    };
  },
};
