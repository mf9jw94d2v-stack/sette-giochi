import { describe, expect, it } from "vitest";
import { GAME_IDS } from "@/types/game";
import { GAMES, GAME_METADATA, getGameMeta } from "./registry";

describe("game registry", () => {
  it("defines metadata for exactly the seven game ids", () => {
    expect(Object.keys(GAME_METADATA).sort()).toEqual([...GAME_IDS].sort());
    expect(GAMES).toHaveLength(7);
  });

  it("has a unique id on every game and matching keyed metadata", () => {
    const ids = GAMES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const g of GAMES) {
      expect(GAME_METADATA[g.id].id).toBe(g.id);
    }
  });

  it("looks up by id and returns undefined for unknown ids", () => {
    expect(getGameMeta("krillion")?.name).toBe("Abissi");
    // The public slug finds the same game.
    expect(getGameMeta("abissi")?.id).toBe("krillion");
    expect(getGameMeta("in-scala")?.id).toBe("size-it-up");
    expect(getGameMeta("nope")).toBeUndefined();
  });

  it("gives every game a non-empty name, tagline and original url", () => {
    for (const g of GAMES) {
      expect(g.name.length).toBeGreaterThan(0);
      expect(g.tagline.length).toBeGreaterThan(0);
      expect(g.originalUrl).toMatch(/^https?:\/\//);
    }
  });
});
