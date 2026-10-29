import { expect, test } from "@playwright/test";
import { GAMES } from "./helpers";

test.describe("homepage and navigation", () => {
  test("shows all seven games", async ({ page }) => {
    await page.goto("/");
    for (const game of GAMES) {
      await expect(
        page.getByRole("link", { name: new RegExp(game.name, "i") }).first(),
      ).toBeVisible();
    }
  });

  test("every shared destination is reachable and renders its own page", async ({
    page,
  }) => {
    const pages = [
      { path: "/games", heading: /giochi/i },
      { path: "/daily", heading: /sfid/i },
      { path: "/archive", heading: /archivio/i },
      { path: "/stats", heading: /statistiche/i },
      { path: "/history", heading: /cronologia/i },
      { path: "/profile", heading: /profilo/i },
      { path: "/settings", heading: /impostazioni/i },
    ];
    for (const p of pages) {
      await page.goto(p.path);
      await expect(
        page.getByRole("heading", { level: 1, name: p.heading }),
      ).toBeVisible();
    }
  });

  test("each game page loads its own board", async ({ page }) => {
    for (const game of GAMES) {
      await page.goto(`/games/${game.id}`);
      await expect(
        page.getByRole("heading", { level: 1, name: game.name }),
      ).toBeVisible();
      // Every game opens on its own instructions screen with its own start
      // button — the wording is part of each game's identity.
      await expect(
        page.getByRole("button", { name: game.start }),
      ).toBeVisible();
    }
  });

  test("an unknown route shows the not-found page, not a blank screen", async ({
    page,
  }) => {
    await page.goto("/questa-pagina-non-esiste");
    await expect(page.getByRole("main")).toContainText(/non/i);
    await expect(
      page.getByRole("link", { name: /home/i }).first(),
    ).toBeVisible();
  });
});

test.describe("theme", () => {
  test("switches between light and dark and survives a reload", async ({
    page,
  }) => {
    await page.goto("/settings");
    const html = page.locator("html");

    await page.getByRole("radio", { name: "Scuro" }).click();
    await expect(html).toHaveClass(/dark/);

    await page.reload();
    await expect(html).toHaveClass(/dark/);

    await page.getByRole("radio", { name: "Chiaro" }).click();
    await expect(html).not.toHaveClass(/dark/);
    await page.reload();
    await expect(html).not.toHaveClass(/dark/);
  });
});

test.describe("layout", () => {
  test("no horizontal overflow on any main page", async ({ page }) => {
    for (const path of [
      "/",
      "/games",
      "/daily",
      "/archive",
      "/stats",
      "/profile",
    ]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth + 1,
      );
      expect(overflow, `${path} overflows horizontally`).toBe(false);
    }
  });

  test("no horizontal overflow on any game, before and after starting", async ({
    page,
  }) => {
    const overflows = () =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth + 1,
      );
    for (const id of [
      "fact-map",
      "geoslice",
      "gazillion",
      "estimania",
      "plain",
      "krillion",
      "size-it-up",
    ]) {
      await page.goto(`/games/${id}`);
      // Practice: the daily may already be locked by another test's data.
      await page.getByRole("tab", { name: /allenamento/i }).click();
      expect(await overflows(), `${id} intro overflows`).toBe(false);
      await page
        .getByRole("button", { name: /inizia|decolla/i })
        .first()
        .click();
      await page.waitForTimeout(300);
      expect(await overflows(), `${id} in play overflows`).toBe(false);
    }
  });
});

test.describe("Light and dark theme in every game", () => {
  const ROOT: Record<string, string> = {
    krillion: ".kr",
    plain: ".pl",
    "fact-map": ".fm",
    estimania: ".es",
    "size-it-up": ".siu",
    geoslice: ".gs",
    gazillion: ".gz",
  };

  test("each game page changes its own colours with the theme", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const look = async (id: string, theme: string) => {
      await page.addInitScript(
        (t) => localStorage.setItem("sgp-theme", t),
        theme,
      );
      await page.goto(`/games/${id}`);
      const root = page.locator(ROOT[id]).first();
      await expect(root).toBeVisible();
      return root.evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          bg: `${cs.backgroundColor} ${cs.backgroundImage}`,
          fg: cs.color,
          scheme: cs.colorScheme,
        };
      });
    };
    for (const id of Object.keys(ROOT)) {
      const light = await look(id, "light");
      const dark = await look(id, "dark");
      expect(light.bg, `${id}: background`).not.toBe(dark.bg);
      expect(light.fg, `${id}: text`).not.toBe(dark.fg);
      expect([light.scheme, dark.scheme], id).toEqual(["light", "dark"]);
    }
  });
});

test.describe("Public game addresses", () => {
  test("each game lives at its own name, and old links redirect there", async ({
    page,
  }) => {
    for (const g of GAMES) {
      await page.goto(`/games/${g.slug}`);
      await expect(page.getByRole("button", { name: g.start })).toBeVisible();
      if (g.slug !== g.id) {
        await page.goto(`/games/${g.id}`);
        await expect(page).toHaveURL(new RegExp(`/games/${g.slug}$`));
      }
    }
    await page.goto("/archive/gazillion");
    await expect(page).toHaveURL(/\/archive\/epoche$/);
  });
});
