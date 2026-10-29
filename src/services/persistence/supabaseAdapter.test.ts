import { describe, expect, it } from "vitest";
import { dailyFromRow, freeFromRow } from "./supabaseAdapter";
import { Outbox } from "./outbox";
import { weekStartOf } from "@/services/account/leaderboardService";

function memory() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

describe("rows from the database are checked, not trusted", () => {
  it("maps a valid daily row", () => {
    expect(
      dailyFromRow({
        game_id: "plain",
        challenge_date: "2026-10-29",
        score: 4200,
        won: true,
        completed: true,
        detail: { altitude: 4200 },
        verification: "server_replay",
        created_at: "2026-10-29T10:00:00Z",
      }),
    ).toMatchObject({
      gameId: "plain",
      score: 4200,
      verification: "server_replay",
    });
  });

  it("drops rows that do not fit", () => {
    expect(
      dailyFromRow({
        game_id: "tetris",
        challenge_date: "2026-10-29",
        score: 1,
        won: true,
        completed: true,
        detail: {},
        verification: "server_replay",
        created_at: "x",
      }),
    ).toBeNull();
    expect(
      freeFromRow({
        id: "a",
        game_id: "plain",
        level_id: "plain-x",
        mode: "daily",
        score: 1,
        won: false,
        completed: true,
        detail: {},
        created_at: "x",
      }),
    ).toBeNull();
  });
});

describe("outbox", () => {
  const input = {
    gameId: "plain" as const,
    challengeDate: "2026-10-29",
    score: 1,
    won: false,
    completed: true,
    answers: [],
    generatorVersion: "v",
  };

  it("keeps one pending official result per game and day", () => {
    const box = new Outbox("u1", memory());
    box.add({ kind: "daily", input, queuedAt: "t" });
    box.add({ kind: "daily", input: { ...input, score: 999 }, queuedAt: "t2" });
    expect(box.list()).toHaveLength(1);
    expect(box.list()[0]).toMatchObject({ input: { score: 1 } });
  });

  it("is per account, and ignores garbage", () => {
    const storage = memory();
    new Outbox("u1", storage).add({ kind: "daily", input, queuedAt: "t" });
    expect(new Outbox("u2", storage).list()).toEqual([]);
    storage.setItem("sgp:outbox:u3", "{not json");
    expect(new Outbox("u3", storage).list()).toEqual([]);
  });

  it("removes what was sent", () => {
    const box = new Outbox("u1", memory());
    box.add({
      kind: "free",
      id: "x",
      input: {
        gameId: "plain",
        levelId: "plain-x",
        mode: "practice",
        score: 1,
        won: false,
        completed: true,
      },
      queuedAt: "t",
    });
    box.remove((e) => e.kind === "free" && e.id === "x");
    expect(box.list()).toEqual([]);
  });
});

describe("weekStartOf", () => {
  it("returns the Monday of the week", () => {
    expect(weekStartOf("2026-10-29")).toBe("2026-10-26"); // Thursday
    expect(weekStartOf("2026-10-26")).toBe("2026-10-26"); // Monday
    expect(weekStartOf("2026-11-01")).toBe("2026-10-26"); // Sunday
  });
});
