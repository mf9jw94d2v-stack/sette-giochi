import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { GAMES, startGame } from "./helpers";

/**
 * Automated accessibility checks (axe-core, WCAG 2.1 A and AA rules) on every
 * page and every game, in both themes. Automated checks find a part of the
 * problems — not all: screen-reader use is still to be tried by a person.
 */
const PAGES = [
  "/",
  "/games",
  "/daily",
  "/archive",
  "/archive/epoche",
  "/stats",
  "/history",
  "/profile",
  "/settings",
  "/privacy",
  "/pagina-che-non-esiste",
];

for (const theme of ["light", "dark"] as const) {
  test.describe(`Accessibility, ${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(
        (t) => localStorage.setItem("sgp-theme", t),
        theme,
      );
    });

    for (const path of PAGES) {
      test(`page ${path}`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        const { violations } = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        expect(
          violations.map(
            (v) =>
              `${v.id}: ${v.nodes
                .map((n) => n.target.join(" "))
                .slice(0, 4)
                .join(" | ")}`,
          ),
        ).toEqual([]);
      });
    }

    for (const g of GAMES) {
      test(`game ${g.name}, start and first round`, async ({ page }) => {
        await page.goto(`/games/${g.slug}`);
        await page.waitForLoadState("networkidle");
        const check = async () =>
          (
            await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
              .analyze()
          ).violations.map(
            (v) =>
              `${v.id}: ${v.nodes
                .map((n) => n.target.join(" "))
                .slice(0, 4)
                .join(" | ")}`,
          );
        expect(await check(), "start screen").toEqual([]);
        await startGame(page, g.start);
        await page.waitForTimeout(400);
        expect(await check(), "first round").toEqual([]);
      });
    }
  });
}
