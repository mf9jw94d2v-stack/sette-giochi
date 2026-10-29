import { describe, expect, it } from "vitest";
import { magnitudeWords, ratioWords, rulerT } from "./numbers";

describe("magnitudeWords", () => {
  it("says big numbers in words", () => {
    expect(magnitudeWords(820)).toBe("820");
    expect(magnitudeWords(35000)).toBe("35 mila");
    expect(magnitudeWords(1_200_000)).toBe("1,2 milioni");
    expect(magnitudeWords(1_000_000)).toBe("1 milione");
    expect(magnitudeWords(7_800_000_000)).toBe("7,8 miliardi");
  });
});

describe("ruler", () => {
  it("is monotonic and clamped", () => {
    expect(rulerT(0)).toBe(0);
    expect(rulerT(1e20)).toBe(1);
    expect(rulerT(100)).toBeLessThan(rulerT(1000));
  });
});

describe("ratioWords", () => {
  it("names the direction and size of the miss", () => {
    expect(ratioWords(200, 100)).toBe("2× troppo alta");
    expect(ratioWords(25, 100)).toBe("4× troppo bassa");
    expect(ratioWords(101, 100)).toBe("praticamente esatta");
  });
});
