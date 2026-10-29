# Architecture Proposal

> L'architettura implementata, backend compreso, è descritta in
> **[ARCHITECTURE.md](ARCHITECTURE.md)**. Questo documento resta per il
> contratto dei moduli di gioco, che non è cambiato.

_Last updated: 2026-10-27_

## Guiding principle

**Share infrastructure, not mechanics.** The platform provides accounts,
routing, theming, daily-challenge orchestration, archive, persistence and
statistics. Each game plugs in through a small, uniform contract but keeps its
own engine, rules, scoring and level shape. Adding an eighth game must not
require rewriting the platform.

## The game-module contract

Defined in `src/types/game.ts`. A game registers a `GameModule` composed of:

- **`meta: GameMetadata`** — display info + honest `status`
  (`planned | prototype | playable`).
- **`engine: GameEngine`** — pure logic: `init`, `applyMove`, `isTerminal`,
  `getResult`. No React, no I/O, fully unit-testable.
- **`generator?: LevelGenerator`** — deterministic `generate(seed)` producing a
  `GameLevel` tagged with `generatorVersion`, `seed` and `contentHash`.
- **`validator?: LevelValidator`** — `validateStructure` (first pass) and an
  **independent** `verifySolution` (second pass), plus `contentHash` for
  deduplication.

Levels carry reproducibility metadata so a daily challenge can be regenerated
and verified, and so updating a generator never mutates past challenges.

## Layered design

```
UI (React)  ─────────────►  depends on engine + platform services
Engine      ─────────────►  pure, no UI, no network
Generator   ─────────────►  pure, deterministic from seed
Validator   ─────────────►  independent of the generator's internals
Services    ─────────────►  persistence (local | Supabase), auth, stats
```

Shared components (`src/components`) must never contain game-specific rules.

## Directory layout (current + planned)

```
src/
  app/          router, providers, layouts        [in place]
  components/   ui, navigation, shared             [navigation + shared in place]
  games/        registry + per-game modules        [registry in place]
  features/     home, games, auth, daily, archive, stats, history, settings
                                                   [home + games in place]
  services/     database (local + supabase), api   [planned]
  lib/          utils, theme                        [in place]
  types/        game contracts                      [in place]
  test/         vitest setup                        [in place]
supabase/       migrations, functions, tests        [planned]
scripts/        generation, validation, maintenance [planned]
```

## Persistence strategy

A `PersistenceAdapter` interface with two implementations:

1. **Local adapter** (localStorage) — lets the UI work with no backend.
2. **Supabase adapter** — Postgres + RLS + server-side checks for integrity.

The app selects the Supabase adapter when `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` are present, else the local one. Daily-challenge
**integrity** (one official result per user/game/day, concurrency-safe) is only
guaranteed by the Supabase adapter with DB constraints; the local adapter is
for single-device development and is documented as such.

## Open architectural questions

Tracked in `docs/risks-and-unknowns.md` and `docs/decisions.md`.
