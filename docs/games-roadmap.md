# Games Roadmap — internal experiences

_Last updated: 2026-10-28 (Size It Up rebuilt)._ Goal: every game is a **real, playable**, animated,
tested experience with its own identity — not a mockup. Order goes data-light →
data-heavy. A game is "done" only when engine + generator + validator + tests +
polished animated UI are built and browser-verified (desktop + mobile).

| #   | Game           | Mechanic model (original impl.)                                                              | Data approach                                                  | Status                         |
| --- | -------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------ |
| 1   | **Gazillion**  | Trap the year in a range; tighter = more                                                     | Authored dated events (IT)                                     | ✅ done                        |
| 2   | **Estimania**  | Numeric estimation; **verified formula** `100·(1−                                            | log10(g/a)                                                     | )`, Teal                       | Authored numeric-answer Q&A (IT) | ✅ done (educational notes pending) |
| 3   | **Size It Up** | Scale-match: resize target to its real size vs a reference; **6% tol.**, 500 pts             | Authored objects with lengths (m) + shapes (IT)                | ✅ done (stylised silhouettes) |
| 4   | **Plain**      | Proximity guess; altitude climb to 5000 m, %under/over, dark/lime + Geist                    | Authored measurement Q&A (IT)                                  | ✅ done                        |
| 5   | **Krillion**   | Rare-answer trivia; rarity **pre-authored**; VT323, depth 7000 m, 25s timer                  | Authored prompts + tiered answers (IT)                         | ✅ done                        |
| 6   | **Fact Map**   | Pin on a **real** world map (Natural Earth SVG); haversine distance scoring, hint −250       | Bundled Natural Earth geometry + authored places (real coords) | ✅ done                        |
| 7   | **GeoSlice**   | Split a region's population ~50/50 with a rotatable/translatable line (simplified, original) | Authored regions + city weights (stylised)                     | ✅ done                        |

## Shared vs per-game

Shared (no personality lock-in): the archive replay route (any past day is
reproducible because every level is generated from its date as seed),
sound (`lib/sound.ts`), animated `CountUp`,
animation keyframes in `index.css`, the daily/practice persistence + idempotency
pattern, theme tokens. Each game owns its **layout, reveal visualisation and
animation language** (distinct per game).

## Level supply (measured, not estimated)

`npm run quality:report` replays the real daily seeds through each generator.
Over 365 days: **2486 distinct, validated levels** out of 2555 seeds. The
ceiling is combinatorial, so it is worth knowing where each game sits:
Krillion picks 7 prompts from 24, GeoSlice 3 regions from 20 — which is why
GeoSlice is the only game under 100 % validity (81.4 %: over two years the
same triples come round again). The numbers live in `docs/quality-report.md`
and are regenerated, never typed.

## Honesty

Where a mechanic can't be reproduced faithfully (Krillion's crowd rarity,
GeoSlice's gridded population), we build an original simplified version and
document the difference in `docs/game-analysis.md`. We never fake data or claim
a game is done when only its UI exists.
