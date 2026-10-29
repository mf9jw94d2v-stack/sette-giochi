import { isFiniteNumber, isPlainObject } from "@/games/answerGuards";
import type { GazillionMove, GazillionState } from "./types";

/** The trap: the two years the player closed around the event; `null` = passed. */
export type GazillionAnswer = { low: number; high: number } | null;

export function gazillionAnswers(state: GazillionState): GazillionAnswer[] {
  return state.rounds.map((r) =>
    r.guess ? { low: r.guess.low, high: r.guess.high } : null,
  );
}

export function gazillionMoves(
  answers: readonly unknown[],
): GazillionMove[] | null {
  const moves: GazillionMove[] = [];
  for (const a of answers) {
    if (a === null) moves.push({ type: "pass" });
    else if (
      isPlainObject(a) &&
      isFiniteNumber(a.low) &&
      isFiniteNumber(a.high)
    )
      moves.push({ type: "submit", low: a.low, high: a.high });
    else return null;
  }
  return moves;
}
