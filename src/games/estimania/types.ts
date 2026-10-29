export type EstimaniaCategory =
  "Corpo umano" | "Geografia" | "Scienza" | "Sport" | "Cultura" | "Numeri";

/** The per-round payload: a question with a numeric answer. */
export interface EstimaniaLevelData {
  question: string;
  /** True value (> 0). */
  answer: number;
  /** Optional display unit, e.g. "m", "km/s". */
  unit?: string;
  category: string;
}

/** A source item in the authored dataset. */
export interface EstimaniaItem extends EstimaniaLevelData {
  id: string;
  category: EstimaniaCategory;
}

export interface EstimaniaRound {
  data: EstimaniaLevelData;
  guess: number | null;
  points: number;
  /** 0..1, how close the guess was (1 = exact). */
  closeness: number;
}

export interface EstimaniaState {
  rounds: EstimaniaRound[];
  current: number;
  finished: boolean;
}

export type EstimaniaMove =
  { type: "submit"; value: number } | { type: "pass" };
