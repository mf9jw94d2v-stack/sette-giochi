# Level Generation Strategy

_Last updated: 2026-10-27 — **PLAN, not yet implemented.**_

## Goals

- Many valid, varied, non-duplicate levels per game (target: hundreds–thousands
  **where the mechanics and data allow**). Quality and correctness over count.
- Deterministic, reproducible, versioned generators, separate from engines.

## Per-game generator

Each game provides a `LevelGenerator` (`src/types/game.ts`): `generate(seed)`
returns a `GameLevel` tagged with `generatorVersion`, `seed` and `contentHash`.
Generators are pure and seed-driven so any level can be reproduced.

## Two-pass, independent validation

1. **Structure/rules (first pass)** — format, required fields, constraints,
   allowed values, rule coherence.
2. **Solution/correctness (second pass)** — an **independent** check, not a
   re-call of the generator's own logic. Where correctness is provable by a
   distinct algorithm, use it; otherwise record a confidence level
   (`verified | heuristic | unverified`) and document limits.

Pipeline: generate → validate structure → validate data → check rules → verify
solution → estimate difficulty → dedup → variety check → independent test →
**publish or quarantine** (with a recorded reason).

## Deduplication

Beyond ids: exact, normalized, structurally-identical, and (where meaningful)
semantically-similar duplicates. Criteria are per-game. `content_hash` +
unique DB constraint back this.

## Difficulty

Per-game and coherent with that game's mechanics (not one global scale).
Reported as an estimate/heuristic unless it can be grounded in data.

## Reporting

Generated / validated / published / rejected / quarantined / duplicate counts,
validity %, difficulty distribution, generation time, generator version,
validation errors — all from real runs, surfaced in the Game Quality Lab.
Research references to evaluate (not adopt by default): PCG benchmark,
WaveFunctionCollapse — only if genuinely suited to a game's problem.
