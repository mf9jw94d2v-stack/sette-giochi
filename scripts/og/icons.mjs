/**
 * Draw the app icons (installable app, home screen, Apple touch icon) into
 * public/icons/, with the site's own typeface. The same "7" badge as the
 * navigation bar.
 *
 *   node scripts/og/icons.mjs
 */
import { chromium } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "../../public/icons");

/** `pad`: share of the side left empty around the badge (maskable icons). */
const ICONS = [
  { name: "icon-192.png", size: 192, pad: 0 },
  { name: "icon-512.png", size: 512, pad: 0 },
  { name: "maskable-512.png", size: 512, pad: 0.2 },
  { name: "apple-touch-icon.png", size: 180, pad: 0.12 },
];

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const { name, size, pad } of ICONS) {
    const inner = Math.round(size * (1 - pad * 2));
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<!doctype html><html><head>
      <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@800&display=block" rel="stylesheet">
      <style>
        html,body{margin:0;width:${size}px;height:${size}px;background:#16130f;display:grid;place-items:center}
        .b{width:${inner}px;height:${inner}px;border-radius:${pad ? 0.22 * inner : 0.18 * size}px;background:#8d5f21;
           display:grid;place-items:center;color:#fdf8ee;font:800 ${Math.round(inner * 0.66)}px/1 'Bricolage Grotesque',sans-serif;
           letter-spacing:-0.04em}
      </style></head><body><div class="b">7</div></body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(out, name) });
    console.log(`public/icons/${name}`);
  }
} finally {
  await browser.close();
}
