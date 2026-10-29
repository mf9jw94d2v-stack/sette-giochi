import { isFiniteNumber } from "@/games/answerGuards";
import type { EstimaniaMove, EstimaniaState } from "./types";

/**
 * What the player answered, round by round: the number they locked in, or
 * `null` for a round they passed. This is what the server replays to
 * recompute the score (src/games/replay.ts).
 */
export type EstimaniaAnswer = number | null;

export function estimaniaAnswers(state: EstimaniaState): EstimaniaAnswer[] {
  return state.rounds.map((r) => r.guess);
}

/** Turn untrusted answers back into engine moves; `null` if any is malformed. */
export function estimaniaMoves(
  answers: readonly unknown[],
): EstimaniaMove[] | null {
  const moves: EstimaniaMove[] = [];
  for (const a of answers) {
    if (a === null) moves.push({ type: "pass" });
    else if (isFiniteNumber(a)) moves.push({ type: "submit", value: a });
    else return null;
  }
  return moves;
}
