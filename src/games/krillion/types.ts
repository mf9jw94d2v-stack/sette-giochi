/** The six rarity tiers, from the most common answer to the rarest. */
export type KrillionTier =
  "plankton" | "tooClever" | "schooler" | "rare" | "deepCut" | "krillion";

export const TIER_ORDER: KrillionTier[] = [
  "plankton",
  "tooClever",
  "schooler",
  "rare",
  "deepCut",
  "krillion",
];

/** Points per tier (depth in metres = points × 10). */
export const TIER_POINTS: Record<KrillionTier, number> = {
  plankton: 10,
  tooClever: 15,
  schooler: 30,
  rare: 60,
  deepCut: 85,
  krillion: 100,
};

export const TIER_LABEL: Record<KrillionTier, string> = {
  plankton: "Plancton",
  tooClever: "Troppo furba",
  schooler: "Di banco",
  rare: "Rara",
  deepCut: "Chicca",
  krillion: "Introvabile",
};

/** One accepted answer and the rarity tier it scores. */
export interface KrillionAnswer {
  /** Canonical display spelling. */
  label: string;
  tier: KrillionTier;
  /** Extra spellings that should also match. */
  aliases?: string[];
}

export interface KrillionPrompt {
  id: string;
  /**
   * How hard it is to think of a RARE answer in this domain, authored by hand.
   * The shape of the answer list cannot express this: "nomina un uccello" and
   * "nomina un'unità di misura" can have identical tier counts and still be
   * worlds apart for a player. Authored judgement, clearly labelled as such.
   */
  domainDifficulty: "easy" | "medium" | "hard";
  /** The open prompt, e.g. "Nomina un uccello". */
  prompt: string;
  /** Optional rule shown in brackets. */
  constraint?: string;
  answers: KrillionAnswer[];
}

/** Per-round payload (one prompt + its accepted answers). */
export type KrillionLevelData = KrillionPrompt;

export interface KrillionRound {
  data: KrillionLevelData;
  /** The matched answer the player gave, if any. */
  answer: string | null;
  tier: KrillionTier | null;
  points: number;
}

export interface KrillionState {
  rounds: KrillionRound[];
  current: number;
  finished: boolean;
}

export type KrillionMove =
  { type: "accept"; answer: string; tier: KrillionTier } | { type: "pass" };
