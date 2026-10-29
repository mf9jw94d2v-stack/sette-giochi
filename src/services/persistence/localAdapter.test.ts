import { beforeEach, describe, expect, it } from "vitest";
import { LocalPersistenceAdapter, type StorageLike } from "./localAdapter";

function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
  };
}

describe("LocalPersistenceAdapter", () => {
  let adapter: LocalPersistenceAdapter;

  beforeEach(() => {
    adapter = new LocalPersistenceAdapter(memoryStorage());
  });

  it("returns null for a daily result that doesn't exist", async () => {
    expect(await adapter.getDailyResult("gazillion", "2026-10-27")).toBeNull();
  });

  it("saves and reads back a daily result", async () => {
    const out = await adapter.saveDailyResult({
      gameId: "gazillion",
      challengeDate: "2026-10-27",
      score: 4200,
      won: true,
      completed: true,
    });
    expect(out.created).toBe(true);
    expect(out.record.score).toBe(4200);

    const read = await adapter.getDailyResult("gazillion", "2026-10-27");
    expect(read?.score).toBe(4200);
  });

  it("is idempotent: a second save for the same day does NOT overwrite", async () => {
    await adapter.saveDailyResult({
      gameId: "gazillion",
      challengeDate: "2026-10-27",
      score: 4200,
      won: true,
      completed: true,
    });
    const second = await adapter.saveDailyResult({
      gameId: "gazillion",
      challengeDate: "2026-10-27",
      score: 9999, // attempt to overwrite with a better score
      won: true,
      completed: true,
    });

    expect(second.created).toBe(false);
    expect(second.record.score).toBe(4200); // original kept
    const all = await adapter.listDailyResults("gazillion");
    expect(all).toHaveLength(1);
  });

  it("keeps daily results per game independent", async () => {
    await adapter.saveDailyResult({
      gameId: "gazillion",
      challengeDate: "2026-10-27",
      score: 10,
      won: true,
      completed: true,
    });
    await adapter.saveDailyResult({
      gameId: "estimania",
      challengeDate: "2026-10-27",
      score: 20,
      won: true,
      completed: true,
    });
    expect(await adapter.listDailyResults("gazillion")).toHaveLength(1);
    expect(await adapter.listDailyResults("estimania")).toHaveLength(1);
    expect(await adapter.listDailyResults()).toHaveLength(2);
  });

  it("archive results are separate from daily and each is distinct", async () => {
    await adapter.saveArchiveResult({
      gameId: "gazillion",
      levelId: "lvl-1",
      mode: "archive",
      score: 100,
      won: false,
      completed: true,
    });
    await adapter.saveArchiveResult({
      gameId: "gazillion",
      levelId: "lvl-1",
      mode: "archive",
      score: 200,
      won: true,
      completed: true,
    });
    // Archive does NOT dedup — replaying a level records another result.
    expect(await adapter.listArchiveResults("gazillion")).toHaveLength(2);
    // ...and it never touches official daily results.
    expect(await adapter.listDailyResults("gazillion")).toHaveLength(0);
  });

  it("stores and reads preferences", async () => {
    expect(await adapter.getPreference("x")).toBeNull();
    await adapter.setPreference("x", "yes");
    expect(await adapter.getPreference("x")).toBe("yes");
  });
});
