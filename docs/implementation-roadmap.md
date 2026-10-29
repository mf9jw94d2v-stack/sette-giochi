# Implementation Roadmap

_Last updated: 2026-10-27_

Status legend: ✅ done & verified · 🟡 in progress · ⬜ not started · 🔒 blocked
on an external dependency (noted).

## Phase 1 — Environment ✅

- ✅ Verify directory, Git, Node 24.22.1, npm 11.19.1.

## Phase 2 — Analysis of the seven games 🟡

- 🟡 `docs/game-analysis.md` created as an honest, mostly-pending record.
- ⬜ Verify each game's live mechanics (some sites may be post-training or
  need manual screenshots). No rules will be invented.

## Phase 3 — Architecture ✅ (initial)

- ✅ Stack chosen, module layout defined, game-module contract written
  (`src/types/game.ts`), persistence strategy decided.
- ⬜ Database schema detailed (`docs/database-design.md` is an outline).

## Phase 4 — Toolchain ✅

- ✅ Vite + React 19 + TS 7, Tailwind v4, Vitest, fast-check, Playwright
  installed. ✅ typecheck, unit tests and production build all pass.
- 🟡 ESLint (JS-level only; see ADR-0003). ⬜ Playwright browsers not yet
  downloaded; ⬜ CI not yet configured.

## Phase 5 — Common platform 🟡

- ✅ Homepage with seven cards, shared navigation, root layout, footer.
- ✅ Light/dark/system theme with persistence and pre-paint application.
- ✅ Responsive navbar (mobile menu), skip-link, focus-visible, reduced-motion.
- ⬜ Shared UI kit (buttons/dialogs/etc.), loading/error boundaries.

## Phase 6 — Backend ⬜ 🔒 (needs a Supabase project)

- ⬜ `PersistenceAdapter` + local adapter, then Supabase adapter.
- ⬜ Schema, migrations, RLS, auth. Blocked on Supabase credentials.

## Phase 7 — Game integration ⬜

- ⬜ One game at a time: verify rules → engine → UI → scoring → levels → tests.

## Phase 8 — Daily challenges ⬜

- ⬜ Deterministic assignment, server-side persistence, unique constraints,
  concurrency tests, timezone-defined day boundary.

## Phase 9 — Archive, streaks, statistics ⬜

- ⬜ Free play separated from official results; history; calendar; streak;
  personal dashboard.

## Phase 10 — Level generation ⬜

- ⬜ Per-game generators, two-pass validation, dedup, difficulty, quarantine,
  reports.

## Phase 11 — Game Quality Lab ⬜

- ⬜ Access-controlled technical dashboard; empty states, not fake metrics.

## Phase 12 — Final verification ⬜

- ⬜ Full test suites, security checks, responsive/a11y, performance, build.

## Phase 13 — Release prep ⬜ 🔒 (needs authorization)

- ⬜ Prod config, checklists, backup/rollback. No deploy without the go-ahead.

## Immediate next steps

1. Verify the seven games' mechanics (Phase 2) and fill `game-analysis.md`.
2. Define the `PersistenceAdapter` + local adapter so features can persist
   without Supabase.
3. Detail the database schema (`database-design.md`).
4. Implement the first game end-to-end as a vertical slice (engine + UI +
   generator + validator + tests).
