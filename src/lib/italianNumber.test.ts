import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { parseItalianNumber } from "./italianNumber";

describe("parseItalianNumber", () => {
  it.each([
    ["1.200", 1200],
    ["1.200.000", 1200000],
    ["12.345", 12345],
    ["1,5", 1.5],
    ["1.234,5", 1234.5],
    ["2 000", 2000],
    ["206", 206],
    ["3.5", 3.5],
    ["0,25", 0.25],
    ["-44", -44],
    ["-1.200", -1200],
  ])("reads %s as %d", (raw, n) => {
    expect(parseItalianNumber(raw)).toBe(n);
  });

  it.each(["", "abc", "1,2,3", "1,234.5", "--1", "1..2"])(
    "rejects %s",
    (raw) => {
      expect(parseItalianNumber(raw)).toBeNull();
    },
  );

  it("reads back what Italian formatting writes", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1e12 }), (n) => {
        expect(parseItalianNumber(n.toLocaleString("it-IT"))).toBe(n);
        return true;
      }),
      { numRuns: 300 },
    );
  });
});
