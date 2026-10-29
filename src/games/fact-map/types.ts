export type FactAim = "città" | "sito" | "regione" | "paese";

/** A place to locate on the map (real coordinates). */
export interface FactPlace {
  id: string;
  prompt: string;
  /** Short name of the correct place (shown on reveal). */
  label: string;
  lat: number;
  lon: number;
  aim: FactAim;
  hint?: string;
  /** Short historical/cultural note shown on reveal. */
  note?: string;
}

export type FactLevelData = FactPlace;

export interface FactGuess {
  lat: number;
  lon: number;
}

export interface FactRound {
  data: FactLevelData;
  guess: FactGuess | null;
  distanceKm: number;
  points: number;
  hintUsed: boolean;
}

export interface FactState {
  rounds: FactRound[];
  current: number;
  finished: boolean;
}

export type FactMove =
  | { type: "submit"; lat: number; lon: number; hintUsed: boolean }
  | { type: "pass" };
