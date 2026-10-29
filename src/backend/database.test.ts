// @vitest-environment node
/// <reference types="node" />
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./testing/testDb";
import { GAME_IDS, type GameId } from "@/types/game";
import { GAME_LIMITS } from "@/games/replay";

/**
 * Schema, privileges and Row Level Security, tested on a real PostgreSQL
 * with two distinct users, a guest (anon) and the service role.
 */

let t: TestDb;
let alice: string;
let bob: string;
let today: string;

const iso = (d: Date) => d.toISOString().slice(0, 10);
function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}

/** Record an official result the way the Edge Function does. */
async function record(
  userId: string,
  gameId: GameId,
  date: string,
  score: number,
): Promise<{ created: boolean; result: { score: number; id: number } }> {
  return t.as("service_role", null, async (tx) => {
    const res = await tx.query<{
      r: { created: boolean; result: { score: number; id: number } };
    }>(
      `select public.record_verified_daily_result($1, $2, $3::date, $4, true,
         5::smallint, '[1,2,3,4,5]'::jsonb, '{}'::jsonb, 1000, 'test@1') as r`,
      [userId, gameId, date, score],
    );
    return res.rows[0].r;
  });
}

beforeAll(async () => {
  t = await createTestDb();
  alice = await t.createUser("alice@example.test", { username: "alice" });
  bob = await t.createUser("bob@example.test", { username: "bob" });
  const res = await t.db.query<{ d: Date }>(
    "select private.challenge_today() as d",
  );
  today = iso(res.rows[0].d);
}, 60_000);

afterAll(async () => {
  await t?.close();
});

