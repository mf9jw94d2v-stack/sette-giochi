import type { GameId } from "@/types/game";
import type {
  ArchiveResultRecord,
  DailyResultRecord,
  PersistenceAdapter,
  PlayerDataExport,
  SaveArchiveResultInput,
  SaveDailyResultInput,
  SaveOutcome,
} from "./types";
import { parseArchiveResults, parseDailyResults } from "./schema";

const DAILY_KEY = "sgp:daily-results";
const ARCHIVE_KEY = "sgp:archive-results";
const PREF_PREFIX = "sgp:pref:";

/** Minimal Storage surface (window.localStorage satisfies this). */
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** A memory-backed Storage, used when localStorage is unavailable. */
function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
  };
}

function safeStorage(): StorageLike {
  try {
    if (typeof localStorage !== "undefined") {
      const probe = "__sgp_probe__";
      localStorage.setItem(probe, "1");
      localStorage.removeItem(probe);
      return localStorage;
    }
  } catch {
    /* fall through to memory */
  }
  return createMemoryStorage();
}

function readRaw(storage: StorageLike, key: string): unknown {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Read a stored list, validating every row (see ./schema.ts). Rows the player
 * or an older build left in an unusable shape are dropped rather than handed
 * to the rest of the app as if they were real results.
 */
function readRecords<T>(
  storage: StorageLike,
  key: string,
  parse: (raw: unknown) => { records: T[]; dropped: number },
): T[] {
  const { records, dropped } = parse(readRaw(storage, key));
  if (dropped > 0 && typeof console !== "undefined") {
    // The count only — never the content, which is the player's data.
    console.warn(
      `[persistence] ${dropped} risultati salvati non leggibili sono stati ignorati (${key}).`,
    );
  }
  return records;
}

function writeJson(storage: StorageLike, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / unavailable */
  }
}

function newId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * localStorage-backed persistence for single-device development, with no
 * backend. See the integrity note on {@link PersistenceAdapter}: daily saves
 * are idempotent per (gameId, challengeDate) but only best-effort here.
 */
export class LocalPersistenceAdapter implements PersistenceAdapter {
  readonly name = "local";
  private readonly storage: StorageLike;

  constructor(storage: StorageLike = safeStorage()) {
    this.storage = storage;
  }

  async getDailyResult(
    gameId: GameId,
    challengeDate: string,
  ): Promise<DailyResultRecord | null> {
    const all = readRecords(this.storage, DAILY_KEY, parseDailyResults);
    return (
      all.find(
        (r) => r.gameId === gameId && r.challengeDate === challengeDate,
      ) ?? null
    );
  }

  async saveDailyResult(
    input: SaveDailyResultInput,
  ): Promise<SaveOutcome<DailyResultRecord>> {
    const all = readRecords(this.storage, DAILY_KEY, parseDailyResults);
    const existing = all.find(
      (r) =>
        r.gameId === input.gameId && r.challengeDate === input.challengeDate,
    );
    // Idempotent: never overwrite an existing official result.
    if (existing) return { created: false, record: existing };

    const record: DailyResultRecord = {
      gameId: input.gameId,
      challengeDate: input.challengeDate,
      score: input.score,
      won: input.won,
      completed: input.completed,
      detail: input.detail,
      createdAt: new Date().toISOString(),
    };
    all.push(record);
    writeJson(this.storage, DAILY_KEY, all);
    return { created: true, record };
  }

  async listDailyResults(gameId?: GameId): Promise<DailyResultRecord[]> {
    const all = readRecords(this.storage, DAILY_KEY, parseDailyResults);
    const filtered = gameId ? all.filter((r) => r.gameId === gameId) : all;
    return [...filtered].sort((a, b) =>
      b.challengeDate.localeCompare(a.challengeDate),
    );
  }

  async saveArchiveResult(
    input: SaveArchiveResultInput,
  ): Promise<ArchiveResultRecord> {
    const all = readRecords(this.storage, ARCHIVE_KEY, parseArchiveResults);
    const record: ArchiveResultRecord = {
      id: newId(),
      gameId: input.gameId,
      levelId: input.levelId,
      mode: input.mode,
      score: input.score,
      won: input.won,
      completed: input.completed,
      detail: input.detail,
      createdAt: new Date().toISOString(),
    };
    all.push(record);
    writeJson(this.storage, ARCHIVE_KEY, all);
    return record;
  }

  async listArchiveResults(gameId?: GameId): Promise<ArchiveResultRecord[]> {
    const all = readRecords(this.storage, ARCHIVE_KEY, parseArchiveResults);
    const filtered = gameId ? all.filter((r) => r.gameId === gameId) : all;
    return [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getPreference(key: string): Promise<string | null> {
    return this.storage.getItem(PREF_PREFIX + key);
  }

  async setPreference(key: string, value: string): Promise<void> {
    this.storage.setItem(PREF_PREFIX + key, value);
  }

  async exportAll(): Promise<PlayerDataExport> {
    const preferences: Record<string, string> = {};
    if (typeof localStorage !== "undefined" && this.storage === localStorage) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(PREF_PREFIX)) continue;
        const value = localStorage.getItem(key);
        if (value !== null) preferences[key.slice(PREF_PREFIX.length)] = value;
      }
    }
    return {
      format: "seven-games-platform/player-export@1",
      exportedAt: new Date().toISOString(),
      source: this.name,
      dailyResults: await this.listDailyResults(),
      archiveResults: await this.listArchiveResults(),
      preferences,
    };
  }

  async eraseAll(): Promise<void> {
    this.storage.removeItem(DAILY_KEY);
    this.storage.removeItem(ARCHIVE_KEY);
    if (typeof localStorage !== "undefined" && this.storage === localStorage) {
      const prefKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(PREF_PREFIX)) prefKeys.push(key);
      }
      for (const key of prefKeys) localStorage.removeItem(key);
    }
  }
}
