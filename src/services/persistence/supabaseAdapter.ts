import type { GameId } from "@/types/game";
import type { AppSupabaseClient } from "@/services/supabase/client";
import type { Json } from "@/services/supabase/database.types";
import { isArchiveResult, isDailyResult } from "./schema";
import { Outbox, type OutboxEntry } from "./outbox";
import type { StorageLike } from "./localAdapter";
import {
  emitSaveEvent,
  SaveOfflineError,
  SaveRejectedError,
  type SaveRejection,
} from "./saveEvents";
import type {
  ArchiveResultRecord,
  DailyResultRecord,
  PersistenceAdapter,
  PlayerDataExport,
  SaveArchiveResultInput,
  SaveDailyResultInput,
  SaveOutcome,
} from "./types";

/**
 * Persistence for a signed-in player, backed by Supabase.
 *
 * - Reads go straight to the tables; Row Level Security returns only the
 *   player's own rows (the explicit user filter is for the index).
 * - An official daily result is NEVER inserted from here: it is sent to the
 *   `submit-daily` Edge Function, which replays the answers and stores the
 *   score it recomputes.
 * - Without a connection, saves wait in an on-device outbox and are sent when
 *   the browser is back online.
 */

const DAILY_COLUMNS =
  "game_id, challenge_date, score, won, completed, detail, verification, created_at";
const FREE_COLUMNS =
  "id, game_id, level_id, mode, score, won, completed, detail, created_at";
const PAGE = 1000;
/** Upper bound on rows read in one go: years of daily play. */
const MAX_ROWS = 20_000;

interface DailyRow {
  game_id: string;
  challenge_date: string;
  score: number;
  won: boolean;
  completed: boolean;
  detail: Json;
  verification: string;
  created_at: string;
}

interface FreeRow {
  id: string;
  game_id: string;
  level_id: string;
  mode: string;
  score: number;
  won: boolean;
  completed: boolean;
  detail: Json;
  created_at: string;
}

function objectOrUndefined(v: unknown): Record<string, unknown> | undefined {
  return typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}

/** Map a database row; null if it does not fit (never trust the wire). */
export function dailyFromRow(row: DailyRow): DailyResultRecord | null {
  const record = {
    gameId: row.game_id,
    challengeDate: row.challenge_date,
    score: row.score,
    won: row.won,
    completed: row.completed,
    detail: objectOrUndefined(row.detail),
    createdAt: row.created_at,
    verification:
      row.verification === "guest_import" ? "guest_import" : "server_replay",
  };
  return isDailyResult(record) ? (record as DailyResultRecord) : null;
}

export function freeFromRow(row: FreeRow): ArchiveResultRecord | null {
  const record = {
    id: row.id,
    gameId: row.game_id,
    levelId: row.level_id,
    mode: row.mode,
    score: row.score,
    won: row.won,
    completed: row.completed,
    detail: objectOrUndefined(row.detail),
    createdAt: row.created_at,
  };
  return isArchiveResult(record) ? record : null;
}

function pendingDaily(
  input: SaveDailyResultInput,
  at: string,
): DailyResultRecord {
  return {
    gameId: input.gameId,
    challengeDate: input.challengeDate,
    score: input.score,
    won: input.won,
    completed: input.completed,
    detail: input.detail,
    createdAt: at,
    verification: "pending",
  };
}

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function looksLikeNetworkFailure(message: string | undefined): boolean {
  return /failed to fetch|networkerror|network request failed|fetch failed|load failed/i.test(
    message ?? "",
  );
}

function rejectionFor(code: unknown): SaveRejection {
  switch (code) {
    case "challenge_closed":
    case "version_mismatch":
    case "unauthorized":
      return code;
    case "server_error":
      return "server_error";
    default:
      return "invalid";
  }
}

function newId(): string {
  return crypto.randomUUID();
}

export class SupabasePersistenceAdapter implements PersistenceAdapter {
  readonly name = "supabase";
  private readonly client: AppSupabaseClient;
  private readonly userId: string;
  private readonly outbox: Outbox;
  private flushing: Promise<void> | null = null;

  constructor(client: AppSupabaseClient, userId: string, storage: StorageLike) {
    this.client = client;
    this.userId = userId;
    this.outbox = new Outbox(userId, storage);
  }

  // ---- official daily results -------------------------------------------

  async getDailyResult(
    gameId: GameId,
    challengeDate: string,
  ): Promise<DailyResultRecord | null> {
    const { data, error } = await this.client
      .from("daily_results")
      .select(DAILY_COLUMNS)
      .eq("user_id", this.userId)
      .eq("game_id", gameId)
      .eq("challenge_date", challengeDate)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return dailyFromRow(data);
    // A result finished offline still locks the day on this device.
    const queued = this.outbox
      .list()
      .find(
        (e) =>
          e.kind === "daily" &&
          e.input.gameId === gameId &&
          e.input.challengeDate === challengeDate,
      );
    return queued?.kind === "daily"
      ? pendingDaily(queued.input, queued.queuedAt)
      : null;
  }

