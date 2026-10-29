import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { ROUNDS_PER_SESSION } from "./engine";
import { gazillionGenerator, pickEvents, buildLevel } from "./generator";
import { gazillionValidator } from "./validator";

describe("gazillionGenerator", () => {
  it("is deterministic: same seed → same content", () => {
    const a = gazillionGenerator.generate("2026-10-27");
    const b = gazillionGenerator.generate("2026-10-27");
    expect(a.contentHash).toBe(b.contentHash);
    expect(a.data.rounds.map((r) => r.prompt)).toEqual(
      b.data.rounds.map((r) => r.prompt),
    );
  });

  it("produces the right number of distinct rounds", () => {
    const lvl = gazillionGenerator.generate("seed-x");
    expect(lvl.data.rounds).toHaveLength(ROUNDS_PER_SESSION);
    const prompts = lvl.data.rounds.map((r) => r.prompt);
    expect(new Set(prompts).size).toBe(prompts.length);
  });

  it("different seeds generally differ", () => {
    const hashes = new Set(
      ["a", "b", "c", "d", "e"].map(
        (s) => gazillionGenerator.generate(s).contentHash,
      ),
    );
    expect(hashes.size).toBeGreaterThan(1);
  });

  it("pickEvents rejects asking for more than the pool holds", () => {
    expect(() => pickEvents("s", 99999)).toThrow();
  });

  // Property: any generated level passes both validation passes with distinct
  // rounds. "A level the validator approves satisfies its declared constraints."
  it("every generated level is valid (property-based)", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 24 }), (seed) => {
        const lvl = buildLevel(seed, pickEvents(seed));
        expect(gazillionValidator.validateStructure(lvl).ok).toBe(true);
        expect(gazillionValidator.verifySolution(lvl).ok).toBe(true);
        expect(lvl.data.rounds).toHaveLength(ROUNDS_PER_SESSION);
      }),
      { numRuns: 200 },
    );
  });
});
