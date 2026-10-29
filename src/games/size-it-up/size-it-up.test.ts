import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  MAX_POINTS_PER_ROUND,
  ROUNDS_PER_SESSION,
  scoreGuess,
  sizeEngine,
  TOLERANCE,
  verdictOf,
} from "./engine";
import {
  basePxPerMetre,
  clampRatio,
  clampZoom,
  drawObject,
  formatFactor,
  formatMetres,
  MAX_RATIO,
  metresToRatio,
  MIN_RATIO,
  ratioToMetres,
  ratioToSlider,
  sliderToRatio,
  stepRatio,
  trueRatio,
  zoomToFit,
} from "./geometry";
import {
  buildLevel,
  buildRounds,
  MAX_PAIR_RATIO,
  MIN_PAIR_RATIO,
  START_LADDER,
} from "./generator";
import { sizeValidator, validateObject, verifyRound } from "./validator";
import { SIZE_OBJECTS } from "./data/objects";
import { getSilhouette, SILHOUETTES, silhouetteBox } from "./silhouettes";
import { axisWithArticle } from "./types";
import type { SizeObject } from "./types";

const byId = (id: string): SizeObject => SIZE_OBJECTS.find((o) => o.id === id)!;

describe("scoring — the three points verified on the original", () => {
  it("gives full marks inside the 6% band, both directions", () => {
    expect(scoreGuess(1, 1).points).toBe(100);
    expect(scoreGuess(1, 1.06).points).toBe(100);
    expect(scoreGuess(1, 0.94).points).toBe(100);
  });

  it("gives 50 at the observed 36% round (guess 2.74 m, actual 4.3 m)", () => {
    expect(scoreGuess(4.3, 2.74).points).toBe(50);
  });

  it("gives 0 at the observed 1102% round (guess 68.5 cm, actual 5.7 cm)", () => {
    const s = scoreGuess(0.057, 0.685);
    expect(s.points).toBe(0);
    expect(Math.round(s.relErr * 100)).toBe(1102);
  });

  it("treats the same mistake in both directions alike", () => {
    for (const factor of [1.5, 2, 3, 10]) {
      expect(scoreGuess(1, factor).points).toBe(
        scoreGuess(1, 1 / factor).points,
      );
    }
  });

  it("never returns NaN, Infinity or a negative score", () => {
    for (const [t, g] of [
      [0, 1],
      [1, 0],
      [-5, 2],
      [2, -5],
      [Number.NaN, 1],
      [1, Number.NaN],
      [Infinity, 1],
      [1, Infinity],
    ]) {
      const s = scoreGuess(t, g);
      expect(s.points).toBe(0);
      expect(Number.isFinite(s.points)).toBe(true);
    }
  });

  it("stays within 0..100 for any pair of positive sizes", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, max: 1e6, noNaN: true }),
        fc.double({ min: 0.001, max: 1e6, noNaN: true }),
        (t, g) => {
          const { points } = scoreGuess(t, g);
          expect(Number.isInteger(points)).toBe(true);
          expect(points).toBeGreaterThanOrEqual(0);
          expect(points).toBeLessThanOrEqual(MAX_POINTS_PER_ROUND);
          return true;
        },
      ),
      { numRuns: 300 },
    );
  });

  it("decays: a worse guess never scores more", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 1000, noNaN: true }),
        fc.double({ min: 1.01, max: 50, noNaN: true }),
        fc.double({ min: 1.01, max: 50, noNaN: true }),
        (truth, a, b) => {
          const near = Math.min(a, b);
          const far = Math.max(a, b);
          expect(scoreGuess(truth, truth * far).points).toBeLessThanOrEqual(
            scoreGuess(truth, truth * near).points,
          );
          return true;
        },
      ),
      { numRuns: 200 },
    );
  });

  it("labels the outcome", () => {
    expect(verdictOf(scoreGuess(1, 1))).toBe("perfetta");
    expect(verdictOf(scoreGuess(4.3, 2.74))).toBe("vicina");
    expect(verdictOf(scoreGuess(0.057, 0.685))).toBe("lontana");
  });
});

