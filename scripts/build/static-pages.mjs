/**
 * After `vite build`: one real HTML file per public address, each with its
 * own title, description and link-preview image.
 *
 * Why: GitHub Pages has no rewrite rules. Without this, /games/abissi only
 * exists through the 404 page: people see the game, but search engines and
 * link previews are told "not found". The files are copies of the built
 * index.html; the app itself is unchanged.
 *
 *   SITE_URL=https://user.github.io/repo node scripts/build/static-pages.mjs
 *
 * SITE_URL (no trailing slash) makes preview images and canonical links
 * absolute, as link previews require. Without it they stay relative.
 */
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const dist = join(root, "dist");
const jiti = createJiti(import.meta.url, { alias: { "@": join(root, "src") } });
const { GAMES } = await jiti.import(join(root, "src/games/registry.ts"));
const { GAME_SLUG } = await jiti.import(join(root, "src/games/slugs.ts"));

const site = (process.env.SITE_URL ?? "").replace(/\/+$/, "");
const template = readFileSync(join(dist, "index.html"), "utf8");
const DEFAULT_DESC =
  "Sette rompicapo quotidiani in un unico posto: gioca, tieni le tue serie e scala l'archivio.";

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** @type {{ path: string, title: string, description?: string, image?: string }[]} */
const pages = [
  { path: "", title: "Sette Giochi", image: "home" },
  {
    path: "games",
    title: "I giochi · Sette Giochi",
    description: "I sette giochi: cosa sono e come si gioca.",
  },
  {
    path: "daily",
    title: "Sfide di oggi · Sette Giochi",
    description: "Le sette sfide di oggi, uguali per tutti.",
  },
  {
    path: "archive",
    title: "Archivio · Sette Giochi",
    description: "Rigioca le sfide dei giorni passati.",
  },
  { path: "stats", title: "Statistiche · Sette Giochi" },
  { path: "history", title: "Cronologia · Sette Giochi" },
  { path: "profile", title: "Profilo · Sette Giochi" },
  { path: "settings", title: "Impostazioni · Sette Giochi" },
  {
    path: "leaderboard",
    title: "Classifiche · Sette Giochi",
    description: "Le classifiche di ogni gioco, giorno per giorno.",
  },
  { path: "privacy", title: "Privacy e dati · Sette Giochi" },
  { path: "login", title: "Accedi · Sette Giochi" },
  { path: "signup", title: "Crea un account · Sette Giochi" },
  { path: "forgot-password", title: "Password dimenticata · Sette Giochi" },
  { path: "reset-password", title: "Nuova password · Sette Giochi" },
  { path: "auth/callback", title: "Accesso · Sette Giochi" },
  { path: "account", title: "Account · Sette Giochi" },
  ...GAMES.flatMap((g) => [
    {
      path: `games/${GAME_SLUG[g.id]}`,
      title: `${g.name} · Sette Giochi`,
      description: `${g.tagline} ${g.description}`,
      image: GAME_SLUG[g.id],
    },
    {
      path: `archive/${GAME_SLUG[g.id]}`,
      title: `${g.name}, archivio · Sette Giochi`,
      description: `Rigioca le sfide passate di ${g.name}.`,
      image: GAME_SLUG[g.id],
    },
  ]),
];

const base =
  template.match(/<link rel="icon"[^>]*href="([^"]*)favicon\.svg"/)?.[1] ?? "/";

function render(page) {
  const desc = esc(page.description ?? DEFAULT_DESC);
  const title = esc(page.title);
  const image = `${site ? site + "/" : base}og/${page.image ?? "home"}.png`;
  const url = site ? `${site}/${page.path}` : "";
  let html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${desc}$2`)
    .replace(
      /(<meta\s+property="og:title"\s+content=")[^"]*(")/,
      `$1${title}$2`,
    )
    .replace(
      /(<meta\s+property="og:description"\s+content=")[^"]*(")/,
      `$1${desc}$2`,
    )
    .replace(
      /(<meta\s+property="og:image"\s+content=")[^"]*(")/,
      `$1${image}$2`,
    );
  if (url)
    html = html.replace(
      "</head>",
      `  <meta property="og:url" content="${url}" />\n    <link rel="canonical" href="${url}" />\n  </head>`,
    );
  return html;
}

for (const page of pages) {
  const html = render(page);
  if (page.path === "") {
    writeFileSync(join(dist, "index.html"), html);
    continue;
  }
  // Both "games/abissi.html" (served at /games/abissi) and
  // "games/abissi/index.html" (served at /games/abissi/), so either form of
  // the address answers 200.
  mkdirSync(join(dist, page.path), { recursive: true });
  writeFileSync(join(dist, page.path, "index.html"), html);
  writeFileSync(join(dist, `${page.path}.html`), html);
}
// For search engines: what to crawl, and where.
if (site) {
  const indexable = pages.filter(
    (p) =>
      ![
        "login",
        "signup",
        "forgot-password",
        "reset-password",
        "auth/callback",
        "account",
        "profile",
        "settings",
        "history",
        "stats",
      ].includes(p.path),
  );
  writeFileSync(
    join(dist, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable
      .map((p) => `  <url><loc>${site}/${p.path}</loc></url>`)
      .join("\n")}\n</urlset>\n`,
  );
  writeFileSync(
    join(dist, "robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n`,
  );
}
// Anything else (an archive day, a typo) still opens the app.
copyFileSync(join(dist, "index.html"), join(dist, "404.html"));
console.log(
  `Static pages: ${pages.length} addresses${site ? ` for ${site}` : ""}.`,
);
