import { expect, type Page } from "@playwright/test";

/**
 * Each game names its own start button — that is the point of giving them
 * separate identities, so the tests follow the games rather than forcing one
 * wording on all seven.
 */
export const GAMES = [
  { id: "krillion", name: "Krillion", start: /inizia la discesa/i },
  { id: "plain", name: "Plain", start: /decolla/i },
  { id: "fact-map", name: "Fact Map", start: /inizia/i },
  { id: "estimania", name: "Estimania", start: /inizia/i },
  { id: "size-it-up", name: "Size It Up", start: /inizia/i },
  { id: "geoslice", name: "GeoSlice", start: /inizia/i },
  { id: "gazillion", name: "Gazillion", start: /inizia/i },
] as const;

/**
 * Click a game's start button and wait until the board has actually started.
 * A bare click can land before React has attached its handler, which looks
 * like a missing button several steps later.
 */
export async function startGame(
  page: Page,
  start: RegExp = /inizia/i,
): Promise<void> {
  const button = page.getByRole("button", { name: start });
  await expect(button).toBeVisible();
  await button.click();
  await expect(button).toBeHidden();
}

export const DAILY_KEY = "sgp:daily-results";
export const ARCHIVE_KEY = "sgp:archive-results";

/** The challenge day as the app computes it (UTC by default). */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Seed persisted results before the app boots. These stand in for games
 * already played: the point of a given test is usually what the platform does
 * with results, not replaying seven different game UIs to produce them.
 *
 * It seeds ONCE per tab. `addInitScript` runs on every navigation, so without
 * the guard a `page.reload()` would silently wipe whatever the app had just
 * written — which is exactly what several of these tests are checking.
 */
export async function seedResults(
  page: Page,
  daily: Record<string, unknown>[],
  archive: Record<string, unknown>[] = [],
): Promise<void> {
  await page.addInitScript(
    ([dKey, aKey, d, a]) => {
      const SENTINEL = "sgp-e2e-seeded";
      if (sessionStorage.getItem(SENTINEL)) return;
      sessionStorage.setItem(SENTINEL, "1");
      localStorage.setItem(dKey as string, JSON.stringify(d));
      localStorage.setItem(aKey as string, JSON.stringify(a));
    },
    [DAILY_KEY, ARCHIVE_KEY, daily, archive] as const,
  );
}

export function dailyRecord(
  gameId: string,
  challengeDate: string,
  score = 1000,
  won = true,
): Record<string, unknown> {
  return {
    gameId,
    challengeDate,
    score,
    won,
    completed: true,
    createdAt: `${challengeDate}T10:00:00.000Z`,
  };
}

export async function readDaily(
  page: Page,
): Promise<Record<string, unknown>[]> {
  return page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k) ?? "[]"),
    DAILY_KEY,
  );
}

export async function readArchive(
  page: Page,
): Promise<Record<string, unknown>[]> {
  return page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k) ?? "[]"),
    ARCHIVE_KEY,
  );
}
