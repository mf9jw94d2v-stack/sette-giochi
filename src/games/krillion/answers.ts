import type { GameLevel } from "@/types/game";
import type { KrillionSessionData } from "./engine";
import { lookupAnswer } from "./engine";
import type { KrillionMove, KrillionState } from "./types";

/** The answer the player dived with, as matched; `null` = passed or timed out. */
export type KrillionAnswer = string | null;

export function krillionAnswers(state: KrillionState): KrillionAnswer[] {
  return state.rounds.map((r) => r.answer);
}

/**
 * The rarity tier is NOT taken from the client: it is looked up again in the
 * level's own answer list. An answer that is not on that list is malformed —
 * the board never accepts one — so the whole submission is refused.
 */
export function krillionMoves(
  answers: readonly unknown[],
  level: GameLevel<KrillionSessionData>,
): KrillionMove[] | null {
  const moves: KrillionMove[] = [];
  for (let i = 0; i < answers.length; i++) {
    const a = answers[i];
    if (a === null) {
      moves.push({ type: "pass" });
      continue;
    }
    const prompt = level.data.rounds[i];
    if (typeof a !== "string" || a.length > 120 || !prompt) return null;
    const match = lookupAnswer(prompt, a);
    if (!match) return null;
    moves.push({ type: "accept", answer: match.label, tier: match.tier });
  }
  return moves;
}
