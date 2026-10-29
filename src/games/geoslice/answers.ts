import { isFiniteNumber, isPlainObject } from "@/games/answerGuards";
import type { GeoMove, GeoState } from "./types";

/** The cut: angle and position of the line; `null` = passed. */
export type GeoAnswer = { theta: number; pos: number } | null;

export function geoAnswers(state: GeoState): GeoAnswer[] {
  return state.rounds.map((r) =>
    r.cut ? { theta: r.cut.theta, pos: r.cut.pos } : null,
  );
}

export function geoMoves(answers: readonly unknown[]): GeoMove[] | null {
  const moves: GeoMove[] = [];
  for (const a of answers) {
    if (a === null) moves.push({ type: "pass" });
    else if (
      isPlainObject(a) &&
      isFiniteNumber(a.theta) &&
      isFiniteNumber(a.pos)
    )
      moves.push({ type: "submit", theta: a.theta, pos: a.pos });
    else return null;
  }
  return moves;
}
