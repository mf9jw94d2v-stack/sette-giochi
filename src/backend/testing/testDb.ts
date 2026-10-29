/// <reference types="node" />
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";

/**
 * A real PostgreSQL (PGlite: Postgres compiled to WebAssembly) with the
 * project's migrations applied on top of a small Supabase stand-in
 * (supabase/tests/supabase-shim.sql). Used to test schema, grants and RLS.
 *
 * Test-only. What this proves and what it does not is written in
 * docs/DATABASE.md ("Come sono provati").
 */

const ROOT = join(import.meta.dirname, "../../..");
const MIGRATIONS = join(ROOT, "supabase/migrations");

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

export function readMigration(name: string): string {
  return readFileSync(join(MIGRATIONS, name), "utf8");
}

export type Role = "anon" | "authenticated" | "service_role";

export interface TestDb {
  db: PGlite;
  /** Create an auth user (as Supabase Auth would on sign-up). */
  createUser(
    email: string,
    metadata?: Record<string, unknown>,
  ): Promise<string>;
  /** Run `fn` inside a transaction as an API role, optionally as a user. */
  as<T>(
    role: Role,
    userId: string | null,
    fn: (tx: Transaction) => Promise<T>,
  ): Promise<T>;
  close(): Promise<void>;
}

export async function createTestDb(): Promise<TestDb> {
  const db = new PGlite();
  await db.exec(
    readFileSync(join(ROOT, "supabase/tests/supabase-shim.sql"), "utf8"),
  );
  for (const file of migrationFiles()) await db.exec(readMigration(file));

  return {
    db,
    async createUser(email, metadata = {}) {
      const res = await db.query<{ id: string }>(
        "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
        [email, JSON.stringify(metadata)],
      );
      return res.rows[0].id;
    },
    async as(role, userId, fn) {
      return db.transaction(async (tx) => {
        await tx.exec(`set local role ${role}`);
        const claims = userId
          ? JSON.stringify({ sub: userId, role })
          : JSON.stringify({ role });
        await tx.query("select set_config('request.jwt.claims', $1, true)", [
          claims,
        ]);
        return fn(tx);
      });
    },
    close: () => db.close(),
  };
}
