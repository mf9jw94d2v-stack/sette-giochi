# CLAUDE.md — Sette Giochi

Instructions for working in this repository. The user writes in Italian;
all user-facing UI text is Italian, plain and simple. Reports to the user:
short, Italian, outcome first.

## What this is

A React SPA with seven independent daily puzzle games and a shared platform.
Optional Supabase backend (Postgres + Auth + 2 Edge Functions). Without
`VITE_SUPABASE_*` the app is guest-only and must keep working.

## Layout

- `src/games/<id>/` — one game: `*Game.tsx` (own visual identity and CSS),
  `engine.ts` (pure), `generator.ts` (deterministic from the date),
  `answers.ts` (state → answers, untrusted answers → moves).
- `src/games/replay.ts` — server-side score recomputation. Must stay free of
  DOM/React/I/O: it is bundled for Deno.
- `src/games/shared/` — behaviour only (daily lock, save once). Never visuals.
- `src/services/persistence/` — `PersistenceAdapter`, local + Supabase
  adapters, outbox, save events. Games only use `getPersistence()`.
- `src/services/{auth,account,supabase}/`, `src/features/*` — pages.
- `src/backend/` — Edge Function logic (standard Request/Response), tests on
  PGlite. `supabase/functions/*/index.ts` are thin Deno wrappers.
- `supabase/migrations/` — schema, grants, RLS. `supabase/tests/` — test shim.

## Commands (all must pass before saying something works)

`npm run typecheck` · `npm run lint` · `npm run format:check` · `npm test` ·
`npm run functions:check` · `npm run build` · `npm run test:e2e`
(run `pkill -f "vite preview"` first; includes axe accessibility checks).
After changing `src/backend`, `src/games/**/engine|generator|answers` or
`replay.ts`: `npm run functions:build`. Preview images:
`node scripts/og/capture.mjs`; icons: `node scripts/og/icons.mjs`.
Generated data (never edit by hand): Atlante map `node scripts/geo/build-world.mjs`;
Taglio regions `node scripts/geo/build-geoslice.mjs <ne_10m_populated_places_simple.geojson>`
(source URL in the script; changing cities changes `GEO_GENERATOR_VERSION`);
In Scala silhouettes `node scripts/silhouettes/build.mjs`. Dark is the default theme.

## Publishing

GitHub repo `mf9jw94d2v-stack/sette-giochi`, branch `main` → GitHub Pages
(`.github/workflows/pages.yml`). Work on `main`; local `master` keeps the
private history with third-party captures and must never be pushed. Push to
`main` only when the user asks for changes to go online.

## Rules

- Never claim a feature or a test passes unless it was run. Never invent
  data, scores, statistics or game rules. Report limits plainly.
- Secrets: never in the repo, logs or frontend. Browser gets only the
  publishable key. No `service_role` outside Edge Functions.
- Database: every table gets RLS + `revoke all from anon, authenticated` +
  minimal grants + explicit policies; functions use `search_path = ''`.
  New change = new migration file, never edit an applied one. Update
  `src/services/supabase/database.types.ts` and `src/backend/*.test.ts`
  together. No destructive or automatic migrations on a real database.
- Official daily results are written ONLY by `submit-daily` after replay.
  Changing a generator changes its version: old answers are then refused.
- Do not deploy, publish, create paid resources or push without explicit
  permission. No `git reset --hard`, no mass deletes.
- Commit messages end with: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## The seven identities (keep them distinct)

Public names (UI, URLs) differ from the internal ids, which never change
(they key stored results, the database and the generators):
krillion → Abissi `/games/abissi` · plain → Quota `/games/quota` ·
fact-map → Atlante `/games/atlante` · estimania → Stima `/games/stima` ·
size-it-up → In Scala `/games/in-scala` · geoslice → Taglio `/games/taglio` ·
gazillion → Epoche `/games/epoche`. Mapping in `src/games/slugs.ts`; old
URLs redirect. Each game has a light and a dark palette (CSS variables).

Krillion: deep sea, VT323, cyan on near-black · Plain: cockpit instruments,
lime on graphite · Fact Map: atlas, Outfit, ink and rust · Estimania:
notebook of numbers, Fraunces, teal · Size It Up: blueprint/poster, Archivo
condensed, red and navy · GeoSlice: dark GIS, Chakra Petch, cyan/orange ·
Gazillion: night timeline, Unbounded, amber. Details: `docs/game-identities.md`.
Each game resets headings to its own font; shared code never styles a game.
