# Decisions (ADR log)

Short architectural decision records. Newest first.

## ADR-0013 — Database tests run on PGlite, auth e2e on a stand-in API

**Decision.** Migrations, grants and RLS are tested in Vitest on PGlite (real
PostgreSQL 18 compiled to WebAssembly) over a small Supabase shim
(`supabase/tests/supabase-shim.sql`: the three API roles, `auth.users`,
`auth.uid()`, Supabase's default privileges). The account flows are tested
end to end against `tests/e2e/backend/fakeSupabase.ts`, which answers the
Supabase HTTP API inside Playwright and runs the real, bundled Edge Function
code for score submission.

**Why.** No Docker, Supabase CLI, Postgres or Deno on the development machine,
and no Supabase project yet. PGlite gives real SQL semantics (RLS, column
grants, constraints, triggers) with nothing to install; the tests were
mutation-checked (loosening a policy or adding a grant makes them fail).

**Limits.** The shim is not GoTrue or PostgREST; the fake API is not Supabase.
What they cannot prove — email delivery, the real auth server, Deno itself —
is listed in docs/SECURITY.md and docs/DEPLOYMENT.md, and must be checked on
the real project.

## ADR-0012 — Guest results are imported as unverified, never ranked

**Decision.** After signing in, the player is offered (once, never forced) to
copy device results into the account through `import_guest_results`. Every
row is re-validated in SQL; imported daily results are marked
`verification = 'guest_import'` and excluded from leaderboards. The device
copy is not deleted.

**Why.** Guests keep their history and streaks; rankings stay limited to
results the server verified.

## ADR-0011 — Official scores are recomputed on the server by replay

**Decision.** An official daily result is written only by the `submit-daily`
Edge Function. The browser sends the player's answers round by round; the
function regenerates the level from the date with the same generator,
replays the answers through the same pure engine and stores the score that
comes out. Players have no insert/update/delete privilege on
`daily_results`. Each game owns its answer format (`src/games/<id>/answers.ts`);
Krillion's rarity tier is looked up again, never taken from the client.

**Why.** Every level is a deterministic function of its date and every engine
is pure, so replay is exact (property-tested on all seven games). It stops
invented scores without per-game server rewrites.

**Limits, stated.** Levels are generated in the browser, so answers can be
read from the bundle; Krillion's timer and Fact Map's hint are enforced only
client-side. Closing that would need server-generated levels revealed round
by round — a redesign of all seven games, not done.

## ADR-0010 — Supabase (Postgres + Auth + Edge Functions), no custom server

**Decision.** Supabase is the whole backend: Postgres with RLS for data,
Supabase Auth for accounts, two Edge Functions for what needs the service
role (score replay, account deletion). The `supabase-js` client is imported
dynamically and only when configured, so the guest build does not ship it.
Rows coming back from the database are validated with the existing
hand-written guards (ADR-0009), so Zod is still unused.

**Why.** It covers accounts, persistence and authorization without a second
server to run. The bundled-backend approach (`scripts/functions/build.mjs`)
keeps one source of truth for the scoring code.

## ADR-0009 — Stored data is validated by hand, not with Zod

**Decision.** `src/services/persistence/schema.ts` validates everything read
out of `localStorage` with hand-written type guards. Zod stays installed, for
the Supabase boundary.

**Why validate at all.** `localStorage` is under the player's control and an
older build may have written a shape we no longer use, so a stored row is
untrusted input. A row that does not fit is dropped, never repaired and never
thrown on: one corrupt record must not take down the stats page. The count of
dropped rows is logged; the content never is.

**Why not Zod.** It was tried first, with exactly these schemas. Persistence
loads on every page, and Zod measured **+91 kB** on the main bundle (448 →
539 kB; +26 kB gzipped) to check three small record shapes. The hand-written
version costs **+2.4 kB** and passes the same 13 tests unchanged. Measured
with `vite build`, not estimated.

**Tradeoff.** The guards are more code to keep in step with the record types,
so the tests cover each field being wrong individually. Had the shapes been
larger or remote, the trade would have gone the other way — which is why Zod
remains for the backend.

## ADR-0008 — The Quality Lab is build-gated, not authenticated

**Decision.** `/lab` exists only when `import.meta.env.DEV` or
`VITE_ENABLE_QUALITY_LAB === "true"`, written inline in the router so the
bundler folds it away. A default production build emits no `QualityLabPage`
chunk at all (verified against `vite build`).

**Why.** Section 21 asks for an access-controlled technical dashboard. With no
backend there is nothing that could verify a role, and a passphrase compiled
into the frontend would be security theatre. Removing the route from the build
is the one guarantee that actually holds today. The page also guards itself as
defence in depth, and says in its own UI that this is not yet authentication.

**Replaced by.** A server-verified `is_admin` claim plus RLS on the quality
tables, when Supabase lands (see `docs/security-design.md`).

## ADR-0007 — Difficulty is estimated per mechanic, never shared

**Decision.** Each game owns a `difficulty.ts` that scores one of its rounds
0..1 from its own mechanic. Only the mapping of that number to the four
platform tiers is shared (`src/games/difficulty.ts`).

**Why.** Six of the seven generators used to hardcode `difficulty: "medium"` —
a metric that looked real and measured nothing. The games score so differently
(log-ratio estimation, haversine distance, population balance) that one shared
difficulty model would be meaningless. Where a property genuinely cannot be
derived from content — Krillion's domain obscurity — it is **authored** and
labelled as authored, rather than dressed up as computed.

**Limits.** These estimate the _content_, not measured player difficulty: no
player data exists. Recorded wherever the numbers are shown.

## ADR-0006 — UI language is Italian

**Decision.** All user-facing UI text is in **Italian**, kept clear and simple;
the UI stays modern but easy to read. Visible brand is "Sette Giochi".

**Why.** Product requirement from the owner. For now the app is Italian-only, so
we write Italian copy directly in components rather than adding an i18n
framework (keeps it simple — YAGNI). Code identifiers, comments and docs remain
in English. If a second language is ever needed, introduce a light i18n layer
then. Event prompts (Gazillion) are authored in Italian.

## ADR-0005 — Local persistence fallback, Supabase for integrity

**Decision.** Define a `PersistenceAdapter` interface with a localStorage
implementation (default when no Supabase env is set) and a Supabase
implementation. **Status: planned (interface not yet written).**

**Why.** Lets the full UI be built and demoed with zero external dependencies,
while keeping the door open to real server-side daily-challenge integrity.
Daily-result uniqueness and concurrency safety are explicitly **not** promised
by the local adapter — that requires DB constraints + transactions.

## ADR-0004 — Tailwind CSS v4 with the Vite plugin

**Decision.** Use Tailwind v4 via `@tailwindcss/vite` and a CSS-first config
(`@theme`, `@custom-variant dark`), not a `tailwind.config.js`.

**Why.** v4 is the current line; the Vite plugin is the supported path and
needs no PostCSS config. Dark mode is class-based (`.dark` on `<html>`), set
pre-paint by an inline script to avoid a flash.

## ADR-0003 — ESLint covers the JavaScript, `tsc` covers the TypeScript

**Decision.** ESLint lints `.js/.jsx/.mjs/.cjs` only. `.ts`/`.tsx` are
explicitly ignored and checked by `tsc -b --noEmit` instead, which CI runs in
the same job.

**Why.** `typescript-eslint` does not merely warn on TypeScript 7 — it
**throws** from every entry point ("typescript-eslint does not support TS
7.0", upstream issue
[#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)).
Tried and rejected on 2026-10-28:

- installing it with `--legacy-peer-deps` → the runtime guard still throws;
- the vendor's suggested side-by-side TypeScript 6 (`typescript-6` alias) →
  it still `require("typescript")`, which resolves to 7;
- npm `overrides` pointing its `typescript` at the TS 6 alias → npm does not
  nest an override onto a _peer_ dependency, so nothing changed;
- deep-importing past the guard → would parse TS 7 sources with the TS 6 API,
  which is worse than not linting.

Leaving `.ts`/`.tsx` unlinted was chosen over leaving `npm run lint` failing on
114 parse errors, which is what happened when they were merely included with
the default JS parser.

**Tradeoff.** No TS-aware lint rules (`no-floating-promises`,
`no-unnecessary-condition`, …). Mitigated by TS `strict` + `noUnusedLocals` and
by the test suite. **Revisit** when #10940 closes; if it drags on, a
TypeScript-version-independent linter (oxlint) is the fallback — it is a
decision for the project owner, since it means another tool.

## ADR-0002 — React 19 + Vite + TypeScript 7

**Decision.** React 19, Vite 8, Vitest 5, TypeScript 7 (versions npm resolved
as current/stable on 2026-10-27).

**Why.** Matches the requested stack (React/TS/Vite) with current stable
releases. Note TS 7 removed `baseUrl` — path aliases use `paths` relative to
the tsconfig instead.

## ADR-0001 — Share infrastructure, not mechanics

**Decision.** Games are independent modules behind a uniform contract
(`src/types/game.ts`); the platform never encodes a single game's rules in
shared code.

**Why.** The core requirement: unify the experience across seven different
games and allow adding more without a rewrite.
