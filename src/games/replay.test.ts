import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type {
  GameEngine,
  GameId,
  GameLevel,
  LevelGenerator,
} from "@/types/game";
import {
  answersFor,
  GAME_LIMITS,
  generatorVersion,
  replayDaily,
} from "./replay";
import { estimaniaEngine } from "./estimania/engine";
import { estimaniaGenerator } from "./estimania/generator";
import { factEngine } from "./fact-map/engine";
import { factGenerator } from "./fact-map/generator";
import { gazillionEngine } from "./gazillion/engine";
import { gazillionGenerator } from "./gazillion/generator";
import { geoEngine } from "./geoslice/engine";
import { geoGenerator } from "./geoslice/generator";
import { krillionEngine, type KrillionSessionData } from "./krillion/engine";
import { krillionGenerator } from "./krillion/generator";
import { plainEngine } from "./plain/engine";
import { plainGenerator } from "./plain/generator";
import { sizeEngine } from "./size-it-up/engine";
import { sizeGenerator } from "./size-it-up/generator";

/**
 * The property that makes server-side verification sound: whatever a player
 * does on the board, replaying their answers from the date alone gives the
 * very same result the board computed.
 */

const date = fc
  .integer({ min: 0, max: 2000 })
  .map((n) =>
    new Date(Date.UTC(2025, 0, 1) + n * 86_400_000).toISOString().slice(0, 10),
  );

/** A per-round choice in [0,1) plus whether to pass, turned into a move. */
const choices = fc.array(
  fc.record({
    pass: fc.boolean(),
    a: fc.double({ min: 0, max: 1, noNaN: true }),
    b: fc.double({ min: 0, max: 1, noNaN: true }),
    hint: fc.boolean(),
  }),
  { minLength: 10, maxLength: 10 },
);
type Choice = { pass: boolean; a: number; b: number; hint: boolean };

function play<L, S, M>(
  gen: LevelGenerator<L>,
  engine: GameEngine<L, S, M>,
  seed: string,
  cs: Choice[],
  move: (c: Choice, level: GameLevel<L>, i: number) => M,
): S {
  const level = gen.generate(seed);
  let s = engine.init(level);
  let i = 0;
  while (!engine.isTerminal(s)) {
    s = engine.applyMove(s, move(cs[i % cs.length], level, i));
    i++;
  }
  return s;
}

const logNumber = (u: number) => 10 ** (u * 12 - 3); // 0.001 … 1e9

const boards: Record<GameId, (seed: string, cs: Choice[]) => unknown> = {
  estimania: (seed, cs) =>
    play(estimaniaGenerator, estimaniaEngine, seed, cs, (c) =>
      c.pass
        ? { type: "pass" as const }
        : { type: "submit" as const, value: logNumber(c.a) },
    ),
  plain: (seed, cs) =>
    play(plainGenerator, plainEngine, seed, cs, (c) =>
      c.pass
        ? { type: "pass" as const }
        : { type: "submit" as const, value: logNumber(c.a) },
    ),
  "size-it-up": (seed, cs) =>
    play(sizeGenerator, sizeEngine, seed, cs, (c) =>
      c.pass
        ? { type: "pass" as const }
        : { type: "submit" as const, value: logNumber(c.a) },
    ),
  "fact-map": (seed, cs) =>
    play(factGenerator, factEngine, seed, cs, (c) =>
      c.pass
        ? { type: "pass" as const }
        : {
            type: "submit" as const,
            lat: c.a * 180 - 90,
            lon: c.b * 360 - 180,
            hintUsed: c.hint,
          },
    ),
  geoslice: (seed, cs) =>
    play(geoGenerator, geoEngine, seed, cs, (c) =>
      c.pass
        ? { type: "pass" as const }
        : { type: "submit" as const, theta: c.a * 180, pos: c.b * 100 },
    ),
  gazillion: (seed, cs) =>
    play(gazillionGenerator, gazillionEngine, seed, cs, (c) => {
      if (c.pass) return { type: "pass" as const };
      const low = Math.round(-3000 + c.a * 5000);
      return {
        type: "submit" as const,
        low,
        high: low + 8 + Math.round(c.b * 400),
      };
    }),
  krillion: (seed, cs) =>
    play(
      krillionGenerator,
      krillionEngine,
      seed,
      cs,
      (c, level: GameLevel<KrillionSessionData>, i) => {
        const answers = level.data.rounds[i].answers;
        if (c.pass || answers.length === 0) return { type: "pass" as const };
        const a =
          answers[
            Math.min(answers.length - 1, Math.floor(c.a * answers.length))
          ];
        return { type: "accept" as const, answer: a.label, tier: a.tier };
      },
    ),
};

