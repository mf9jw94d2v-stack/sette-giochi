# Testing Strategy

_Last updated: 2026-10-27_

## Layers

- **Unit (Vitest).** Pure engine logic, scoring, generators, validators,
  deduplication, difficulty, date handling, streaks, serialization. Deterministic
  fixtures and seeds. _Status: harness configured; 1 real test suite
  (`src/games/registry.test.ts`, 4 tests passing)._
- **Property-based (fast-check).** Invariants that must always hold, e.g. "a
  level the validator approves satisfies every declared structural constraint",
  generator stability, serialization round-trips. _Status: installed, no
  properties written yet._
- **Integration.** Persistence adapters and services against a real backend
  where correctness depends on it (not just mocks). _Status: planned._
- **End-to-end (Playwright).** Real browser flows: homepage, nav, auth, play a
  game, record a result, archive separation, theme, mobile, protected routes,
  and the daily-challenge integrity cases (double-click, duplicate/concurrent
  submits, device-clock tampering). _Status: installed; browsers not yet
  downloaded; no specs written yet._

## Rules we hold ourselves to

- Never report a test as passing that wasn't run.
- Daily-challenge integrity is tested at the DB/server level, not only the UI.
- Prefer real fixtures over mocks where the behaviour depends on the backend.

## Commands

```bash
npm run test        # Vitest unit/property
npm run test:e2e    # Playwright (after: npx playwright install)
```

## CI (built)

`.github/workflows/ci.yml`, three jobs:

1. **check** — `npm ci` (lockfile) → typecheck → lint → `prettier --check` →
   `npm test` → production build → `quality:check` (proves the committed
   quality report is reproducible from the same seeds).
2. **e2e** — installs Chromium and runs Playwright against a real production
   build served by `vite preview`; uploads the HTML report as an artifact.
3. **audit** — `npm audit --audit-level=high`, advisory only, so a transitive
   advisory nobody can act on does not block the pipeline.

`permissions: contents: read` only — nothing in CI deploys, publishes or
touches a database. No step needs a secret, so none is documented as
"optional": when Supabase arrives, its jobs go in a separate workflow with its
own environment.

Every step has been run locally and passes. The workflow itself has **not**
run on GitHub yet — this repository has no remote.

## End-to-end (Playwright) — what is actually covered

46 tests (23 × desktop + Pixel 7), `tests/e2e/`:

- **navigation.spec.ts** — the seven games on the homepage, every shared
  destination, every game board loading with its own start button, 404, theme
  switch + persistence across reloads, no horizontal overflow.
- **daily-integrity.spec.ts** — section 25 of the brief: seven independent
  challenges, a finished daily recorded exactly once, re-entry showing the
  stored score, reload not writing a second result, double-click on start,
  device clock moved forward, streaks, and the archive never touching official
  results.
- **quality-lab.spec.ts** — real metrics for all seven games, the seed window
  changing what is reported, re-reviewing a quarantined level, and an
  assertion that no placeholder value (`NaN`, `undefined`) ever reaches the
  page.
- **settings.spec.ts** — exporting your own data, the two-step erase actually
  clearing it, and the profile's honest empty state.

Seeded results stand in for played games where the point of the test is what
the platform does with a result, not replaying a game UI; `helpers.ts` seeds
once per tab so a `page.reload()` cannot silently wipe what the app just
wrote.
