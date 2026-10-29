import type { GameId } from "@/types/game";

/**
 * What happened to a save, told to whoever is listening (the save notice in
 * the shell). Saving is otherwise invisible; with an account it goes over the
 * network and can fail, so the player must be told.
 */
export type SaveEvent =
  | { kind: "saving"; gameId: GameId }
  | { kind: "saved"; gameId: GameId; adjustedScore?: number }
  | { kind: "already"; gameId: GameId }
  | { kind: "queued"; gameId: GameId }
  | { kind: "synced"; count: number }
  | { kind: "rejected"; gameId: GameId; reason: SaveRejection };

export type SaveRejection =
  | "challenge_closed"
  | "version_mismatch"
  | "invalid"
  | "unauthorized"
  | "rate_limited"
  | "server_error";

type Listener = (e: SaveEvent) => void;
const listeners = new Set<Listener>();

export function onSaveEvent(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitSaveEvent(e: SaveEvent): void {
  for (const fn of listeners) fn(e);
}

/** A save the server refused, with the reason. Not retried. */
export class SaveRejectedError extends Error {
  readonly reason: SaveRejection;
  constructor(reason: SaveRejection) {
    super(reason);
    this.name = "SaveRejectedError";
    this.reason = reason;
  }
}

/** The network was unavailable: worth retrying later. */
export class SaveOfflineError extends Error {
  constructor() {
    super("offline");
    this.name = "SaveOfflineError";
  }
}
