// @vitest-environment node
/// <reference types="node" />
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./testing/testDb";
import type { Database } from "@/services/supabase/database.types";

/**
 * The hand-written database types (src/services/supabase/database.types.ts)
 * against the schema the migrations really build.
 */

type Tables = Database["public"]["Tables"];
type Functions = Database["public"]["Functions"];

const COLUMNS = {
  games: ["id", "name", "rounds", "max_score"],
  profiles: [
    "id",
    "username",
    "display_name",
    "show_in_leaderboards",
    "created_at",
    "updated_at",
  ],
  user_preferences: ["user_id", "key", "value", "updated_at"],
  daily_results: [
    "id",
    "user_id",
    "game_id",
    "challenge_date",
    "score",
    "won",
    "completed",
    "rounds",
    "answers",
    "detail",
    "duration_ms",
    "verification",
    "generator_version",
    "created_at",
  ],
  free_results: [
    "id",
    "user_id",
    "game_id",
    "level_id",
    "mode",
    "score",
    "won",
    "completed",
    "detail",
    "created_at",
  ],
} as const satisfies Record<keyof Tables, readonly string[]>;

// Compile-time half: the lists above are exactly the keys of each Row type.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const columnsMatchTypes: {
  [K in keyof Tables]: Same<
    keyof Tables[K]["Row"],
    (typeof COLUMNS)[K][number]
  >;
} = {
  games: true,
  profiles: true,
  user_preferences: true,
  daily_results: true,
  free_results: true,
};

const FUNCTIONS: (keyof Functions)[] = [
  "username_available",
  "import_guest_results",
  "daily_leaderboard",
  "my_daily_standing",
  "weekly_leaderboard",
];

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
}, 60_000);
afterAll(async () => t?.close());

describe("database.types.ts matches the migrations", () => {
  it("has the same tables and columns", async () => {
    expect(Object.values(columnsMatchTypes).every(Boolean)).toBe(true);
    const res = await t.db.query<{ table_name: string; column_name: string }>(
      `select table_name, column_name from information_schema.columns
        where table_schema = 'public' order by table_name, ordinal_position`,
    );
    const actual: Record<string, string[]> = {};
    for (const r of res.rows) (actual[r.table_name] ??= []).push(r.column_name);
    expect(actual).toEqual(
      Object.fromEntries(Object.entries(COLUMNS).map(([k, v]) => [k, [...v]])),
    );
  });

  it("declares every function the client may call, and only those", async () => {
    const res = await t.db.query<{ proname: string }>(
      `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and has_function_privilege('authenticated', p.oid, 'execute')
        order by 1`,
    );
    expect(res.rows.map((r) => r.proname).sort()).toEqual(
      [...FUNCTIONS].sort(),
    );
  });
});
