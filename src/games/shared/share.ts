import { GAME_SLUG } from "@/games/slugs";
import { GAME_METADATA } from "@/games/registry";
import type { GameId } from "@/types/game";

/**
 * The line a player shares after a game, Wordle-style: the game and the day,
 * one mark per round, the score, a link. Marks describe how close each round
 * was — never the answers, so a shared result spoils nothing.
 */

/** One mark per round, from the share of the round's maximum it scored. */
export function roundMark(ratio: number): string {
  if (!(ratio > 0)) return "⬛";
  if (ratio >= 0.9) return "🟩";
  if (ratio >= 0.5) return "🟨";
  return "🟧";
}

export function shareUrl(gameId: GameId): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://example.invalid";
  return `${origin}${import.meta.env.BASE_URL}games/${GAME_SLUG[gameId]}`;
}

export function buildShareText(input: {
  gameId: GameId;
  /** Daily number, or null for a practice game. */
  number: number | null;
  /** Points of each round over the round's maximum, in order. */
  ratios?: number[];
  scoreText: string;
}): string {
  const name = GAME_METADATA[input.gameId].name;
  const head =
    input.number !== null
      ? `Sette Giochi · ${name} #${input.number}`
      : `Sette Giochi · ${name}, allenamento`;
  const marks = input.ratios?.length
    ? `${input.ratios.map(roundMark).join("")}  `
    : "";
  return `${head}\n${marks}${input.scoreText}\n${shareUrl(input.gameId)}`;
}

export type ShareOutcome = "shared" | "copied" | "failed";

/**
 * The system share sheet where there is one (phones), otherwise the
 * clipboard. A dismissed share sheet counts as nothing happened.
 */
export async function shareResult(text: string): Promise<ShareOutcome | null> {
  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.share &&
      matchMedia("(pointer: coarse)").matches
    ) {
      await navigator.share({ text });
      return "shared";
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return null;
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
