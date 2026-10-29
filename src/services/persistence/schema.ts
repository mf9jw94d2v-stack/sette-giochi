import { GAME_IDS, type GameId } from "@/types/game";
import type { ArchiveResultRecord, DailyResultRecord } from "./types";

/**
 * Everything in localStorage is under the player's control: they can open dev
 * tools and type anything into it, and an old build may have written a shape
 * we no longer use. So we never trust what comes back — we parse it.
 *
 * A record that does not fit is DROPPED, not repaired and not thrown on: one
 * corrupt row must not take down the stats page. `parseRecords` reports how
 * many it dropped so the caller can say so, and never logs the content.
 *
 * WHY BY HAND AND NOT ZOD. Zod is in the project and these are exactly the
 * schemas it is for, but persistence is loaded on every page, and adding it
 * here measured **+91 kB** on the main bundle (448 → 539 kB, +26 kB gzipped)
 * to check three small record shapes. Measured, not guessed — see ADR-0009.
 * Zod stays for the Supabase boundary, where responses are larger, more
 * varied, and genuinely remote.
 */

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const GAME_ID_SET: ReadonlySet<string> = new Set(GAME_IDS);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isGameId(v: unknown): v is GameId {
  return typeof v === "string" && GAME_ID_SET.has(v);
}

function isDay(v: unknown): v is string {
  return typeof v === "string" && DAY.test(v);
}

function isScore(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isOptionalDetail(
  v: unknown,
): v is Record<string, unknown> | undefined {
  return v === undefined || isRecord(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

export function isDailyResult(v: unknown): v is DailyResultRecord {
  if (!isRecord(v)) return false;
  return (
    isGameId(v.gameId) &&
    isDay(v.challengeDate) &&
    isScore(v.score) &&
    typeof v.won === "boolean" &&
    typeof v.completed === "boolean" &&
    isNonEmptyString(v.createdAt) &&
    isOptionalDetail(v.detail)
  );
}

export function isArchiveResult(v: unknown): v is ArchiveResultRecord {
  if (!isRecord(v)) return false;
  return (
    isNonEmptyString(v.id) &&
    isGameId(v.gameId) &&
    isNonEmptyString(v.levelId) &&
    // "daily" is deliberately not accepted: an official result must never be
    // readable out of the archive store.
    (v.mode === "archive" || v.mode === "practice") &&
    isScore(v.score) &&
    typeof v.won === "boolean" &&
    typeof v.completed === "boolean" &&
    isNonEmptyString(v.createdAt) &&
    isOptionalDetail(v.detail)
  );
}

export interface ParseOutcome<T> {
  records: T[];
  /** How many stored rows were unreadable and therefore ignored. */
  dropped: number;
}

/** Parse a stored array, keeping only the rows that are genuinely valid. */
export function parseRecords<T>(
  isValid: (v: unknown) => v is T,
  raw: unknown,
): ParseOutcome<T> {
  if (!Array.isArray(raw)) return { records: [], dropped: 0 };
  const records: T[] = [];
  let dropped = 0;
  for (const item of raw) {
    if (isValid(item)) records.push(item);
    else dropped++;
  }
  return { records, dropped };
}

export const parseDailyResults = (
  raw: unknown,
): ParseOutcome<DailyResultRecord> => parseRecords(isDailyResult, raw);

export const parseArchiveResults = (
  raw: unknown,
): ParseOutcome<ArchiveResultRecord> => parseRecords(isArchiveResult, raw);
