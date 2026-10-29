import type { GameId } from "@/types/game";

/**
 * Each game's identity as the PLATFORM shows it: on the home page, the
 * catalogue, the daily scoreboard, the archive and the statistics.
 *
 * Covers always use each game's NIGHT palette (the platform is dark first),
 * so the seven sit together as lit panels on the same table. These values
 * are copied from the games' own design systems
 * (`src/games/<game>/<game>.css`, described in docs/game-identities.md), so a
 * game looks the same outside its page as inside it. The covers in
 * `src/components/games/GameCover.tsx` are drawn from them.
 */
export interface GameTheme {
  /** Cover background, top and bottom (the same value for a flat page). */
  from: string;
  to: string;
  /** Text colour on the cover. */
  fg: string;
  /**
   * The game's signal colour. Used for swatches and marks, never as text on
   * the platform's own surfaces, where some of these would not be legible.
   */
  accent: string;
  /** The game's own typeface, for its name on the cover. */
  font: string;
  /** Weight and width that make the name look like the game's wordmark. */
  nameStyle: {
    fontWeight: number;
    fontStretch?: string;
    textTransform?: "uppercase";
    letterSpacing?: string;
  };
  /** Short mechanic label (Italian), e.g. "Indovina l'anno". */
  mechanic: string;
}

export const GAME_THEMES: Record<GameId, GameTheme> = {
  krillion: {
    from: "#0b3a5b",
    to: "#020409",
    fg: "#e8f1ff",
    accent: "#38bdf8",
    font: "VT323, ui-monospace, monospace",
    nameStyle: {
      fontWeight: 400,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
    },
    mechanic: "Quiz a risposta rara",
  },
  plain: {
    from: "#0b0d12",
    to: "#151922",
    fg: "#f3f5f9",
    accent: "#d2fa4b",
    font: "Geist, Inter, system-ui, sans-serif",
    nameStyle: { fontWeight: 600, letterSpacing: "-0.04em" },
    mechanic: "Stima di prossimità",
  },
  "fact-map": {
    from: "#0e1a24",
    to: "#09131b",
    fg: "#ece6d9",
    accent: "#f97316",
    font: "Outfit, Inter, system-ui, sans-serif",
    nameStyle: { fontWeight: 600, letterSpacing: "-0.02em" },
    mechanic: "Geografia sulla mappa",
  },
  estimania: {
    from: "#1d1a14",
    to: "#13110d",
    fg: "#f1ebdf",
    accent: "#2dd4bf",
    font: "Fraunces, Georgia, serif",
    nameStyle: { fontWeight: 600, letterSpacing: "-0.02em" },
    mechanic: "Stima numerica",
  },
  "size-it-up": {
    from: "#1f1a14",
    to: "#16120e",
    fg: "#f2e8d7",
    accent: "#f2765c",
    font: "Archivo, Inter, system-ui, sans-serif",
    nameStyle: {
      fontWeight: 800,
      fontStretch: "75%",
      textTransform: "uppercase",
    },
    mechanic: "Dai le proporzioni",
  },
  geoslice: {
    from: "#060b16",
    to: "#0d1527",
    fg: "#e2e8f0",
    accent: "#22d3ee",
    font: '"Chakra Petch", ui-monospace, monospace',
    nameStyle: { fontWeight: 600, letterSpacing: "0.01em" },
    mechanic: "Dividi la popolazione",
  },
  gazillion: {
    from: "#0c0a1d",
    to: "#4c0519",
    fg: "#fdf2f8",
    accent: "#fbbf24",
    font: "Unbounded, Inter, system-ui, sans-serif",
    nameStyle: { fontWeight: 700, letterSpacing: "-0.02em" },
    mechanic: "Indovina l'anno",
  },
};