describe("geometry — estimate, display and zoom stay apart", () => {
  it("converts between ratio and metres reversibly", () => {
    const ref = byId("persona");
    expect(ratioToMetres(2, ref)).toBeCloseTo(3.4, 10);
    expect(metresToRatio(3.4, ref)).toBeCloseTo(2, 10);
  });

  it("maps the slider to a ratio and back exactly", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1, noNaN: true }), (t) => {
        expect(ratioToSlider(sliderToRatio(t))).toBeCloseTo(t, 9);
        return true;
      }),
      { numRuns: 200 },
    );
  });

  it("keeps the slider inside its bounds", () => {
    expect(sliderToRatio(-5)).toBeCloseTo(MIN_RATIO, 9);
    expect(sliderToRatio(99)).toBeCloseTo(MAX_RATIO, 9);
    expect(clampRatio(0)).toBe(1);
    expect(clampRatio(Number.NaN)).toBe(1);
  });

  it("steps by a constant amount in log space, not in metres", () => {
    const up = stepRatio(1, 1);
    const upHigh = stepRatio(100, 1);
    expect(up / 1).toBeCloseTo(upHigh / 100, 6);
    expect(stepRatio(1, 1, true)).toBeLessThan(stepRatio(1, 1));
    expect(stepRatio(MAX_RATIO, 1)).toBeCloseTo(MAX_RATIO, 6);
  });

  it("keeps a silhouette's aspect ratio whatever its measured size", () => {
    for (const [id, s] of Object.entries(SILHOUETTES)) {
      const small = silhouetteBox(s, 10);
      const big = silhouetteBox(s, 1000);
      expect(small.width / small.height, id).toBeCloseTo(
        big.width / big.height,
        9,
      );
      expect(s.measure === "h" ? big.height : big.width, id).toBeCloseTo(
        1000,
        9,
      );
      // The box is measured from the drawing, so it must be real and positive.
      expect(s.box.w, id).toBeGreaterThan(0);
      expect(s.box.h, id).toBeGreaterThan(0);
    }
  });

  it("draws an object at exactly its metres × pxPerMetre along its own axis", () => {
    const car = byId("automobile");
    const drawn = drawObject(car, car.sizeM, 20);
    expect(drawn.measurePx).toBeCloseTo(4.35 * 20, 9);
    expect(drawn.width).toBeCloseTo(drawn.measurePx, 9); // measured on width
  });

  it("sizes the scene from the reference alone, never from the guess", () => {
    const ref = byId("persona");
    const stage = { width: 800, height: 400 };
    const a = basePxPerMetre(ref, stage);
    const b = basePxPerMetre(ref, stage);
    expect(a).toBe(b);
    // A different guess cannot enter this calculation at all.
    expect(basePxPerMetre(ref, stage)).toBeCloseTo(a, 12);
  });

  it("fits both objects inside the stage when asked", () => {
    const ref = byId("persona");
    const target = byId("burj");
    const stage = { width: 900, height: 420 };
    const px = basePxPerMetre(ref, stage);
    const zoom = zoomToFit(ref, target, target.sizeM, stage, px);
    const refBox = drawObject(ref, ref.sizeM, px * zoom);
    const tgtBox = drawObject(target, target.sizeM, px * zoom);
    expect(Math.max(refBox.height, tgtBox.height)).toBeLessThanOrEqual(
      stage.height,
    );
    expect(refBox.width + tgtBox.width).toBeLessThanOrEqual(stage.width);
  });

  it("clamps the zoom", () => {
    expect(clampZoom(0)).toBe(1);
    expect(clampZoom(Number.NaN)).toBe(1);
    expect(clampZoom(1e9)).toBeLessThanOrEqual(40);
  });

  it("formats sizes the way a person would say them", () => {
    expect(formatMetres(0.057)).toBe("5,7 cm");
    expect(formatMetres(1.7)).toBe("1,7 m");
    expect(formatMetres(828)).toBe("828 m");
    expect(formatMetres(1200)).toBe("1,2 km");
    expect(formatMetres(0)).toBe("—");
    expect(formatFactor(3)).toContain("più grande");
    expect(formatFactor(1 / 3)).toContain("più piccolo");
    // Near 1 a factor reads as nonsense ("1× più piccolo"), so it says so.
    expect(formatFactor(0.99)).toBe("praticamente uguale");
    expect(formatFactor(1.01)).toBe("praticamente uguale");
  });
});

describe("wording", () => {
  it("elides the article before a vowel, as Italian requires", () => {
    expect(axisWithArticle("altezza")).toBe("l'altezza");
    expect(axisWithArticle("apertura alare")).toBe("l'apertura alare");
    expect(axisWithArticle("lunghezza")).toBe("la lunghezza");
  });
});

describe("catalogue", () => {
  it("has unique ids and passes structural validation", () => {
    const ids = SIZE_OBJECTS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const o of SIZE_OBJECTS) {
      const res = validateObject(o);
      expect(res.ok, `${o.id}: ${res.reasons.join("; ")}`).toBe(true);
    }
  });

  it("states a source for every measurement", () => {
    for (const o of SIZE_OBJECTS) {
      expect(o.source.length, o.id).toBeGreaterThan(4);
      if (o.sourceUrl) expect(o.sourceUrl).toMatch(/^https:\/\//);
    }
  });

  it("every silhouette it names actually exists and is normalised", () => {
    for (const o of SIZE_OBJECTS) {
      const s = getSilhouette(o.silhouette);
      expect(s, o.id).toBeDefined();
      // Not a length threshold: a pyramid is honestly three lines.
      expect(s!.d, o.id).toMatch(/^M/);
      expect(s!.d, o.id).toContain("Z");
    }
  });

  it("never writes a circle as a single near-zero-length arc", () => {
    // `a43 43 0 1 0 0.01 0` reads as a circle but SVG places its centre so the
    // shape bulges far outside the viewBox — it put a ferris wheel through the
    // top of the stage. Circles are written as two half-arcs instead.
    for (const [id, s] of Object.entries(SILHOUETTES)) {
      expect(s.d, `${id}: degenerate arc`).not.toMatch(
        /a[\d.]+ [\d.]+ 0 1 [01] -?0?\.0\d+ 0/,
      );
    }
  });

  it("spans a wide range of real sizes", () => {
    const sizes = SIZE_OBJECTS.map((o) => o.sizeM);
    expect(Math.min(...sizes)).toBeLessThan(0.5);
    expect(Math.max(...sizes)).toBeGreaterThan(500);
  });
});

