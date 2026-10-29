/** Historical eras, each with a plausible year range (see validator). */
export type Era =
  | "ancient"
  | "classical"
  | "medieval"
  | "early-modern"
  | "modern"
  | "contemporary";

/** The per-round payload: an event and the year it happened. */
export interface GazillionLevelData {
  /** The event prompt, e.g. "The first iPhone goes on sale". */
  prompt: string;
  /** The true year. Negative = BC (e.g. -44 = 44 BC). */
  year: number;
  category: string;
  era: Era;
}

/** A source event in the authored dataset. */
export interface GazillionEvent extends GazillionLevelData {
  id: string;
  /** Heuristic difficulty hint (documented as heuristic, not objective). */
  difficulty: "easy" | "medium" | "hard";
}

/** The player's answer for a round: trap the year in [low, high]. */
export interface GazillionGuess {
  low: number;
  high: number;
}

/** One played round. */
export interface GazillionRound {
  data: GazillionLevelData;
  guess: GazillionGuess | null;
  /** Points awarded once answered. */
  points: number;
  /** Whether the true year fell inside the guessed range. */
  trapped: boolean;
}

export interface GazillionState {
  rounds: GazillionRound[];
  /** Index of the current round. */
  current: number;
  finished: boolean;
}

export type GazillionMove =
  { type: "submit"; low: number; high: number } | { type: "pass" };