describe("games reference table", () => {
  it("matches the engines: same games, rounds and maximum score", async () => {
    const res = await t.db.query<{
      id: string;
      rounds: number;
      max_score: number;
    }>("select id, rounds, max_score from public.games order by id");
    expect(res.rows.map((r) => r.id).sort()).toEqual([...GAME_IDS].sort());
    for (const row of res.rows) {
      const limits = GAME_LIMITS[row.id as GameId];
      expect({ id: row.id, rounds: row.rounds, max: row.max_score }).toEqual({
        id: row.id,
        rounds: limits.rounds,
        max: limits.maxScore,
      });
    }
  });

  it("is readable by guests and players, writable by neither", async () => {
    const n = await t.as("anon", null, (tx) =>
      tx.query("select * from public.games"),
    );
    expect(n.rows).toHaveLength(7);
    await expect(
      t.as("authenticated", alice, (tx) =>
        tx.query("update public.games set max_score = 1 where id = 'plain'"),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("profiles", () => {
  it("are created on sign-up with the requested username", async () => {
    const res = await t.as("authenticated", alice, (tx) =>
      tx.query<{ username: string }>("select username from public.profiles"),
    );
    expect(res.rows).toEqual([{ username: "alice" }]);
  });

  it("fall back to a generated username when the wanted one is taken or invalid", async () => {
    const taken = await t.createUser("alice2@example.test", {
      username: "alice",
    });
    const invalid = await t.createUser("x@example.test", {
      username: "No Spaces!",
    });
    const res = await t.db.query<{ id: string; username: string }>(
      "select id, username from public.profiles where id = any($1::uuid[])",
      [[taken, invalid]],
    );
    for (const row of res.rows) {
      expect(row.username).toMatch(/^giocatore_[0-9a-f]{10}$/);
    }
  });

  it("are isolated: a player sees and changes only their own", async () => {
    const seen = await t.as("authenticated", alice, (tx) =>
      tx.query("select id from public.profiles"),
    );
    expect(seen.rows).toEqual([{ id: alice }]);
    const upd = await t.as("authenticated", alice, (tx) =>
      tx.query("update public.profiles set display_name = 'x' where id = $1", [
        bob,
      ]),
    );
    expect(upd.affectedRows).toBe(0);
    const bobRow = await t.db.query<{ display_name: string | null }>(
      "select display_name from public.profiles where id = $1",
      [bob],
    );
    expect(bobRow.rows[0].display_name).toBeNull();
  });

  it("only username, display name and visibility can be edited", async () => {
    await t.as("authenticated", alice, (tx) =>
      tx.query(
        "update public.profiles set display_name = 'Alice' where id = $1",
        [alice],
      ),
    );
    await expect(
      t.as("authenticated", alice, (tx) =>
        tx.query("update public.profiles set id = $1 where id = $2", [
          bob,
          alice,
        ]),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      t.as("authenticated", alice, (tx) =>
        tx.query(
          "update public.profiles set created_at = now() - interval '9 years'",
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("reject bad usernames and duplicates", async () => {
    await expect(
      t.as("authenticated", alice, (tx) =>
        tx.query("update public.profiles set username = 'bob' where id = $1", [
          alice,
        ]),
      ),
    ).rejects.toThrow(/duplicate key|unique/);
    await expect(
      t.as("authenticated", alice, (tx) =>
        tx.query(
          "update public.profiles set username = 'Admin' where id = $1",
          [alice],
        ),
      ),
    ).rejects.toThrow(/check constraint/);
    await expect(
      t.as("authenticated", alice, (tx) =>
        tx.query(
          "update public.profiles set username = 'admin' where id = $1",
          [alice],
        ),
      ),
    ).rejects.toThrow(/check constraint/);
  });

  it("cannot be read or created by a guest", async () => {
    await expect(
      t.as("anon", null, (tx) => tx.query("select * from public.profiles")),
    ).rejects.toThrow(/permission denied/);
    await expect(
      t.as("authenticated", alice, (tx) =>
        tx.query(
          "insert into public.profiles (id, username) values (gen_random_uuid(), 'zzz')",
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("username_available answers for guests too", async () => {
    const res = await t.as("anon", null, (tx) =>
      tx.query<{ a: boolean; b: boolean; c: boolean }>(
        "select public.username_available('alice') a, public.username_available('carla_99') b, public.username_available('ab') c",
      ),
    );
    expect(res.rows[0]).toEqual({ a: false, b: true, c: false });
  });
});

describe("official daily results", () => {
  it("cannot be written, changed or deleted by players", async () => {
    await expect(
      t.as("authenticated", alice, (tx) =>
        tx.query(
          `insert into public.daily_results (user_id, game_id, challenge_date, score, won, completed, rounds, verification, answers)
           values ($1, 'plain', $2::date, 7000, true, true, 7, 'server_replay', '[]')`,
          [alice, today],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
    await record(alice, "plain", today, 4200);
    await expect(
      t.as("authenticated", alice, (tx) =>
        tx.query("update public.daily_results set score = 7000"),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      t.as("authenticated", alice, (tx) =>
        tx.query("delete from public.daily_results"),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("the recording function is closed to players and guests", async () => {
    for (const [role, user] of [
      ["authenticated", alice],
      ["anon", null],
    ] as const) {
      await expect(
        t.as(role, user, (tx) =>
          tx.query(
            `select public.record_verified_daily_result($1, 'plain', $2::date, 7000, true, 7::smallint, '[]', '{}', null, 'x')`,
            [alice, today],
          ),
        ),
      ).rejects.toThrow(/permission denied/);
    }
  });

  it("are idempotent: a second submission keeps the first", async () => {
    const first = await record(bob, "estimania", today, 300);
    const second = await record(bob, "estimania", today, 500);
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.result.score).toBe(300);
    expect(second.result.id).toBe(first.result.id);
  });

  it("are isolated between players", async () => {
    const res = await t.as("authenticated", alice, (tx) =>
      tx.query<{ user_id: string }>("select user_id from public.daily_results"),
    );
    expect(res.rows.length).toBeGreaterThan(0);
    expect(res.rows.every((r) => r.user_id === alice)).toBe(true);
    await expect(
      t.as("anon", null, (tx) =>
        tx.query("select * from public.daily_results"),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("accept only the open day", async () => {
    await expect(
      record(alice, "geoslice", addDays(today, 1), 10),
    ).rejects.toThrow(/challenge_closed/);
    await expect(
      record(alice, "geoslice", addDays(today, -2), 10),
    ).rejects.toThrow(/challenge_closed/);
    await expect(record(alice, "geoslice", "2025-03-01", 10)).rejects.toThrow(
      /challenge_closed/,
    );
  });

  it("keep yesterday open only during the first hour of the new day", async () => {
    const res = await t.db.query<Record<string, boolean>>(
      `select
         private.is_open_challenge_date('2026-10-28', '2026-10-29 00:30:00+00') as grace,
         private.is_open_challenge_date('2026-10-28', '2026-10-29 01:00:00+00') as after_grace,
         private.is_open_challenge_date('2026-10-29', '2026-10-29 23:59:59+00') as same_day,
         private.is_open_challenge_date('2026-10-30', '2026-10-29 23:59:59+00') as tomorrow,
         private.is_open_challenge_date('2026-10-27', '2026-10-29 00:10:00+00') as two_days`,
    );
    expect(res.rows[0]).toEqual({
      grace: true,
      after_grace: false,
      same_day: true,
      tomorrow: false,
      two_days: false,
    });
  });

  it("refuse a score above the game's maximum", async () => {
    await expect(record(alice, "estimania", today, 501)).rejects.toThrow(
      /score_out_of_bounds/,
    );
  });
});

describe("practice and archive results", () => {
  it("a player can save, read and delete their own", async () => {
    await t.as("authenticated", alice, (tx) =>
      tx.query(
        `insert into public.free_results (game_id, level_id, mode, score, won, completed)
         values ('plain', 'plain-2026-10-01', 'archive', 3000, false, true)`,
      ),
    );
    const mine = await t.as("authenticated", alice, (tx) =>
      tx.query("select * from public.free_results"),
    );
    expect(mine.rows).toHaveLength(1);
    const theirs = await t.as("authenticated", bob, (tx) =>
      tx.query("select * from public.free_results"),
    );
    expect(theirs.rows).toHaveLength(0);
  });

  it("cannot be saved for somebody else, or with a forged date", async () => {
    await expect(
      t.as("authenticated", alice, (tx) =>
        tx.query(
          `insert into public.free_results (user_id, game_id, level_id, mode, score, won, completed)
           values ($1, 'plain', 'plain-x', 'practice', 1, false, true)`,
          [bob],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      t.as("authenticated", alice, (tx) =>
        tx.query(
          `insert into public.free_results (game_id, level_id, mode, score, won, completed, created_at)
           values ('plain', 'plain-x', 'practice', 1, false, true, now() - interval '1 year')`,
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("refuse 'daily' as a mode and out-of-range scores", async () => {
    await expect(
      t.as("authenticated", alice, (tx) =>
        tx.query(
          `insert into public.free_results (game_id, level_id, mode, score, won, completed)
           values ('plain', 'plain-x', 'daily', 1, false, true)`,
        ),
      ),
    ).rejects.toThrow(/check constraint/);
    await expect(
      t.as("authenticated", alice, (tx) =>
        tx.query(
          `insert into public.free_results (game_id, level_id, mode, score, won, completed)
           values ('size-it-up', 'size-it-up-x', 'practice', 9999, false, true)`,
        ),
      ),
    ).rejects.toThrow(/score_out_of_bounds/);
  });

  it("are rate limited for direct inserts", async () => {
    const carla = await t.createUser("carla@example.test", {
      username: "carla",
    });
    await expect(
      t.as("authenticated", carla, async (tx) => {
        for (let i = 0; i < 21; i++) {
          await tx.query(
            `insert into public.free_results (game_id, level_id, mode, score, won, completed)
             values ('plain', 'plain-p${i}', 'practice', 1, false, true)`,
          );
        }
      }),
    ).rejects.toThrow(/rate_limited/);
  });
});

describe("guest import", () => {
  it("imports valid rows, skips invalid ones, never trusts the client", async () => {
    const dana = await t.createUser("dana@example.test", { username: "dana" });
    const daily = [
      {
        gameId: "plain",
        challengeDate: addDays(today, -3),
        score: 5000,
        won: true,
        completed: true,
        createdAt: "2026-01-01T10:00:00Z",
      },
      {
        gameId: "plain",
        challengeDate: addDays(today, 2),
        score: 10,
        won: true,
        completed: true,
      },
      {
        gameId: "estimania",
        challengeDate: addDays(today, -1),
        score: 9999,
        won: true,
        completed: true,
      },
      {
        gameId: "nope",
        challengeDate: addDays(today, -1),
        score: 1,
        won: true,
        completed: true,
      },
      {
        gameId: "geoslice",
        challengeDate: "2026-02-30",
        score: 1,
        won: true,
        completed: true,
      },
      {
        gameId: "geoslice",
        challengeDate: addDays(today, -1),
        score: "1",
        won: true,
        completed: true,
      },
      "not an object",
    ];
    const free = [
      {
        gameId: "krillion",
        levelId: "krillion-2026-09-01",
        mode: "archive",
        score: 700,
        won: false,
        completed: true,
        createdAt: "2026-09-02T08:00:00Z",
      },
      {
        gameId: "krillion",
        levelId: "bad id with spaces",
        mode: "archive",
        score: 1,
        won: false,
        completed: true,
      },
      {
        gameId: "krillion",
        levelId: "krillion-x",
        mode: "daily",
        score: 1,
        won: false,
        completed: true,
      },
    ];
    const out = await t.as("authenticated", dana, (tx) =>
      tx.query<{ r: Record<string, number> }>(
        "select public.import_guest_results($1::jsonb, $2::jsonb) as r",
        [JSON.stringify(daily), JSON.stringify(free)],
      ),
    );
    expect(out.rows[0].r).toEqual({
      dailyImported: 1,
      freeImported: 1,
      skipped: 8,
    });

    const rows = await t.as("authenticated", dana, (tx) =>
      tx.query<{ verification: string; answers: unknown }>(
        "select verification, answers from public.daily_results",
      ),
    );
    expect(rows.rows).toEqual([
      { verification: "guest_import", answers: null },
    ]);
  });

  it("does not overwrite an official result already in the account", async () => {
    await record(alice, "krillion", today, 3000);
    const out = await t.as("authenticated", alice, (tx) =>
      tx.query<{ r: Record<string, number> }>(
        "select public.import_guest_results($1::jsonb, '[]'::jsonb) as r",
        [
          JSON.stringify([
            {
              gameId: "krillion",
              challengeDate: today,
              score: 7000,
              won: true,
              completed: true,
            },
          ]),
        ],
      ),
    );
    expect(out.rows[0].r.dailyImported).toBe(0);
    const row = await t.db.query<{ score: number; verification: string }>(
      "select score, verification from public.daily_results where user_id = $1 and game_id = 'krillion'",
      [alice],
    );
    expect(row.rows[0]).toEqual({ score: 3000, verification: "server_replay" });
  });

  it("is closed to guests", async () => {
    await expect(
      t.as("anon", null, (tx) =>
        tx.query("select public.import_guest_results('[]', '[]')"),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("leaderboards", () => {
  const day = () => today;

  it("rank verified results, share ties, and list hidden players nowhere", async () => {
    const users: string[] = [];
    for (const [name, score] of [
      ["eva", 900],
      ["fede", 2500],
      ["gino", 2500],
      ["hana", 1200],
    ] as const) {
      const id = await t.createUser(`${name}@example.test`, { username: name });
      users.push(id);
      await record(id, "fact-map", day(), score);
    }
    // hana hides herself
    await t.as("authenticated", users[3], (tx) =>
      tx.query(
        "update public.profiles set show_in_leaderboards = false where id = $1",
        [users[3]],
      ),
    );

    const res = await t.as("anon", null, (tx) =>
      tx.query<{
        rank: number;
        username: string;
        score: number;
        is_me: boolean;
      }>(
        "select rank, username, score, is_me from public.daily_leaderboard('fact-map', $1::date)",
        [day()],
      ),
    );
    expect(res.rows).toEqual([
      { rank: 1, username: "fede", score: 2500, is_me: false },
      { rank: 1, username: "gino", score: 2500, is_me: false },
      { rank: 4, username: "eva", score: 900, is_me: false },
    ]);

    // hana still sees herself, with her true rank
    const own = await t.as("authenticated", users[3], (tx) =>
      tx.query<{ rank: number; username: string; is_me: boolean }>(
        "select rank, username, is_me from public.daily_leaderboard('fact-map', $1::date) where is_me",
        [day()],
      ),
    );
    expect(own.rows).toEqual([{ rank: 3, username: "hana", is_me: true }]);

    const standing = await t.as("authenticated", users[0], (tx) =>
      tx.query("select * from public.my_daily_standing('fact-map', $1::date)", [
        day(),
      ]),
    );
    expect(standing.rows).toEqual([{ rank: 4, participants: 4, score: 900 }]);
  });

  it("never expose emails or user ids", async () => {
    const res = await t.as("anon", null, (tx) =>
      tx.query("select * from public.daily_leaderboard('fact-map', $1::date)", [
        day(),
      ]),
    );
    const columns = res.fields.map((f) => f.name);
    expect(columns).toEqual([
      "rank",
      "username",
      "display_name",
      "score",
      "is_me",
    ]);
  });

  it("leave guest imports out", async () => {
    const res = await t.as("anon", null, (tx) =>
      tx.query<{ username: string }>(
        "select username from public.daily_leaderboard('plain', $1::date)",
        [addDays(today, -3)],
      ),
    );
    expect(res.rows).toEqual([]);
  });

  it("cap the page size at 100", async () => {
    const res = await t.as("anon", null, (tx) =>
      tx.query(
        "select * from public.daily_leaderboard('fact-map', $1::date, 100000, -5)",
        [day()],
      ),
    );
    expect(res.rows.length).toBeLessThanOrEqual(100);
  });

  it("weekly totals add up one game only, and weeks start on Monday", async () => {
    const res = await t.db.query<{ monday: Date }>(
      "select (private.challenge_today() - (extract(isodow from private.challenge_today())::int - 1)) as monday",
    );
    const monday = iso(res.rows[0].monday);
    const week = await t.as("anon", null, (tx) =>
      tx.query<{ username: string; total: number; days_played: number }>(
        "select username, total, days_played from public.weekly_leaderboard('fact-map', $1::date)",
        [monday],
      ),
    );
    expect(week.rows.map((r) => r.username)).toEqual(["fede", "gino", "eva"]);
    expect(week.rows[0]).toMatchObject({ total: 2500, days_played: 1 });
    await expect(
      t.as("anon", null, (tx) =>
        tx.query(
          "select * from public.weekly_leaderboard('fact-map', $1::date)",
          [addDays(monday, 1)],
        ),
      ),
    ).rejects.toThrow(/week_must_start_on_monday/);
  });
});

describe("preferences", () => {
  it("belong to their owner and are capped", async () => {
    await t.as("authenticated", alice, (tx) =>
      tx.query(
        "insert into public.user_preferences (key, value) values ('theme', 'dark')",
      ),
    );
    const theirs = await t.as("authenticated", bob, (tx) =>
      tx.query("select * from public.user_preferences"),
    );
    expect(theirs.rows).toHaveLength(0);
    await expect(
      t.as("authenticated", alice, (tx) =>
        tx.query(
          "insert into public.user_preferences (user_id, key, value) values ($1, 'theme', 'x')",
          [bob],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      t.as("authenticated", alice, async (tx) => {
        for (let i = 0; i < 50; i++)
          await tx.query(
            "insert into public.user_preferences (key, value) values ($1, 'v')",
            [`k${i}`],
          );
      }),
    ).rejects.toThrow(/too_many_preferences/);
  });
});

describe("account deletion", () => {
  it("removes the profile and every result", async () => {
    const zed = await t.createUser("zed@example.test", { username: "zed" });
    await record(zed, "gazillion", today, 1000);
    await t.as("authenticated", zed, (tx) =>
      tx.query(
        `insert into public.free_results (game_id, level_id, mode, score, won, completed)
         values ('gazillion', 'gazillion-x', 'practice', 1, false, true)`,
      ),
    );
    await t.db.query("delete from auth.users where id = $1", [zed]);
    const left = await t.db.query<{ n: number }>(
      `select (select count(*) from public.profiles where id = $1)
            + (select count(*) from public.daily_results where user_id = $1)
            + (select count(*) from public.free_results where user_id = $1) as n`,
      [zed],
    );
    expect(Number(left.rows[0].n)).toBe(0);
  });
});
