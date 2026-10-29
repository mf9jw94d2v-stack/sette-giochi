import { expect, test } from "@playwright/test";
import { startGame } from "./helpers";

test.use({ serviceWorkers: "allow" });

test.describe("Installable and offline", () => {
  test("declares a manifest with icons", async ({ page, request }) => {
    await page.goto("/");
    const href = await page
      .locator('link[rel="manifest"]')
      .getAttribute("href");
    const manifest = await (await request.get(href!)).json();
    expect(manifest).toMatchObject({
      name: "Sette Giochi",
      display: "standalone",
    });
    for (const icon of manifest.icons) {
      expect(
        (
          await request.get(new URL(icon.src, page.url() + href).toString())
        ).ok(),
      ).toBe(true);
    }
  });

  test("a game visited once opens again without a connection", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    await page.evaluate(() => navigator.serviceWorker.ready);
    // Visit a game while online, so its code is stored.
    await page.goto("/games/stima");
    await expect(page.getByRole("button", { name: /^Inizia/ })).toBeVisible();

    await context.setOffline(true);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Sette giochi, una sfida/ }),
    ).toBeVisible();
    await page.goto("/games/stima");
    await startGame(page, /^Inizia/);
    await expect(page.getByLabel(/La tua stima/)).toBeVisible();
    await context.setOffline(false);
  });
});
