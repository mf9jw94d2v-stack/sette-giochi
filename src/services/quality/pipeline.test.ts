import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { GAME_IDS } from "@/types/game";
import type { GameLevel, GameModule, ValidationResult } from "@/types/game";
import {
  dateSeeds,
  rereview,
  reviewAll,
  reviewGame,
  reviewSeed,
} from "./pipeline";

const END = "2026-10-27";

describe("dateSeeds", () => {
  it("returns a contiguous window ending on the given day", () => {
    expect(dateSeeds(END, 3)).toEqual(["2026-10-25", "2026-10-26", END]);
  });
});

describe("reviewSeed — the seven real generators", () => {
  it.each(GAME_IDS)("publishes a valid level for %s", (gameId) => {
    const r = reviewSeed(gameId, END, new Map());
    expect(r.reasons).toEqual([]);
    expect(r.status).toBe("published");
    expect(r.levelId).toBeTruthy();
    expect(r.contentHash).toBeTruthy();
    expect(r.generatorVersion).not.toBe("n/a");
  });

  it.each(GAME_IDS)("is deterministic for %s", (gameId) => {
    const a = reviewSeed(gameId, "2026-01-05", new Map());
    const b = reviewSeed(gameId, "2026-01-05", new Map());
    expect(a.contentHash).toBe(b.contentHash);
    expect(a.difficulty).toBe(b.difficulty);
  });

  it("quarantines the second seed when two produce the same content", () => {
    const seen = new Map<string, string>();
    const first = reviewSeed("gazillion", END, seen);
    // Feed the very same content hash back under a different seed.
    const second = reviewSeed("gazillion", END, seen);
    expect(first.status).toBe("published");
    // Same seed is not a duplicate of itself.
    expect(second.status).toBe("published");

    const seen2 = new Map<string, string>([[first.contentHash!, "seed-zero"]]);
    const dup = reviewSeed("gazillion", END, seen2);
    expect(dup.status).toBe("quarantined");
    expect(dup.reason).toBe("duplicate");
    expect(dup.duplicateOf).toBe("seed-zero");
  });
});

/** A deliberately broken module, to prove failures are caught, not swallowed. */
function brokenModule(
  kind: "throw" | "structure" | "verify",
): GameModule<never, never, never> {
  const bad = (): ValidationResult => ({
    ok: false,
    reasons: ["motivo di prova"],
    confidence: "unverified",
  });
  const good = (): ValidationResult => ({
    ok: true,
    reasons: [],
    confidence: "verified",
  });
  const level = {
    id: "x-1",
    gameId: "gazillion",
    generatorVersion: "test-0",
    difficulty: "easy",
    data: {},
    contentHash: "deadbeef",
    createdAt: new Date().toISOString(),
  } as unknown as GameLevel<never>;
  return {
    meta: {} as never,
    engine: {} as never,
    generator: {
      version: "test-0",
      generate: () => {
        if (kind === "throw") throw new Error("generatore rotto");
        return level;
      },
    },
    validator: {
      validateStructure: kind === "structure" ? bad : good,
      verifySolution: kind === "verify" ? bad : good,
      contentHash: () => "deadbeef",
    },
  } as unknown as GameModule<never, never, never>;
}

describe("reviewSeed — failure handling", () => {
  it("rejects a seed whose generator throws", () => {
    const r = reviewSeed("gazillion", "s", new Map(), brokenModule("throw"));
    expect(r.status).toBe("rejected");
    expect(r.reason).toBe("generation-error");
    expect(r.reasons).toContain("generatore rotto");
  });

  it("quarantines a structurally invalid level and keeps the reason", () => {
    const r = reviewSeed(
      "gazillion",
      "s",
      new Map(),
      brokenModule("structure"),
    );
    expect(r.status).toBe("quarantined");
    expect(r.reason).toBe("structure");
    expect(r.reasons).toEqual(["motivo di prova"]);
  });

  it("quarantines a level the independent pass rejects", () => {
    const r = reviewSeed("gazillion", "s", new Map(), brokenModule("verify"));
    expect(r.status).toBe("quarantined");
    expect(r.reason).toBe("verification");
  });

  it("never publishes a level that failed a pass", () => {
    for (const kind of ["throw", "structure", "verify"] as const) {
      const report = reviewGame("gazillion", ["a", "b"], brokenModule(kind));
      expect(report.published).toBe(0);
      expect(report.validityRate).toBe(0);
    }
  });
});

describe("reviewGame — metrics add up", () => {
  it.each(GAME_IDS)(
    "%s: counts are consistent and derived from the run",
    (gameId) => {
      const report = reviewGame(gameId, dateSeeds(END, 30));
      expect(report.generated).toBe(30);
      expect(report.published + report.quarantined + report.rejected).toBe(30);
      expect(report.validated).toBe(report.published + report.duplicates);
      expect(report.validityRate).toBeCloseTo(report.published / 30, 10);
      const diffTotal = Object.values(report.difficultyDistribution).reduce(
        (s, v) => s + v,
        0,
      );
      expect(diffTotal).toBe(report.published);
      expect(report.distinctLevels).toBe(report.published);
      expect(report.failures).toHaveLength(
        report.quarantined + report.rejected,
      );
    },
  );
});

describe("reviewAll", () => {
  it("covers all seven games and totals match the per-game reports", () => {
    const report = reviewAll(END, 14);
    expect(report.games).toHaveLength(7);
    expect(report.seeds).toEqual({
      kind: "dates",
      from: "2026-10-14",
      to: END,
      count: 14,
    });
    expect(report.totals.generated).toBe(7 * 14);
    expect(report.totals.published).toBe(
      report.games.reduce((s, g) => s + g.published, 0),
    );
  });
});

describe("rereview", () => {
  it("re-runs a single seed in isolation (no duplicate carry-over)", () => {
    const r = rereview("plain", "2026-05-05");
    expect(r.status).toBe("published");
    expect(r.reason).toBeNull();
  });
});

describe("property: published levels are never duplicates and always validate", () => {
  it("holds over arbitrary date seeds for every game", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...GAME_IDS),
        fc.integer({ min: 1, max: 40 }),
        (gameId, count) => {
          const report = reviewGame(gameId, dateSeeds(END, count));
          // Content hashes of published levels are unique.
          const hashes = report.failures
            .filter((f) => f.reason === "duplicate")
            .map((f) => f.duplicateOf);
          expect(hashes.every((h) => h !== null)).toBe(true);
          expect(report.published).toBeLessThanOrEqual(count);
          expect(report.published).toBe(report.distinctLevels);
          return true;
        },
      ),
      { numRuns: 40 },
    );
  });
});
