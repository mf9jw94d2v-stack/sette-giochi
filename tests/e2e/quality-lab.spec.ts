import { expect, test } from "@playwright/test";

/**
 * The Lab is reachable in this build because playwright.config.ts sets
 * VITE_ENABLE_QUALITY_LAB=true. A default production build has no such route —
 * that is checked at build level, not here.
 */
test.describe("Game Quality Lab", () => {
  test("reports measured metrics for all seven games", async ({ page }) => {
    await page.goto("/lab");
    await expect(
      page.getByRole("heading", { level: 1, name: /game quality lab/i }),
    ).toBeVisible();

    const main = page.getByRole("main");
    await expect(main).toContainText(/livelli generati/i);
    for (const name of [
      "Krillion",
      "Plain",
      "Fact Map",
      "Estimania",
      "Size It Up",
      "GeoSlice",
      "Gazillion",
    ]) {
      await expect(
        main.getByRole("heading", { name, exact: true }).first(),
      ).toBeVisible();
    }
    // Never placeholder values. Case-sensitive and word-bounded on purpose:
    // "QuarantenaNessun" contains a case-insensitive "nan".
    await expect(main).not.toContainText(/\bNaN\b|\bundefined\b|lorem ipsum/);
  });

  test("the seed window changes the counts it reports", async ({ page }) => {
    await page.goto("/lab");
    await page.getByRole("button", { name: "30 giorni", exact: true }).click();
    await expect(page.getByRole("main")).toContainText("30 giorni, dal");
    await page.getByRole("button", { name: "90 giorni", exact: true }).click();
    await expect(page.getByRole("main")).toContainText("90 giorni, dal");
  });

  test("a quarantined level can be re-reviewed from the page", async ({
    page,
  }) => {
    await page.goto("/lab");
    await page.getByRole("button", { name: "730 giorni", exact: true }).click();
    const review = page.getByRole("button", { name: /riesamina/i }).first();
    await expect(review).toBeVisible();
    await review.click();
    await expect(page.getByRole("main")).toContainText(/riesame:/i);
  });
});