describe("generator", () => {
  it("is deterministic", () => {
    const a = buildLevel("2026-10-28");
    const b = buildLevel("2026-10-28");
    expect(a.contentHash).toBe(b.contentHash);
    expect(a.data.rounds.map((r) => r.target.id)).toEqual(
      b.data.rounds.map((r) => r.target.id),
    );
  });

  it("builds five rounds with no object used twice", () => {
    const rounds = buildRounds("seed-1");
    expect(rounds).toHaveLength(ROUNDS_PER_SESSION);
    const ids = rounds.flatMap((r) => [r.reference.id, r.target.id]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only pairs objects inside the playable band", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 20 }), (seed) => {
        for (const r of buildRounds(seed)) {
          const ratio = trueRatio(r.reference, r.target);
          expect(ratio).toBeGreaterThanOrEqual(MIN_PAIR_RATIO);
          expect(ratio).toBeLessThanOrEqual(MAX_PAIR_RATIO);
        }
        return true;
      }),
      { numRuns: 60 },
    );
  });

  it("never opens a round on its own answer", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 20 }), (seed) => {
        for (const r of buildRounds(seed)) {
          expect(verifyRound(r).ok).toBe(true);
          expect(START_LADDER).toContain(r.startBias);
        }
        return true;
      }),
      { numRuns: 60 },
    );
  });

  it("passes both validation passes for arbitrary seeds", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 24 }), (seed) => {
        const level = buildLevel(seed);
        expect(sizeValidator.validateStructure(level).ok).toBe(true);
        expect(sizeValidator.verifySolution(level).ok).toBe(true);
        return true;
      }),
      { numRuns: 60 },
    );
  });
});

describe("engine — a round is answered once and only once", () => {
  const level = buildLevel("2026-10-28");

  it("starts unanswered", () => {
    const s = sizeEngine.init(level);
    expect(s.current).toBe(0);
    expect(s.finished).toBe(false);
    expect(s.rounds.every((r) => r.guess === null)).toBe(true);
  });

  it("scores a submit against the target's real size", () => {
    const s0 = sizeEngine.init(level);
    const truth = s0.rounds[0].data.target.sizeM;
    const s1 = sizeEngine.applyMove(s0, { type: "submit", value: truth });
    expect(s1.rounds[0].points).toBe(100);
    expect(s1.rounds[0].relErr).toBeLessThanOrEqual(TOLERANCE);
    expect(s1.current).toBe(1);
  });

  it("ignores a second submit for a round already answered", () => {
    const s0 = sizeEngine.init(level);
    const truth = s0.rounds[0].data.target.sizeM;
    const s1 = sizeEngine.applyMove(s0, { type: "submit", value: truth });
    // Rewind the cursor as a double-click would, and submit a perfect answer.
    const replay = { ...s1, current: 0, finished: false };
    const s2 = sizeEngine.applyMove(replay, {
      type: "submit",
      value: truth * 10,
    });
    expect(s2).toBe(replay);
    expect(s2.rounds[0].points).toBe(100);
  });

  it("totals the rounds and finishes after the last one", () => {
    let s = sizeEngine.init(level);
    for (let i = 0; i < ROUNDS_PER_SESSION; i++) {
      s = sizeEngine.applyMove(s, {
        type: "submit",
        value: s.rounds[i].data.target.sizeM,
      });
    }
    expect(s.finished).toBe(true);
    const result = sizeEngine.getResult(s);
    expect(result.score).toBe(ROUNDS_PER_SESSION * MAX_POINTS_PER_ROUND);
    expect(result.won).toBe(true);
    expect(result.detail?.bullseye).toBe(ROUNDS_PER_SESSION);
  });

  it("does not move on once finished", () => {
    let s = sizeEngine.init(level);
    for (let i = 0; i < ROUNDS_PER_SESSION; i++) {
      s = sizeEngine.applyMove(s, { type: "submit", value: 1 });
    }
    expect(sizeEngine.applyMove(s, { type: "submit", value: 1 })).toBe(s);
  });
});
