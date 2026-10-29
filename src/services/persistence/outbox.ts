import type { StorageLike } from "./localAdapter";
import type { SaveArchiveResultInput, SaveDailyResultInput } from "./types";

/**
 * Saves that could not reach the server (no connection), kept on the device
 * per account until they can be sent. Nothing here is trusted later: a queued
 * daily result is still replayed and checked by the server when it arrives,
 * and refused if its day has closed in the meantime.
 */
export type OutboxEntry =
  | { kind: "daily"; input: SaveDailyResultInput; queuedAt: string }
  | {
      kind: "free";
      id: string;
      input: SaveArchiveResultInput;
      queuedAt: string;
    };

const MAX_ENTRIES = 200;

export class Outbox {
  private readonly key: string;
  private readonly storage: StorageLike;

  constructor(userId: string, storage: StorageLike) {
    this.key = `sgp:outbox:${userId}`;
    this.storage = storage;
  }

  list(): OutboxEntry[] {
    try {
      const raw = this.storage.getItem(this.key);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
    } catch {
      return [];
    }
  }

  add(entry: OutboxEntry): void {
    const all = this.list();
    // One pending official result per game and day, like the database.
    if (
      entry.kind === "daily" &&
      all.some(
        (e) =>
          e.kind === "daily" &&
          e.input.gameId === entry.input.gameId &&
          e.input.challengeDate === entry.input.challengeDate,
      )
    )
      return;
    all.push(entry);
    this.write(all.slice(-MAX_ENTRIES));
  }

  remove(match: (e: OutboxEntry) => boolean): void {
    this.write(this.list().filter((e) => !match(e)));
  }

  private write(entries: OutboxEntry[]): void {
    try {
      if (entries.length === 0) this.storage.removeItem(this.key);
      else this.storage.setItem(this.key, JSON.stringify(entries));
    } catch {
      /* storage full or unavailable: the save is lost, and was reported */
    }
  }
}

function isEntry(v: unknown): v is OutboxEntry {
  if (typeof v !== "object" || v === null) return false;
  const e = v as Record<string, unknown>;
  if (typeof e.queuedAt !== "string" || typeof e.input !== "object" || !e.input)
    return false;
  return e.kind === "daily" || (e.kind === "free" && typeof e.id === "string");
}
