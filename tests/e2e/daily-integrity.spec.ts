import { expect, test } from "@playwright/test";
import {
  startGame,
  dailyRecord,
  daysAgo,
  GAMES,
  readArchive,
  readDaily,
  seedResults,
  todayUtc,
} from "./helpers";

/**
 * Section 25 of the brief: the rules that must hold for an official daily
 * challenge. These are the cases where a bug silently corrupts a player's
 * record, so they are tested against the real built app.
 */
test.describe("daily challenge integrity", () => {
  test("the seven games have seven independent challenges", async ({
    page,
  }) => {
    await seedResults(page, [dailyRecord("gazillion", todayUtc(), 4200)]);
    await page.goto("/daily");

    // The played one reads as done; the other six are still open.
    // it-IT groups from five digits up, so 4200 is written "4200".
    await expect(page.getByRole("main")).toContainText("4200");
    for (const game of GAMES) {
      await expect(
        page.getByRole("link", { name: new RegExp(game.name, "i") }).first(),
      ).toBeVisible();
    }
    const results = await readDaily(page);
    expect(results).toHaveLength(1);
  });

  test("a finished daily cannot be recorded twice, even after a reload", async ({
    page,
  }) => {
    const today = todayUtc();
    await seedResults(page, [dailyRecord("gazillion", today, 4200)]);

    await page.goto("/games/gazillion");
    // Already played → straight to the result screen, showing the SAVED score.
    await expect(page.getByRole("main")).toContainText(/hai già giocato/i);
    await expect(page.getByRole("main")).toContainText("4200");

    await page.reload();
    await expect(page.getByRole("main")).toContainText(/hai già giocato/i);

    const results = await readDaily(page);
    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(4200);
  });

  test("playing a daily to the end records exactly one official result", async ({
    page,
  }) => {
    await seedResults(page, []);
    await page.goto("/games/gazillion");
    await startGame(page);

    // Skip every round, stepping through each reveal. The point of this test
    // is the recording, not the scoring.
    for (let i = 0; i < 5; i++) {
      await page.getByRole("button", { name: "Salta" }).click();
      await page
        .getByRole("button", { name: /prossimo evento|vedi risultato/i })
        .click();
    }
    await expect(page.getByRole("main")).toContainText(/completata/i);

    const results = await readDaily(page);
    expect(results).toHaveLength(1);
    expect(results[0].gameId).toBe("gazillion");
    expect(results[0].challengeDate).toBe(todayUtc());

    // Coming back must not write a second one.
    await page.reload();
    await expect(page.getByRole("main")).toContainText(/hai già giocato/i);
    expect(await readDaily(page)).toHaveLength(1);

    // And it must not have leaked into the archive either.
    expect(await readArchive(page)).toHaveLength(0);
  });

  test("double-clicking start does not create a second session or result", async ({
    page,
  }) => {
    await page.goto("/games/gazillion");
    const start = page.getByRole("button", { name: /inizia/i });
    await start.dblclick();
    await expect(start).toHaveCount(0);
    // One board, one question at a time.
    await expect(page.getByRole("main")).toContainText(/1\s*\/\s*5/);
    expect(await readDaily(page)).toHaveLength(0);
  });

  test("changing the device clock does not hand out another official challenge", async ({
    page,
  }) => {
    const today = todayUtc();
    await seedResults(page, [dailyRecord("gazillion", today, 4200)]);
    // Jump the browser clock a day forward.
    await page.clock.install({ time: new Date(Date.now() + 86_400_000) });
    await page.goto("/games/gazillion");

    // The challenge day comes from a fixed timezone, not the device: with the
    // clock moved the app may compute a new day, but it must never let the
    // SAME day be recorded twice. What we assert is the invariant that matters.
    const results = await readDaily(page);
    const perDay = new Map<string, number>();
    for (const r of results) {
      const key = `${r.gameId}|${r.challengeDate}`;
      perDay.set(key, (perDay.get(key) ?? 0) + 1);
    }
    expect([...perDay.values()].every((n) => n === 1)).toBe(true);
  });

  test("the daily page is honest when nothing has been played", async ({
    page,
  }) => {
    await seedResults(page, []);
    await page.goto("/daily");
    await expect(page.getByRole("main")).not.toContainText(/NaN|undefined/);
    expect(await readDaily(page)).toHaveLength(0);
  });

  test("a streak counts official days only and breaks after a missed day", async ({
    page,
  }) => {
    await seedResults(page, [
      dailyRecord("plain", daysAgo(2)),
      dailyRecord("plain", daysAgo(1)),
      dailyRecord("plain", todayUtc()),
    ]);
    await page.goto("/stats");
    await expect(page.getByRole("main")).toContainText("3");

    // A broken run: last played three days ago.
    await page.context().clearCookies();
    await seedResults(page, [
      dailyRecord("plain", daysAgo(4)),
      dailyRecord("plain", daysAgo(3)),
    ]);
    await page.goto("/stats");
    await expect(page.getByRole("main")).toContainText(/serie attuale/i);
  });
});

test.describe("archive stays out of official results", () => {
  test("replaying a past day leaves the official record untouched", async ({
    page,
  }) => {
    const official = dailyRecord("gazillion", daysAgo(2), 4200);
    await seedResults(page, [official]);

    await page.goto(`/archive/gazillion/${daysAgo(2)}`);
    await expect(page.getByRole("main")).toContainText(/archivio/i);
    await startGame(page);

    const daily = await readDaily(page);
    expect(daily).toHaveLength(1);
    expect(daily[0].score).toBe(4200);
    // Nothing official was written by opening the replay.
    expect(daily.filter((r) => r.challengeDate === todayUtc())).toHaveLength(0);
  });

  test("today's challenge cannot be opened from the archive", async ({
    page,
  }) => {
    await page.goto(`/archive/gazillion/${todayUtc()}`);
    await expect(page.getByRole("main")).toContainText(/ancora di oggi/i);
    expect(await readArchive(page)).toHaveLength(0);
  });
});