  async saveDailyResult(
    input: SaveDailyResultInput,
  ): Promise<SaveOutcome<DailyResultRecord>> {
    if (!input.answers || !input.generatorVersion)
      throw new SaveRejectedError("invalid");
    try {
      return await this.submitDaily(input);
    } catch (e) {
      if (!(e instanceof SaveOfflineError)) throw e;
      const queuedAt = new Date().toISOString();
      this.outbox.add({ kind: "daily", input, queuedAt });
      return {
        created: true,
        record: pendingDaily(input, queuedAt),
        queued: true,
      };
    }
  }

  private async submitDaily(
    input: SaveDailyResultInput,
  ): Promise<SaveOutcome<DailyResultRecord>> {
    if (isOffline()) throw new SaveOfflineError();
    const { data, error } = await this.client.functions.invoke("submit-daily", {
      body: {
        gameId: input.gameId,
        challengeDate: input.challengeDate,
        answers: input.answers,
        generatorVersion: input.generatorVersion,
        clientScore: input.score,
      },
    });
    if (error) {
      // Names, not instanceof: the error classes live in the lazily loaded
      // supabase-js chunk.
      if (
        error.name === "FunctionsFetchError" ||
        error.name === "FunctionsRelayError"
      )
        throw new SaveOfflineError();
      const response = (error as { context?: unknown }).context;
      let code: unknown = undefined;
      let status = 0;
      if (response instanceof Response) {
        status = response.status;
        code = await response
          .json()
          .then((b: { error?: unknown }) => b?.error)
          .catch(() => undefined);
      }
      if (status >= 500) throw new SaveOfflineError();
      throw new SaveRejectedError(rejectionFor(code));
    }
    const body = data as {
      created?: unknown;
      scoreAdjusted?: unknown;
      record?: Record<string, unknown>;
    } | null;
    const r = body?.record;
    const record = r
      ? dailyFromRow({
          game_id: String(r.gameId),
          challenge_date: String(r.challengeDate),
          score: Number(r.score),
          won: r.won === true,
          completed: r.completed === true,
          detail: (r.detail ?? {}) as Json,
          verification: String(r.verification),
          created_at: String(r.createdAt),
        })
      : null;
    if (!record) throw new SaveRejectedError("server_error");
    return {
      created: body?.created === true,
      record,
      scoreAdjusted: body?.scoreAdjusted === true,
    };
  }

  async listDailyResults(gameId?: GameId): Promise<DailyResultRecord[]> {
    const rows = await this.readAll<DailyRow>((from, to) => {
      let q = this.client
        .from("daily_results")
        .select(DAILY_COLUMNS)
        .eq("user_id", this.userId);
      if (gameId) q = q.eq("game_id", gameId);
      return q
        .order("challenge_date", { ascending: false })
        .order("game_id")
        .range(from, to);
    });
    const records = rows.map(dailyFromRow).filter((r) => r !== null);
    const have = new Set(records.map((r) => `${r.gameId}|${r.challengeDate}`));
    for (const e of this.outbox.list()) {
      if (e.kind !== "daily") continue;
      if (gameId && e.input.gameId !== gameId) continue;
      if (have.has(`${e.input.gameId}|${e.input.challengeDate}`)) continue;
      records.push(pendingDaily(e.input, e.queuedAt));
    }
    return records.sort((a, b) =>
      b.challengeDate.localeCompare(a.challengeDate),
    );
  }

  // ---- practice and archive -------------------------------------------

  async saveArchiveResult(
    input: SaveArchiveResultInput,
  ): Promise<ArchiveResultRecord> {
    const id = newId();
    try {
      return await this.insertFree(id, input);
    } catch (e) {
      if (!(e instanceof SaveOfflineError)) throw e;
      const queuedAt = new Date().toISOString();
      this.outbox.add({ kind: "free", id, input, queuedAt });
      return { id, ...input, createdAt: queuedAt };
    }
  }

  private async insertFree(
    id: string,
    input: SaveArchiveResultInput,
  ): Promise<ArchiveResultRecord> {
    if (isOffline()) throw new SaveOfflineError();
    const { data, error } = await this.client
      .from("free_results")
      .insert({
        id,
        game_id: input.gameId,
        level_id: input.levelId,
        mode: input.mode,
        score: input.score,
        won: input.won,
        completed: input.completed,
        detail: (input.detail ?? {}) as Json,
      })
      .select(FREE_COLUMNS)
      .single();
    if (error) {
      if (error.code === "23505") {
        // Already there: a retry of a save that did arrive.
        return { id, ...input, createdAt: new Date().toISOString() };
      }
      if (looksLikeNetworkFailure(error.message)) throw new SaveOfflineError();
      if (error.message.includes("rate_limited"))
        throw new SaveRejectedError("rate_limited");
      throw new SaveRejectedError(
        error.code === "42501" ? "unauthorized" : "invalid",
      );
    }
    const record = freeFromRow(data);
    if (!record) throw new SaveRejectedError("server_error");
    return record;
  }

