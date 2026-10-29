import { describe, expect, it, vi } from "vitest";
import { LocalPersistenceAdapter } from "./localAdapter";
import { parseArchiveResults, parseDailyResults } from "./schema";

const valid = {
  gameId: "plain",
  challengeDate: "2026-10-28",
  score: 2500,
  won: true,
  completed: true,
  createdAt: "2026-10-28T10:00:00.000Z",
};

describe("parseDailyResults", () => {
  it("keeps valid records", () => {
    const out = parseDailyResults([valid]);
    expect(out.records).toHaveLength(1);
    expect(out.dropped).toBe(0);
  });

  it("drops rows the player could have tampered with", () => {
    const out = parseDailyResults([
      valid,
      { ...valid, gameId: "not-a-game" },
      { ...valid, challengeDate: "28/10/2026" },
      { ...valid, score: "tantissimi" },
      { ...valid, score: Number.NaN },
      { ...valid, won: "sì" },
      null,
      "ciao",
      42,
    ]);
    expect(out.records).toHaveLength(1);
    expect(out.dropped).toBe(8);
  });

  it("returns nothing when the stored value is not a list", () => {
    for (const raw of [null, undefined, {}, "[]", 7]) {
      expect(parseDailyResults(raw).records).toEqual([]);
    }
  });
});

describe("parseArchiveResults", () => {
  it("rejects an archive record claiming to be a daily one", () => {
    const out = parseArchiveResults([
      {
        id: "a1",
        gameId: "geoslice",
        levelId: "geoslice-2026-10-20",
        mode: "daily",
        score: 1,
        won: false,
        completed: true,
        createdAt: "2026-10-27T20:00:00.000Z",
      },
    ]);
    expect(out.records).toEqual([]);
    expect(out.dropped).toBe(1);
  });
});

describe("LocalPersistenceAdapter with corrupt storage", () => {
  function storageWith(daily: string) {
    const map = new Map<string, string>([["sgp:daily-results", daily]]);
    return {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    };
  }

  it("ignores unreadable rows instead of handing them to the app", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const adapter = new LocalPersistenceAdapter(
      storageWith(JSON.stringify([valid, { gameId: "plain" }, "rotto"])),
    );
    const results = await adapter.listDailyResults();
    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(2500);
    expect(warn).toHaveBeenCalledOnce();
    // The warning must count, never quote, the player's data.
    expect(String(warn.mock.calls[0][0])).not.toContain("plain");
    warn.mockRestore();
  });

  it("survives storage holding something that is not JSON at all", async () => {
    const adapter = new LocalPersistenceAdapter(storageWith("{{{"));
    await expect(adapter.listDailyResults()).resolves.toEqual([]);
  });

  it("still records a new result after dropping corrupt ones", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const adapter = new LocalPersistenceAdapter(
      storageWith(JSON.stringify(["spazzatura"])),
    );
    const out = await adapter.saveDailyResult({
      gameId: "krillion",
      challengeDate: "2026-10-28",
      score: 410,
      won: false,
      completed: true,
    });
    expect(out.created).toBe(true);
    expect(await adapter.listDailyResults()).toHaveLength(1);
    warn.mockRestore();
  });
});
