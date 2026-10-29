import { describe, expect, it } from "vitest";
import { achievements } from "./achievements";
import type { DailyResultRecord } from "@/services/persistence";
import { GAME_IDS } from "@/types/game";

const rec = (
  gameId: string,
  challengeDate: string,
  won = true,
): DailyResultRecord =>
  ({
    gameId,
    challengeDate,
    score: 1,
    won,
    completed: true,
    createdAt: `${challengeDate}T10:00:00Z`,
  }) as DailyResultRecord;

describe("achievements", () => {
  it("starts with nothing earned and honest progress", () => {
    const a = achievements([], [], "2026-10-29");
    expect(a.every((x) => !x.earned && x.progress === 0)).toBe(true);
  });

  it("counts a full day only when all seven are done on the same day", () => {
    const six = GAME_IDS.slice(0, 6).map((g) => rec(g, "2026-10-29"));
    const byId = (list: DailyResultRecord[]) =>
      Object.fromEntries(
        achievements(list, [], "2026-10-29").map((x) => [x.id, x]),
      );
    expect(byId(six)["full-day"]).toMatchObject({ earned: false, progress: 6 });
    const seven = [...six, rec(GAME_IDS[6], "2026-10-29")];
    expect(byId(seven)["full-day"].earned).toBe(true);
    expect(byId(seven).explorer.earned).toBe(true);
    // Seven games spread over two days are not a full day.
    const spread = [...six, rec(GAME_IDS[6], "2026-10-28")];
    expect(byId(spread)["full-day"].earned).toBe(false);
  });

  it("uses the best streak, so a broken streak keeps what it reached", () => {
    const week = Array.from({ length: 7 }, (_, i) =>
      rec("plain", `2026-10-0${i + 1}`),
    );
    const a = Object.fromEntries(
      achievements(week, [], "2026-10-29").map((x) => [x.id, x]),
    );
    expect(a.week.earned).toBe(true);
    expect(a.month.progress).toBe(7);
  });
});
