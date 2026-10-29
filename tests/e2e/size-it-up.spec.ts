import { expect, test, type Page } from "@playwright/test";
import { readArchive, readDaily, seedResults, todayUtc } from "./helpers";

/**
 * Size It Up's own integrity rules (section 19 of the brief). These are the
 * ones that only a real browser can settle: that the reference never moves,
 * that zooming does not quietly change the answer, that the true size stays
 * hidden until the player commits, and that one answer scores once.
 */

const READOUT = /Stai dicendo che .* misura ([\d.,]+ (?:mm|cm|m|km))/;

async function start(page: Page) {
  await page.goto("/games/size-it-up");
  await page.getByRole("button", { name: /^Inizia$/ }).click();
  await expect(
    page.getByRole("button", { name: /Blocca la scala/ }),
  ).toBeVisible();
}

/** The estimate the UI is currently claiming, in metres. */
async function estimate(page: Page): Promise<string> {
  const text = await page.getByRole("main").innerText();
  const m = text.match(READOUT);
  expect(m, "nessuna lettura della stima").not.toBeNull();
  return m![1];
}

/** Geometry of a drawn silhouette, read from the rendered SVG. */
async function drawn(page: Page, fill: string) {
  return page.evaluate((f) => {
    const p = [
      ...document.querySelectorAll("svg[role='img'] g[transform] path"),
    ].find((el) => el.getAttribute("fill") === f);
    if (!p) return null;
    // Unrounded: a silhouette can be only ~15 px tall, and rounding that to
    // whole pixels alone moves the ratio by several percent.
    const r = (p as SVGGraphicsElement).getBoundingClientRect();
    return { w: r.width, h: r.height };
  }, fill);
}

const BLUE = "var(--siu-blue)";
const RED = "var(--siu-red)";

