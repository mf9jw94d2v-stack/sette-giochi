import { describe, expect, it } from "vitest";
import {
  addDays,
  calendarDays,
  computeStreak,
  gameStats,
  historyEntries,
  overallStats,
} from "./stats";
import type {
  ArchiveResultRecord,
  DailyResultRecord,
} from "@/services/persistence";

const TODAY = "2026-10-27";

function daily(
  gameId: DailyResultRecord["gameId"],
  challengeDate: string,
  score = 100,
  won = true,
): DailyResultRecord {
  return {
    gameId,
    challengeDate,
    score,
    won,
    completed: true,
    createdAt: `${challengeDate}T10:00:00.000Z`,
  };
}

function archive(
  gameId: ArchiveResultRecord["gameId"],
  createdAt: string,
  score = 50,
): ArchiveResultRecord {
  return {
    id: `${gameId}-${createdAt}`,
    gameId,
    levelId: "lvl",
    mode: "practice",
    score,
    won: false,
    completed: true,
    createdAt,
  };
}

describe("addDays", () => {
  it("moves across month and year boundaries", () => {
    expect(addDays("2026-10-27", 1)).toBe("2026-10-28");
    expect(addDays("2026-10-01", -1)).toBe("2026-09-30");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29"); // leap year
  });
});

describe("computeStreak", () => {
  it("is zero with no data", () => {
    expect(computeStreak([], TODAY)).toEqual({ current: 0, best: 0 });
  });

  it("counts consecutive days ending today", () => {
    const s = computeStreak(["2026-10-25", "2026-10-26", "2026-10-27"], TODAY);
    expect(s.current).toBe(3);
    expect(s.best).toBe(3);
  });

  it("stays alive when today has not been played yet", () => {
    const s = computeStreak(["2026-10-25", "2026-10-26"], TODAY);
    expect(s.current).toBe(2);
  });

  it("breaks once a whole day is missed", () => {
    // last play was two days ago → streak is over
    const s = computeStreak(["2026-10-24", "2026-10-25"], TODAY);
    expect(s.current).toBe(0);
    expect(s.best).toBe(2);
  });

  it("remembers the best run even after a break", () => {
    const s = computeStreak(
      ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-27"],
      TODAY,
    );
    expect(s.best).toBe(4);
    expect(s.current).toBe(1);
  });

  it("ignores duplicate dates", () => {
    const s = computeStreak(["2026-10-27", "2026-10-27"], TODAY);
    expect(s.current).toBe(1);
    expect(s.best).toBe(1);
  });
});

describe("gameStats", () => {
  it("aggregates official results and keeps archive apart", () => {
    const d = [
      daily("gazillion", "2026-10-26", 4000),
      daily("gazillion", "2026-10-27", 2000, false),
      daily("plain", "2026-10-27", 900),
    ];
    const a = [archive("gazillion", "2026-10-27T12:00:00.000Z", 9999)];
    const s = gameStats("gazillion", d, a, TODAY);

    expect(s.dailyPlayed).toBe(2);
    expect(s.dailyWon).toBe(1);
    expect(s.bestScore).toBe(4000); // archive 9999 must NOT count
    expect(s.avgScore).toBe(3000);
    expect(s.streak.current).toBe(2);
    expect(s.archivePlayed).toBe(1);
    expect(s.archiveBest).toBe(9999);
    expect(s.lastPlayed).toBe("2026-10-27");
  });

  it("returns empty metrics for a game never played", () => {
    const s = gameStats("krillion", [], [], TODAY);
    expect(s.dailyPlayed).toBe(0);
    expect(s.bestScore).toBeNull();
    expect(s.avgScore).toBeNull();
    expect(s.streak).toEqual({ current: 0, best: 0 });
  });
});

describe("overallStats", () => {
  it("counts distinct active days and an any-game streak", () => {
    const d = [
      daily("gazillion", "2026-10-26"),
      daily("plain", "2026-10-26"),
      daily("krillion", "2026-10-27"),
    ];
    const s = overallStats(d, [], TODAY);
    expect(s.dailyCompleted).toBe(3);
    expect(s.daysActive).toBe(2);
    expect(s.streak.current).toBe(2);
    expect(s.gamesWithData).toBe(3);
  });
});

describe("calendarDays", () => {
  it("returns the requested window ending today, counting distinct games", () => {
    const d = [
      daily("gazillion", "2026-10-27"),
      daily("plain", "2026-10-27"),
      daily("plain", "2026-10-25"),
    ];
    const cal = calendarDays(d, TODAY, 5);
    expect(cal).toHaveLength(5);
    expect(cal.at(-1)).toEqual({ date: "2026-10-27", count: 2 });
    expect(cal.find((c) => c.date === "2026-10-25")?.count).toBe(1);
    expect(cal.find((c) => c.date === "2026-10-26")?.count).toBe(0);
  });
});

describe("historyEntries", () => {
  it("merges daily and archive, newest first, tagging each kind", () => {
    const entries = historyEntries(
      [daily("gazillion", "2026-10-26")],
      [archive("plain", "2026-10-27T08:00:00.000Z")],
    );
    expect(entries).toHaveLength(2);
    expect(entries[0].kind).toBe("archive");
    expect(entries[0].gameId).toBe("plain");
    expect(entries[1].kind).toBe("daily");
  });
});

describe("historyEntries — archive level date", () => {
  it("reads the replayed day out of the levelId", () => {
    const [entry] = historyEntries(
      [],
      [
        {
          id: "x",
          gameId: "geoslice",
          levelId: "geoslice-2026-10-26",
          mode: "practice",
          score: 1933,
          won: false,
          completed: true,
          createdAt: "2026-10-27T20:00:00.000Z",
        },
      ],
    );
    expect(entry.date).toBe("2026-10-27"); // when it was played
    expect(entry.levelDate).toBe("2026-10-26"); // which day's level
  });

  it("leaves levelDate undefined when the id carries no date", () => {
    const [entry] = historyEntries(
      [],
      [archive("plain", "2026-10-27T08:00:00.000Z")],
    );
    expect(entry.levelDate).toBeUndefined();
  });
});
