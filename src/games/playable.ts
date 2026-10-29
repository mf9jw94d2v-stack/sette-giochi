import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { GameId } from "@/types/game";
import type { PlayContext } from "./shared/session";

/**
 * Every game board takes the same props. They carry DATA only — how the board
 * is being presented — and each game renders it in its own visual language.
 */
export interface GamePlayProps {
  mode: "daily" | "practice";
  /** Seed the level is generated from. For a daily (or an archive replay of a
   *  past daily) this is the `YYYY-MM-DD` challenge date. */
  seed: string;
  dailyDate?: string;
  /** Mode switch on the game page, or a back link when replaying the archive. */
  context?: PlayContext;
  /** Start a fresh practice game without reloading the page. */
  onRestart?: () => void;
}

/**
 * The playable board of each game, without its Daily/Practice wrapper.
 *
 * Lazy on purpose: a board pulls in its whole dataset (Fact Map alone carries
 * ~127 KB of Natural Earth geometry), and the archive route needs exactly one
 * of the seven. Loading all of them to render one would be a waste.
 */
export const GAME_BOARDS: Record<
  GameId,
  LazyExoticComponent<ComponentType<GamePlayProps>>
> = {
  krillion: lazy(async () => ({
    default: (await import("./krillion/KrillionGame")).KrillionGame,
  })),
  plain: lazy(async () => ({
    default: (await import("./plain/PlainGame")).PlainGame,
  })),
  "fact-map": lazy(async () => ({
    default: (await import("./fact-map/FactMapGame")).FactMapGame,
  })),
  estimania: lazy(async () => ({
    default: (await import("./estimania/EstimaniaGame")).EstimaniaGame,
  })),
  "size-it-up": lazy(async () => ({
    default: (await import("./size-it-up/SizeItUpGame")).SizeItUpGame,
  })),
  geoslice: lazy(async () => ({
    default: (await import("./geoslice/GeoSliceGame")).GeoSliceGame,
  })),
  gazillion: lazy(async () => ({
    default: (await import("./gazillion/GazillionGame")).GazillionGame,
  })),
};

/**
 * The `levelId` every generator stamps on a level, and therefore the id an
 * archive result carries. Lets the archive tell which past days you replayed.
 */
export function levelIdFor(gameId: GameId, seed: string): string {
  return `${gameId}-${seed}`;
}
