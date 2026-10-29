export type PlainCategory =
  "Monumenti" | "Natura" | "Mondo" | "Corpo & Scienza" | "Animali" | "Sport";

/** The per-round payload: a measurement question with a numeric answer. */
export interface PlainLevelData {
  question: string;
  /** True value (> 0), in `unit`. */
  answer: number;
  unit: string;
  category: string;
  /** Optional short educational note shown on reveal. */
  note?: string;
}

export interface PlainItem extends PlainLevelData {
  id: string;
  category: PlainCategory;
}

export type PlainOutcome = "bullseye" | "close" | "miss" | "none";
export type PlainDirection = "under" | "over" | "exact" | "none";

export interface PlainRound {
  data: PlainLevelData;
  guess: number | null;
  /** Metres of altitude gained this round. */
  climb: number;
  /** Relative error (0 = perfect). */
  relErr: number;
  /** Rounded percentage error for display. */
  pct: number;
  direction: PlainDirection;
  outcome: PlainOutcome;
}

export interface PlainState {
  rounds: PlainRound[];
  current: number;
  finished: boolean;
}

export type PlainMove = { type: "submit"; value: number } | { type: "pass" };
