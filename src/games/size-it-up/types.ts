/** Which dimension of an object the game measures and compares. */
export type SizeAxis = "altezza" | "lunghezza" | "apertura alare";

/** The axis with its article, elided where Italian requires it. */
export function axisWithArticle(axis: SizeAxis): string {
  return axis === "lunghezza" ? "la lunghezza" : `l'${axis}`;
}

export type SizeCategory =
  "Oggetti quotidiani" | "Animali" | "Veicoli" | "Architettura";

/** Id of a silhouette in the silhouette registry (see ./silhouettes.ts). */
export type SilhouetteId = string;

/**
 * One real-world object in the catalogue.
 *
 * `sizeM` is the ONE measurement this object is compared by, along `axis`.
 * Height, length and wingspan are never mixed up: a car is a length, a giraffe
 * is a height, a 747 is a wingspan, and the silhouette is drawn so that its
 * extent along that axis is exactly `sizeM`.
 */
export interface SizeObject {
  id: string;
  label: string;
  category: SizeCategory;
  /** The canonical measurement in metres (> 0), along `axis`. */
  sizeM: number;
  axis: SizeAxis;
  silhouette: SilhouetteId;
  /**
   * Where the figure comes from, in words. Always set, and always truthful:
   * for a landmark it names the article that states the height, for an
   * everyday object it says plainly that the value is a typical one.
   */
  source: string;
  /** Only set when a specific page really does state the figure. */
  sourceUrl?: string;
  /** Short fact shown on reveal. */
  note?: string;
  /**
   * Set when the real size varies (a living animal, a model range). The UI
   * shows it so a rounded typical value is never passed off as exact.
   */
  precision?: string;
}

/** The reference side and the target side of one comparison. */
export type SizeSide = SizeObject;

/**
 * Per-round payload: a reference shown at a known size and a target whose
 * size the player estimates by scaling its silhouette.
 */
export interface SizeLevelData {
  reference: SizeSide;
  target: SizeSide;
  /**
   * The ratio (target/reference) the target silhouette STARTS at, relative to
   * the true ratio. Never 1 — that would hand over the answer. Deterministic
   * per round, see generator.ts.
   */
  startBias: number;
}

export interface SizeRound {
  data: SizeLevelData;
  /** The estimated size of the target in metres, once locked in. */
  guess: number | null;
  points: number;
  /** Ordinary relative error |guess − true| / true (0 = perfect). */
  relErr: number;
}

export interface SizeState {
  rounds: SizeRound[];
  current: number;
  finished: boolean;
}

export type SizeMove = { type: "submit"; value: number } | { type: "pass" };
