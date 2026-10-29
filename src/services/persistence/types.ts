import type { GameId } from "@/types/game";

/** How a session was played. Official streaks count `daily` only. */
export type GameMode = "daily" | "archive" | "practice";

/** One official daily result. Unique per (user, game, challengeDate). */
export interface DailyResultRecord {
  gameId: GameId;
  /** The challenge day this result belongs to, `YYYY-MM-DD`. */
  challengeDate: string;
  score: number;
  won: boolean;
  completed: boolean;
  detail?: Record<string, unknown>;
  createdAt: string;
  /**
   * Where the score comes from. Absent on device-only results.
   * - "server_replay": recomputed by the server from the answers;
   * - "guest_import": copied from a guest session, not verified;
   * - "pending": finished offline, waiting to be sent to the account.
   */
  verification?: "server_replay" | "guest_import" | "pending";
}

/** A free-play (archive/practice) result — never affects official stats. */
export interface ArchiveResultRecord {
  id: string;
  gameId: GameId;
  levelId: string;
  mode: Exclude<GameMode, "daily">;
  score: number;
  won: boolean;
  completed: boolean;
  detail?: Record<string, unknown>;
  createdAt: string;
}

export interface SaveDailyResultInput {
  gameId: GameId;
  challengeDate: string;
  score: number;
  won: boolean;
  completed: boolean;
  detail?: Record<string, unknown>;
  /**
   * The player's answers, round by round (src/games/replay.ts). The account
   * backend replays them to recompute the score; the device-only adapter
   * does not need them.
   */
  answers?: unknown[];
  /** The generator version the board was built with. */
  generatorVersion?: string;
}

export interface SaveArchiveResultInput {
  gameId: GameId;
  levelId: string;
  mode: Exclude<GameMode, "daily">;
  score: number;
  won: boolean;
  completed: boolean;
  detail?: Record<string, unknown>;
}

/** Result of an idempotent save: `created` is false when one already existed. */
export interface SaveOutcome<T> {
  created: boolean;
  record: T;
  /** Kept on the device to be sent later (no connection). */
  queued?: boolean;
  /** The server recomputed a different score from the answers. */
  scoreAdjusted?: boolean;
}

/**
 * Storage surface the platform depends on. Implemented locally (localStorage)
 * and, later, by Supabase. All methods are async so the Supabase adapter is a
 * drop-in replacement.
 *
 * INTEGRITY CONTRACT: `saveDailyResult` is idempotent per
 * (gameId, challengeDate) — a second save for the same day must NOT overwrite
 * the first and must report `created: false`. Locally this is best-effort,
 * single-device; the Supabase adapter enforces it with a DB unique constraint
 * and a transaction (see docs/database-design.md).
 */
export interface PersistenceAdapter {
  readonly name: string;

  getDailyResult(
    gameId: GameId,
    challengeDate: string,
  ): Promise<DailyResultRecord | null>;

  saveDailyResult(
    input: SaveDailyResultInput,
  ): Promise<SaveOutcome<DailyResultRecord>>;

  /** All daily results, optionally filtered by game, newest first. */
  listDailyResults(gameId?: GameId): Promise<DailyResultRecord[]>;

  saveArchiveResult(
    input: SaveArchiveResultInput,
  ): Promise<ArchiveResultRecord>;

  listArchiveResults(gameId?: GameId): Promise<ArchiveResultRecord[]>;

  getPreference(key: string): Promise<string | null>;
  setPreference(key: string, value: string): Promise<void>;

  /**
   * Everything this adapter holds about the player, for the "export my data"
   * right (docs/privacy-and-data.md). Must contain no secrets.
   */
  exportAll(): Promise<PlayerDataExport>;

  /**
   * Erase everything this adapter holds about the player. Irreversible, and
   * only ever called from an explicit, confirmed user action.
   */
  eraseAll(): Promise<void>;
}

/** The shape handed to the player when they export their data. */
export interface PlayerDataExport {
  /** Format version, so a future importer can tell what it is reading. */
  format: "seven-games-platform/player-export@1";
  exportedAt: string;
  /** Which adapter produced it (e.g. "local", "supabase"). */
  source: string;
  /** The public profile, when the data comes from an account. */
  profile?: Record<string, unknown>;
  dailyResults: DailyResultRecord[];
  archiveResults: ArchiveResultRecord[];
  preferences: Record<string, string>;
}
