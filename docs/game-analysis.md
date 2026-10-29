# Game Analysis

_Last updated: 2026-10-27_

> **Honesty note.** Findings below are **verified from each game's live landing
> page and "how to play" copy on 2026-10-27**, not from full recorded
> playthroughs. Confidence is labelled accordingly. Mechanics not yet confirmed
> are marked PENDING and are **not** guessed. We build **original**
> implementations of verifiable mechanics; we do not copy proprietary art,
> text, datasets, or circumvent access controls.

## Legal / sourcing stance

- Original implementations of the _mechanics_ only.
- No proprietary art/text/data; no scraping behind auth/paywalls.
- Where a game needs a proprietary dataset we can't reproduce, substitute
  original/open data and document the difference, or mark the game limited.

## Status per game

| Game       | URL             | Mechanic                               | Data dependency                         | Confidence   |
| ---------- | --------------- | -------------------------------------- | --------------------------------------- | ------------ |
| Krillion   | krillion.cc     | Rare-answer trivia                     | **Crowd/aggregate** (hard to reproduce) | landing page |
| Plain      | playplain.app   | "Get as close as you can" guessing     | Curated prompts                         | landing page |
| Fact Map   | factmap.world   | Pin-on-map, distance scoring           | Map + places dataset                    | landing page |
| Estimania  | estimania.app   | Numeric estimation                     | Curated Q&A                             | landing page |
| Size It Up | magnitudle.com  | Estimate real-world magnitudes         | Curated facts                           | landing page |
| GeoSlice   | geoslice.net    | Split a population map                 | **Heavy geo-raster** (hardest)          | landing page |
| Gazillion  | gazillion.world | Guess an event's year, trap in a range | Dated events (open/factual)             | landing page |

## Krillion — rare-answer trivia

7 open prompts/day ("Name a bird"), 25s each, one answer per prompt. Score is a
"depth": the **rarer** your (correct) answer vs. other players, the deeper you
sink, across six tiers (Plankton 10pts … One in a Krillion 100pts). Rarity is
**measured from how many players gave each answer** — inherently crowd-sourced.
Daily (shared 7 prompts), Unlimited, Archive; themed packs (Geography, Sports,
Movies, Animals, Food).

- **Reproducibility:** LOW for the authentic experience — the core signal is
  aggregate player data we don't have. Could approximate with a pre-authored
  rarity table per answer, but that's a large content effort and not "measured".
- **Verification:** a known correct-answer set per prompt; rarity would be
  heuristic.
- **Decision:** defer; not a good early game.

## Plain — daily "get as close as you can"

7 targets/day (~3 min). "Name the closest thing you know"; good answers climb a
"plane" toward a distance goal (e.g. reach 5,000 m). A proximity/estimation
game over curated prompts.

- **Reproducibility:** MEDIUM — needs a curated prompt set with a scoring
  notion of "closeness". Original prompts feasible.

## Fact Map — pin on the world map

"Where in the world? Place your pin." Rounds where you drop a pin on a map;
scored by distance to the true location.

- **Reproducibility:** MEDIUM — needs a map component + a places dataset
  (open data exists, e.g. city coordinates). Map UI is the main cost.

## Estimania — numeric estimation

Daily estimation puzzle, "how close can you guess?" — questions with a numeric
answer; score by proximity.

- **Reproducibility:** MEDIUM-HIGH — original Q&A with numeric answers; closeness
  scoring. Similar shape to Gazillion but free-form numeric.

## Size It Up (Magnitudle) — estimate magnitudes

Match/estimate **real-world magnitudes** (sizes, weights). Modes: Size It Up
(match real-world values), a weekly themed 10-round mode, a weight-balancing
mode, and one-question/one-guess modes. Overall streak + personal best.

- **Reproducibility:** MEDIUM-HIGH — curated facts with magnitudes; closeness
  scoring. (Site uses an ad/consent SDK; irrelevant to our build.)

## GeoSlice — split the population

Drag line(s) to split a region's **population** into equal halves/thirds/
quarters using real population data; also "draw a circle around N people",
"how many live in this shape", themed weekly, and premium region/country modes.
New puzzle at local midnight.

- **Reproducibility:** LOW-MEDIUM and **expensive** — requires gridded
  population data and a non-trivial interactive map. Hardest of the seven.
  Defer; if attempted, use open gridded population data and document limits.

## Gazillion — the daily time trip ✅ CHOSEN FIRST

5 historical "moments"/day (e.g. "The first iPhone goes on sale"). You **trap
the true year between two handles** (a range); a **tighter trap scores more**.
Flavor: points send a time-travelling dinosaur further back in history. Modes:
Daily 5 (one try/day), Infinite (3 lives), Practice. 30-sec how-to.

- **Mechanic (our model):** each level = `{ prompt, year }`. Player submits a
  range `[low, high]`. If `year ∈ [low, high]`, score rewards tightness
  (narrower → more, exponential falloff); otherwise 0 (a life lost in Infinite).
- **Data:** an **original** dataset of well-known historical events with their
  (factual, open-knowledge) years. Independently verifiable: the year is a fact;
  structural + plausibility checks don't reuse the generator's logic.
- **Reproducibility:** HIGH, self-contained — no crowd data, no map, no
  proprietary content. Best first vertical slice to exercise engine + seeded
  generator + two-pass validator + scoring + difficulty + dedup + tests.
- **Verified scoring (REA, from the public client on 2026-10-27).** Config:
  `ROUNDS=5`, `SECONDS=40`, `LIVES=3` (Infinite), epoch #1 = 2026-10-23, min
  handle span 8 years, max 1000 pts/round (5000 total). Axis is "years ago"
  with astronomical year numbering. Score (reimplemented originally in
  `engine.ts`, math only — no code/data copied):
  - `tolerance(age) = (3 + age·(0.08+0.22·sm))·(1 − age/(1.3·13.8e9))`, where
    `sm` is a smoothstep of `clamp((log10(age)−3)/2)` — older events get a wider
    fair window.
  - `narrowOf(w,T) = 1/(1 + (w/(10·T))^1.3)`.
  - Trapped: `max(1, round(1000·narrowOf(width,T)))`.
  - Miss: `round(1000·0.5·narrowOf(width+missBy,T)·exp(−missBy/(3·T)))` — partial
    credit that fades with distance (a one-year miss is never a flat zero).
    Our event dataset is original/open-knowledge, not theirs.
