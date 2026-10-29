import { describe, expect, it } from "vitest";
import { buildShareText, roundMark } from "./share";

describe("shared result line", () => {
  it("marks each round by how close it was, never by the answer", () => {
    expect([1, 0.95, 0.6, 0.2, 0].map(roundMark).join("")).toBe("🟩🟩🟨🟧⬛");
  });

  it("names the game, the day, the score and links to the game", () => {
    const text = buildShareText({
      gameId: "krillion",
      number: 7,
      ratios: [1, 0, 0.3],
      scoreText: "1.300 m di profondità",
    });
    expect(text.split("\n")).toEqual([
      "Sette Giochi · Abissi #7",
      "🟩⬛🟧  1.300 m di profondità",
      `${window.location.origin}/games/abissi`,
    ]);
  });

  it("says practice when there is no daily number, and drops the marks it does not know", () => {
    const text = buildShareText({
      gameId: "plain",
      number: null,
      scoreText: "4.000 m di quota",
    });
    expect(text).toContain("Quota, allenamento");
    expect(text.split("\n")[1]).toBe("4.000 m di quota");
  });
});