  async listArchiveResults(gameId?: GameId): Promise<ArchiveResultRecord[]> {
    const rows = await this.readAll<FreeRow>((from, to) => {
      let q = this.client
        .from("free_results")
        .select(FREE_COLUMNS)
        .eq("user_id", this.userId);
      if (gameId) q = q.eq("game_id", gameId);
      return q.order("created_at", { ascending: false }).range(from, to);
    });
    const records = rows.map(freeFromRow).filter((r) => r !== null);
    const have = new Set(records.map((r) => r.id));
    for (const e of this.outbox.list()) {
      if (e.kind !== "free" || have.has(e.id)) continue;
      if (gameId && e.input.gameId !== gameId) continue;
      records.push({ id: e.id, ...e.input, createdAt: e.queuedAt });
    }
    return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // ---- preferences -----------------------------------------------------

  async getPreference(key: string): Promise<string | null> {
    const { data, error } = await this.client
      .from("user_preferences")
      .select("value")
      .eq("user_id", this.userId)
      .eq("key", key)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data?.value ?? null;
  }

  async setPreference(key: string, value: string): Promise<void> {
    const { error } = await this.client
      .from("user_preferences")
      .upsert({ key, value }, { onConflict: "user_id,key" });
    if (error) throw new Error(error.message);
  }

  // ---- the player's data rights ---------------------------------------

  async exportAll(): Promise<PlayerDataExport> {
    const [profile, prefs, dailyResults, archiveResults] = await Promise.all([
      this.client
        .from("profiles")
        .select(
          "username, display_name, show_in_leaderboards, created_at, updated_at",
        )
        .eq("id", this.userId)
        .maybeSingle(),
      this.client
        .from("user_preferences")
        .select("key, value")
        .eq("user_id", this.userId),
      this.listDailyResults(),
      this.listArchiveResults(),
    ]);
    if (profile.error) throw new Error(profile.error.message);
    if (prefs.error) throw new Error(prefs.error.message);
    return {
      format: "seven-games-platform/player-export@1",
      exportedAt: new Date().toISOString(),
      source: this.name,
      profile: profile.data ?? undefined,
      dailyResults,
      archiveResults,
      preferences: Object.fromEntries(
        (prefs.data ?? []).map((p) => [p.key, p.value]),
      ),
    };
  }

  /**
   * Not offered for an account: deleting official results would let a player
   * wipe a day and play it again. Deleting the account removes everything.
   */
  async eraseAll(): Promise<void> {
    throw new Error("account_erase_not_supported");
  }

  // ---- outbox ------------------------------------------------------------

  /** Pending saves still waiting on this device. */
  pendingCount(): number {
    return this.outbox.list().length;
  }

  /** Send what is waiting. Safe to call often; runs one pass at a time. */
  flush(): Promise<void> {
    this.flushing ??= this.flushOnce().finally(() => {
      this.flushing = null;
    });
    return this.flushing;
  }

  private async flushOnce(): Promise<void> {
    let sent = 0;
    for (const entry of this.outbox.list()) {
      try {
        if (entry.kind === "daily") await this.submitDaily(entry.input);
        else await this.insertFree(entry.id, entry.input);
        this.outbox.remove((e) => sameEntry(e, entry));
        sent++;
      } catch (e) {
        if (e instanceof SaveOfflineError) break;
        this.outbox.remove((x) => sameEntry(x, entry));
        if (e instanceof SaveRejectedError && entry.kind === "daily")
          emitSaveEvent({
            kind: "rejected",
            gameId: entry.input.gameId,
            reason: e.reason,
          });
      }
    }
    if (sent > 0) emitSaveEvent({ kind: "synced", count: sent });
  }

  private async readAll<T>(
    page: (
      from: number,
      to: number,
    ) => PromiseLike<{
      data: unknown[] | null;
      error: { message: string } | null;
    }>,
  ): Promise<T[]> {
    const out: T[] = [];
    for (let from = 0; from < MAX_ROWS; from += PAGE) {
      const { data, error } = await page(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as T[];
      out.push(...rows);
      if (rows.length < PAGE) break;
    }
    return out;
  }
}

function sameEntry(a: OutboxEntry, b: OutboxEntry): boolean {
  if (a.kind === "free" && b.kind === "free") return a.id === b.id;
  if (a.kind === "daily" && b.kind === "daily")
    return (
      a.input.gameId === b.input.gameId &&
      a.input.challengeDate === b.input.challengeDate
    );
  return false;
}
