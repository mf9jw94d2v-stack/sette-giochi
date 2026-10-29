/**
 * Photograph the link-preview images (1200×630) into public/og/:
 * home.png and one per game, named after the game's public slug.
 * Starts the Vite dev server, opens /og/<slug> (src/features/og/OgCard.tsx)
 * in Chromium, waits for the web fonts, takes the picture.
 *
 *   node scripts/og/capture.mjs
 */
import { createServer } from "vite";
import { chromium } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const SLUGS = [
  "home",
  "abissi",
  "quota",
  "atlante",
  "stima",
  "in-scala",
  "taglio",
  "epoche",
];

const server = await createServer({
  root,
  logLevel: "error",
  server: { port: 5199, strictPort: true },
  // Never talk to a real backend while taking pictures.
  define: {
    "import.meta.env.VITE_SUPABASE_URL": '""',
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": '""',
  },
});
await server.listen();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
  });
  for (const slug of SLUGS) {
    await page.goto(`http://localhost:5199/og/${slug}`);
    const card = page.locator("#og-card");
    await card.waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await card.screenshot({ path: join(root, "public/og", `${slug}.png`) });
    console.log(`public/og/${slug}.png`);
  }
} finally {
  await browser.close();
  await server.close();
}
