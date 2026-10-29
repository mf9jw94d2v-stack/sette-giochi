import { isFiniteNumber } from "@/games/answerGuards";
import type { PlainMove, PlainState } from "./types";

/**
 * What the player answered, round by round: the number they locked in, or
 * `null` for a round they passed. This is what the server replays to
 * recompute the score (src/games/replay.ts).
 */
export type PlainAnswer = number | null;

export function plainAnswers(state: PlainState): PlainAnswer[] {
  return state.rounds.map((r) => r.guess);
}

/** Turn untrusted answers back into engine moves; `null` if any is malformed. */
export function plainMoves(answers: readonly unknown[]): PlainMove[] | null {
  const moves: PlainMove[] = [];
  for (const a of answers) {
    if (a === null) moves.push({ type: "pass" });
    else if (isFiniteNumber(a)) moves.push({ type: "submit", value: a });
    else return null;
  }
  return moves;
}
