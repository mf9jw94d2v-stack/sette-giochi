import { getSupabase } from "@/services/supabase/client";
import { LocalPersistenceAdapter } from "@/services/persistence/localAdapter";
import type { Json } from "@/services/supabase/database.types";

/**
 * Copy what was played as a guest on this device into the account. The
 * server re-checks every row and marks imported daily results as not
 * verified, so they count for the player's own history and streaks but never
 * for a leaderboard. The device copy is NOT deleted: it stays until the
 * player decides otherwise.
 */

const flagKey = (userId: string) => `sgp:guest-import:${userId}`;

export interface GuestSummary {
  daily: number;
  archive: number;
}

export async function guestDataSummary(): Promise<GuestSummary> {
  const local = new LocalPersistenceAdapter();
  const [daily, archive] = await Promise.all([
    local.listDailyResults(),
    local.listArchiveResults(),
  ]);
  return { daily: daily.length, archive: archive.length };
}

export function guestImportHandled(userId: string): boolean {
  try {
    return localStorage.getItem(flagKey(userId)) !== null;
  } catch {
    return true;
  }
}

/** Remember the choice (imported or declined) so the offer is not repeated. */
export function markGuestImportHandled(
  userId: string,
  how: "imported" | "declined",
): void {
  try {
    localStorage.setItem(flagKey(userId), how);
  } catch {
    /* ignore */
  }
}

export interface ImportOutcome {
  dailyImported: number;
  freeImported: number;
  skipped: number;
}

export async function importGuestResults(
  userId: string,
): Promise<ImportOutcome> {
  const local = new LocalPersistenceAdapter();
  const [daily, archive] = await Promise.all([
    local.listDailyResults(),
    local.listArchiveResults(),
  ]);
  const sb = await getSupabase();
  const { data, error } = await sb.rpc("import_guest_results", {
    p_daily: daily as unknown as Json,
    p_free: archive as unknown as Json,
  });
  if (error) throw new Error(error.message);
  const r = (data ?? {}) as Record<string, unknown>;
  markGuestImportHandled(userId, "imported");
  return {
    dailyImported: Number(r.dailyImported ?? 0),
    freeImported: Number(r.freeImported ?? 0),
    skipped: Number(r.skipped ?? 0),
  };
}
