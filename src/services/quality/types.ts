import type {
  Difficulty,
  GameId,
  LevelStatus,
  ValidationResult,
} from "@/types/game";

/** Why a level did not reach `published`. */
export type RejectionReason =
  "generation-error" | "structure" | "verification" | "duplicate";

/** The outcome of running one seed through the full quality pipeline. */
export interface LevelReview {
  gameId: GameId;
  seed: string;
  levelId: string | null;
  generatorVersion: string;
  /** `generated` is never a final state here — every seed ends up published,
   *  quarantined or rejected. */
  status: Exclude<LevelStatus, "generated" | "validated">;
  difficulty: Difficulty | null;
  difficultyScore: number | null;
  contentHash: string | null;
  /** Empty when the level was published. */
  reasons: string[];
  reason: RejectionReason | null;
  /** Confidence of the independent (second-pass) check. */
  confidence: ValidationResult["confidence"] | null;
  /** When this seed duplicates an earlier one, the seed that owns the hash. */
  duplicateOf: string | null;
  /** Wall-clock milliseconds for generation + both validation passes. */
  elapsedMs: number;
}

/** Aggregated, measured metrics for one game. Every number comes from a run. */
export interface GameQualityReport {
  gameId: GameId;
  generatorVersion: string;
  /** Seeds fed into the generator. */
  generated: number;
  /** Levels that passed BOTH validation passes (before dedup). */
  validated: number;
  published: number;
  rejected: number;
  quarantined: number;
  duplicates: number;
  /** published / generated, 0..1. `null` when nothing was generated. */
  validityRate: number | null;
  difficultyDistribution: Record<Difficulty, number>;
  /** Count per failure reason, for the quarantine view. */
  reasonCounts: Record<RejectionReason, number>;
  /** Confidence of the independent check, counted over published levels. */
  confidenceCounts: Record<ValidationResult["confidence"], number>;
  totalMs: number;
  avgMs: number | null;
  /** Every seed that did not publish, with its reasons. */
  failures: LevelReview[];
  /** How many distinct content hashes the run produced (real variety). */
  distinctLevels: number;
}

export interface QualityReport {
  /** ISO timestamp of the run. */
  runAt: string;
  /** The seed window used, so the run is reproducible. */
  seeds: { kind: "dates"; from: string; to: string; count: number };
  games: GameQualityReport[];
  totals: {
    generated: number;
    published: number;
    quarantined: number;
    rejected: number;
    duplicates: number;
    totalMs: number;
  };
}
