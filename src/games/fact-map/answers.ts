import { isFiniteNumber, isPlainObject } from "@/games/answerGuards";
import type { FactMove, FactState } from "./types";

/** Where the pin went, and whether the hint was opened; `null` = passed. */
export type FactAnswer = { lat: number; lon: number; hint: boolean } | null;

export function factAnswers(state: FactState): FactAnswer[] {
  return state.rounds.map((r) =>
    r.guess ? { lat: r.guess.lat, lon: r.guess.lon, hint: r.hintUsed } : null,
  );
}

export function factMoves(answers: readonly unknown[]): FactMove[] | null {
  const moves: FactMove[] = [];
  for (const a of answers) {
    if (a === null) {
      moves.push({ type: "pass" });
    } else if (
      isPlainObject(a) &&
      isFiniteNumber(a.lat) &&
      isFiniteNumber(a.lon) &&
      typeof a.hint === "boolean"
    ) {
      moves.push({ type: "submit", lat: a.lat, lon: a.lon, hintUsed: a.hint });
    } else {
      return null;
    }
  }
  return moves;
}