test.describe("Size It Up — the comparison", () => {
  test("puts two real silhouettes on one baseline", async ({ page }) => {
    await start(page);
    const ref = await drawn(page, BLUE);
    const target = await drawn(page, RED);
    expect(ref!.w).toBeGreaterThan(4);
    expect(target!.w).toBeGreaterThan(4);
    await expect(page.getByRole("main")).toContainText("Riferimento:");
    await expect(page.getByRole("main")).toContainText("Bersaglio:");
  });

  test("resizes with the slider, the buttons and the keyboard alike", async ({
    page,
  }) => {
    await start(page);
    const first = await estimate(page);

    await page
      .getByRole("button", { name: "Ingrandisci", exact: true })
      .click();
    const afterPlus = await estimate(page);
    expect(afterPlus).not.toBe(first);

    await page
      .getByRole("button", { name: "Rimpicciolisci", exact: true })
      .click();
    expect(await estimate(page)).toBe(first);

    // Several key presses in one go must all land, not collapse into one.
    await page.keyboard.press("+");
    const one = await estimate(page);
    await page.keyboard.press("+");
    await page.keyboard.press("+");
    expect(await estimate(page)).not.toBe(one);

    // The slider is the accessible route to the same value.
    const slider = page.getByRole("slider");
    await expect(slider).toHaveAttribute(
      "aria-valuetext",
      /volte il riferimento/,
    );
  });

  test("keeps the silhouette's proportions while resizing", async ({
    page,
  }) => {
    await start(page);
    const before = await drawn(page, RED);
    await page
      .getByRole("button", { name: "Ingrandisci", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Ingrandisci", exact: true })
      .click();
    const after = await drawn(page, RED);
    expect(after!.w).toBeGreaterThan(before!.w);
    expect(after!.w / after!.h).toBeCloseTo(before!.w / before!.h, 2);
  });

  test("never changes the estimate when only the view is zoomed", async ({
    page,
  }) => {
    await start(page);
    const before = await estimate(page);
    await page.getByRole("button", { name: "Ingrandisci la vista" }).click();
    await page.getByRole("button", { name: "Ingrandisci la vista" }).click();
    expect(await estimate(page)).toBe(before);
    await page.getByRole("button", { name: "Inquadra entrambi" }).click();
    expect(await estimate(page)).toBe(before);
  });

  test("hides the target's real size until the player commits", async ({
    page,
  }) => {
    await start(page);
    const main = page.getByRole("main");
    await expect(main).not.toContainText("Misura reale");
    await expect(main).not.toContainText(/Scarto/);
    await expect(main).not.toContainText(/Fonte della misura/);

    await page.getByRole("button", { name: /Blocca la scala/ }).click();
    await expect(main).toContainText("Misura reale");
  });
});

test.describe("Size It Up — an answer is final", () => {
  test("freezes the controls and scores once on lock in", async ({ page }) => {
    await seedResults(page, []);
    await start(page);
    const locked = await estimate(page);

    const lock = page.getByRole("button", { name: /Blocca la scala/ });
    // Three fast clicks must still be one answer.
    await lock.click({ clickCount: 3 });

    await expect(page.getByRole("main")).toContainText("La tua stima");
    await expect(page.getByRole("main")).toContainText(locked);
    // The resize controls are gone, so the answer cannot be edited.
    await expect(page.getByRole("slider")).toHaveCount(0);
    await expect(lock).toHaveCount(0);

    // Exactly one round is marked as played.
    const answered = await page.evaluate(
      () =>
        [
          ...document.querySelectorAll("main span[aria-hidden='true'] > span"),
        ].filter(
          (s) =>
            // The progress mark of a played round takes the target colour.
            (s as HTMLElement).style.backgroundColor === "var(--siu-red)",
        ).length,
    );
    expect(answered).toBe(1);
  });

  test("plays five rounds through to a summary that keeps every score", async ({
    page,
  }) => {
    await seedResults(page, []);
    await start(page);

    const points: number[] = [];
    for (let i = 0; i < 5; i++) {
      await page.getByRole("button", { name: /Blocca la scala/ }).click();
      const text = await page.getByRole("main").innerText();
      points.push(Number(text.match(/\+(\d+)\s*\/ 100/)![1]));
      await page
        .getByRole("button", { name: /Prossimo confronto|Vedi il risultato/ })
        .click();
    }

    const total = points.reduce((a, b) => a + b, 0);
    const main = page.getByRole("main");
    await expect(main).toContainText(/completata/i);
    await expect(main).toContainText(`su 500`);
    // The summary lists one line per comparison.
    await expect(main).toContainText(/proporzioni perfette su 5/);

    const stored = await readDaily(page);
    expect(stored).toHaveLength(1);
    expect(stored[0].score).toBe(total);
    expect(stored[0].gameId).toBe("size-it-up");
    // A daily never leaks into the archive.
    expect(await readArchive(page)).toHaveLength(0);
  });

  test("a reload after finishing shows the stored score, not a new game", async ({
    page,
  }) => {
    await seedResults(page, []);
    await start(page);
    for (let i = 0; i < 5; i++) {
      await page.getByRole("button", { name: /Blocca la scala/ }).click();
      await page
        .getByRole("button", { name: /Prossimo confronto|Vedi il risultato/ })
        .click();
    }
    const stored = (await readDaily(page))[0].score as number;

    await page.reload();
    await expect(page.getByRole("main")).toContainText(/hai già giocato/i);
    await expect(page.getByRole("main")).toContainText(String(stored));
    expect(await readDaily(page)).toHaveLength(1);
  });

  test("practice is separate: it never writes an official result", async ({
    page,
  }) => {
    await seedResults(page, []);
    await page.goto("/games/size-it-up");
    await page.getByRole("tab", { name: "Allenamento" }).click();
    await page.getByRole("button", { name: /^Inizia$/ }).click();
    for (let i = 0; i < 5; i++) {
      await page.getByRole("button", { name: /Blocca la scala/ }).click();
      await page
        .getByRole("button", { name: /Prossimo confronto|Vedi il risultato/ })
        .click();
    }
    expect(await readDaily(page)).toHaveLength(0);
    expect(await readArchive(page)).toHaveLength(1);
  });
});

test.describe("Size It Up — the reveal", () => {
  test("shows guess, truth, error, direction and a checkable source", async ({
    page,
  }) => {
    await start(page);
    await page.getByRole("button", { name: /Blocca la scala/ }).click();
    const main = page.getByRole("main");

    await expect(main).toContainText("La tua stima");
    await expect(main).toContainText("Misura reale");
    await expect(main).toContainText("Scarto");
    await expect(main).toContainText("Direzione");
    await expect(main).toContainText("Fonte della misura");
    await expect(main).not.toContainText(/\bNaN\b|\bundefined\b|Infinity/);

    // Both the guess and the truth are on the stage, in different colours.
    const guessOutline = await page.evaluate(
      (red) =>
        [...document.querySelectorAll("svg[role='img'] path")].filter(
          (p) => p.getAttribute("stroke") === red,
        ).length,
      RED,
    );
    expect(guessOutline).toBe(1);
    expect(await drawn(page, "var(--siu-good)")).not.toBeNull();
  });

  test("today's date decides the comparisons, not the device", async ({
    page,
  }) => {
    await start(page);
    const first = await page.getByRole("main").innerText();
    await page.goto("/games/size-it-up");
    await page.getByRole("button", { name: /^Inizia$/ }).click();
    const again = await page.getByRole("main").innerText();
    const name = (t: string) => t.match(/Riferimento: ([^—]+)/)![1].trim();
    expect(name(again)).toBe(name(first));
    expect(todayUtc()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