const engines: Record<GameId, GameEngine<unknown, unknown, unknown>> = {
  estimania: estimaniaEngine as never,
  plain: plainEngine as never,
  "size-it-up": sizeEngine as never,
  "fact-map": factEngine as never,
  geoslice: geoEngine as never,
  gazillion: gazillionEngine as never,
  krillion: krillionEngine as never,
};

describe("replayDaily", () => {
  for (const gameId of Object.keys(boards) as GameId[]) {
    it(`${gameId}: replaying the answers gives the board's own result`, () => {
      fc.assert(
        fc.property(date, choices, (seed, cs) => {
          const state = boards[gameId](seed, cs);
          const expected = engines[gameId].getResult(state);
          const out = replayDaily(
            gameId,
            seed,
            JSON.parse(JSON.stringify(answersFor(gameId, state))),
          );
          expect(out.ok).toBe(true);
          if (!out.ok) return;
          expect(out.result.score).toBe(expected.score);
          expect(out.result.won).toBe(expected.won);
          expect(out.result.detail).toEqual(expected.detail);
          expect(out.result.score).toBeLessThanOrEqual(
            GAME_LIMITS[gameId].maxScore,
          );
          expect(out.rounds).toBe(GAME_LIMITS[gameId].rounds);
          expect(out.generatorVersion).toBe(generatorVersion(gameId));
        }),
        { numRuns: 60 },
      );
    });
  }

  it("refuses unknown games, bad dates and non-arrays", () => {
    expect(replayDaily("tetris", "2026-10-29", [])).toEqual({
      ok: false,
      reason: "unknown_game",
    });
    expect(replayDaily("plain", "2026-02-30", [])).toEqual({
      ok: false,
      reason: "invalid_date",
    });
    expect(replayDaily("plain", "29/10/2026", [])).toEqual({
      ok: false,
      reason: "invalid_date",
    });
    expect(replayDaily("plain", "2026-10-29", { 0: 1 })).toEqual({
      ok: false,
      reason: "invalid_answers",
    });
  });

  it("refuses a session with too few or too many rounds", () => {
    expect(replayDaily("plain", "2026-10-29", [1, 2, 3])).toEqual({
      ok: false,
      reason: "wrong_round_count",
    });
    expect(
      replayDaily("geoslice", "2026-10-29", [null, null, null, null]),
    ).toEqual({ ok: false, reason: "wrong_round_count" });
  });

  it("refuses malformed answers instead of scoring them", () => {
    expect(
      replayDaily("estimania", "2026-10-29", ["100", null, null, null, null]),
    ).toEqual({ ok: false, reason: "invalid_answers" });
    expect(
      replayDaily("fact-map", "2026-10-29", [
        { lat: 1, lon: 2 },
        null,
        null,
        null,
        null,
      ]),
    ).toEqual({ ok: false, reason: "invalid_answers" });
    expect(
      replayDaily("gazillion", "2026-10-29", [
        { low: 1 },
        null,
        null,
        null,
        null,
      ]),
    ).toEqual({ ok: false, reason: "invalid_answers" });
  });

  it("Krillion: the rarity comes from the level, never from the client", () => {
    const level = krillionGenerator.generate("2026-10-29");
    const common = level.data.rounds.map((r) => {
      const sorted = [...r.answers].sort((x, y) =>
        x.tier === "plankton" ? -1 : y.tier === "plankton" ? 1 : 0,
      );
      return sorted[0].label;
    });
    const out = replayDaily("krillion", "2026-10-29", common);
    expect(out.ok).toBe(true);
    // An answer that is not in the level cannot be scored at all.
    const forged = [...common];
    forged[0] = "risposta inventata che non esiste";
    expect(replayDaily("krillion", "2026-10-29", forged)).toEqual({
      ok: false,
      reason: "invalid_answers",
    });
  });

  it("an all-pass session is valid and scores zero", () => {
    for (const gameId of Object.keys(GAME_LIMITS) as GameId[]) {
      const out = replayDaily(
        gameId,
        "2026-10-29",
        Array(GAME_LIMITS[gameId].rounds).fill(null),
      );
      expect(out).toMatchObject({
        ok: true,
        result: { score: 0, completed: true },
      });
    }
  });
});
