import { expect, test } from "@playwright/test";
import { dailyRecord, readDaily, seedResults, todayUtc } from "./helpers";

test.describe("data rights", () => {
  test("a player can download their own data", async ({ page }) => {
    await seedResults(page, [dailyRecord("plain", todayUtc(), 2500)]);
    await page.goto("/settings");

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /esporta i miei dati/i }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^sette-giochi-dati-.*\.json$/);
    await expect(page.getByRole("status")).toContainText(
      /esportate 1 partite/i,
    );
  });

  test("erasing takes two steps and really clears the data", async ({
    page,
  }) => {
    await seedResults(page, [dailyRecord("plain", todayUtc(), 2500)]);
    await page.goto("/settings");

    await page.getByRole("button", { name: /^cancella i miei dati$/i }).click();
    // Nothing is gone yet: the first click only asks.
    expect(await readDaily(page)).toHaveLength(1);
    await expect(page.getByRole("main")).toContainText(/confermi\?/i);

    // And it can be called off.
    await page.getByRole("button", { name: /annulla/i }).click();
    expect(await readDaily(page)).toHaveLength(1);

    await page.getByRole("button", { name: /^cancella i miei dati$/i }).click();
    await page.getByRole("button", { name: /sì, cancella tutto/i }).click();
    await expect(page.getByRole("status")).toContainText(/dati cancellati/i);
    expect(await readDaily(page)).toHaveLength(0);
  });
});

test.describe("profile", () => {
  test("says plainly when there is nothing to show", async ({ page }) => {
    await seedResults(page, []);
    await page.goto("/profile");
    await expect(page.getByRole("main")).toContainText(
      /non hai ancora giocato/i,
    );
  });

  test("shows the player's real aggregates once they have played", async ({
    page,
  }) => {
    await seedResults(page, [
      dailyRecord("plain", todayUtc(), 2500),
      dailyRecord("geoslice", todayUtc(), 1800),
    ]);
    await page.goto("/profile");
    const main = page.getByRole("main");
    await expect(main).toContainText(/sfide completate/i);
    await expect(main).toContainText("2500");
    await expect(main).toContainText("1800");
    await expect(main).not.toContainText(/\bNaN\b|\bundefined\b/);
  });

  test("says plainly that this build has no accounts", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("main")).toContainText(
      /questa installazione non ha account/i,
    );
    // And it does not advertise what it cannot do.
    await expect(page.getByRole("link", { name: "Accedi" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Classifiche" })).toHaveCount(
      0,
    );
  });
});
