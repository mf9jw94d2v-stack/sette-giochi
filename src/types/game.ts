/**
 * Core game contracts for the Seven Games Platform.
 *
 * Architectural principle: SHARE INFRASTRUCTURE, NOT MECHANICS.
 * Each game keeps its own engine, rules, scoring, level shape and generator.
 * The platform only requires that a game expose a small, uniform surface so
 * shared features (routing, daily challenges, archive, stats) can treat every
 * game the same way without knowing its internal rules.
 *
 * These are intentionally generic over the per-game types:
 *   - TLevel:  the data describing a single puzzle/level
 *   - TState:  the in-progress play state
 *   - TMove:   a single player action
 *   - TResult: the outcome recorded when a game ends
 */

export const GAME_IDS = [
  "krillion",
  "plain",
  "fact-map",
  "estimania",
  "size-it-up",
  "geoslice",
  "gazillion",
] as const;

export type GameId = (typeof GAME_IDS)[number];

export type Difficulty = "easy" | "medium" | "hard" | "expert";

/** Static, display-facing description of a game. */
export interface GameMetadata {
  id: GameId;
  /** Display name. */
  name: string;
  /** One-line tagline for cards. */
  tagline: string;
  /** Longer description. */
  description: string;
  /** Original game this mechanic is inspired by (attribution / reference). */
  originalUrl: string;
  /** Short category label, e.g. "Geography", "Estimation". */
  category: string;
  /** Tailwind gradient classes for the card's accent (visual identity). */
  accent: string;
  /** Emoji/char used as a lightweight distinctive glyph. */
  glyph: string;
  /** Whether a playable engine is wired up yet (honest status flag). */
  status: "planned" | "prototype" | "playable";
}

/** A single generated/stored level, tagged with reproducibility metadata. */
export interface GameLevel<TLevel = unknown> {
  /** Stable unique id for this level. */
  id: string;
  gameId: GameId;
  /** The generator version that produced it (never mutate past levels). */
  generatorVersion: string;
  /** Deterministic seed used to generate it, when applicable. */
  seed?: string;
  difficulty: Difficulty;
  /** Numeric difficulty estimate (heuristic — document limits per game). */
  difficultyScore?: number;
  /** The game-specific payload. */
  data: TLevel;
  /** Content hash used for deduplication. */
  contentHash: string;
  createdAt: string;
}

export type LevelStatus =
  "generated" | "validated" | "published" | "rejected" | "quarantined";

/** Result of validating a level. */
export interface ValidationResult {
  ok: boolean;
  /** Reasons a level failed (empty when ok). */
  reasons: string[];
  /** How confident we are the level is correct/solvable. */
  confidence: "verified" | "heuristic" | "unverified";
}

/** The outcome recorded when a play session ends. */
export interface GameResult {
  completed: boolean;
  /** Game-specific primary score (higher is better unless game says otherwise). */
  score: number;
  /** Whether the player "won" per the game's own win condition. */
  won: boolean;
  /** Milliseconds spent, when tracked. */
  durationMs?: number;
  /** Arbitrary game-specific detail, safe to persist. */
  detail?: Record<string, unknown>;
}

/** Deterministic pseudo-random source so generation is reproducible. */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max]. */
  int(min: number, max: number): number;
  /** Pick one element. */
  pick<T>(items: readonly T[]): T;
}

/** Engine: pure game logic, no React, no I/O. */
export interface GameEngine<TLevel, TState, TMove, TResult = GameResult> {
  /** Build fresh play state from a level. */
  init(level: GameLevel<TLevel>): TState;
  /** Apply a move, returning the next state (immutably). */
  applyMove(state: TState, move: TMove): TState;
  /** Whether the session is finished. */
  isTerminal(state: TState): boolean;
  /** Score/outcome for a (usually terminal) state. */
  getResult(state: TState): TResult;
}

/** Generator: produces levels deterministically from a seed. */
export interface LevelGenerator<TLevel> {
  version: string;
  /** Generate one level from a seed. */
  generate(seed: string): GameLevel<TLevel>;
}

/** Validator: independent checks before a level may be published. */
export interface LevelValidator<TLevel> {
  /** Structural + rule checks (first pass). */
  validateStructure(level: GameLevel<TLevel>): ValidationResult;
  /**
   * Independent correctness check (second pass). Should NOT just re-call the
   * generator's own logic — use a distinct method where one exists.
   */
  verifySolution(level: GameLevel<TLevel>): ValidationResult;
  /** Stable content signature for deduplication (beyond the id). */
  contentHash(level: GameLevel<TLevel>): string;
}

/** The full module a game registers with the platform. */
export interface GameModule<
  TLevel = unknown,
  TState = unknown,
  TMove = unknown,
  TResult = GameResult,
> {
  meta: GameMetadata;
  engine: GameEngine<TLevel, TState, TMove, TResult>;
  generator?: LevelGenerator<TLevel>;
  validator?: LevelValidator<TLevel>;
}
