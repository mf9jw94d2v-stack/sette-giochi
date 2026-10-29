import type { GameId, GameModule } from "@/types/game";
import { krillionModule } from "./krillion";
import { plainModule } from "./plain";
import { factMapModule } from "./fact-map";
import { estimaniaModule } from "./estimania";
import { sizeItUpModule } from "./size-it-up";
import { geosliceModule } from "./geoslice";
import { gazillionModule } from "./gazillion";
import { GAME_IDS } from "@/types/game";

/**
 * Every game's engine + generator + validator, keyed by id.
 *
 * This is the logic-only side of a game (no React), so shared tooling — the
 * quality pipeline, the generators' tests — can treat all seven uniformly.
 * The playable boards live in `playable.ts` and are loaded lazily.
 */
export const GAME_MODULES: Record<GameId, GameModule<never, never, never>> = {
  krillion: krillionModule,
  plain: plainModule,
  "fact-map": factMapModule,
  estimania: estimaniaModule,
  "size-it-up": sizeItUpModule,
  geoslice: geosliceModule,
  gazillion: gazillionModule,
} as unknown as Record<GameId, GameModule<never, never, never>>;

export const ALL_GAME_IDS = GAME_IDS;
