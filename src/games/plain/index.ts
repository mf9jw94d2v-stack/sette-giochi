import type { GameModule } from "@/types/game";
import { GAME_METADATA } from "@/games/registry";
import { plainEngine, type PlainSessionData } from "./engine";
import { plainGenerator } from "./generator";
import { plainValidator } from "./validator";
import type { PlainMove, PlainState } from "./types";

export const plainModule: GameModule<PlainSessionData, PlainState, PlainMove> =
  {
    meta: GAME_METADATA.plain,
    engine: plainEngine,
    generator: plainGenerator,
    validator: plainValidator,
  };

export { plainEngine, plainGenerator, plainValidator };
export { PLAIN_ITEMS } from "./data/prompts";
export * from "./types";
