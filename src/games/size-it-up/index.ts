import type { GameModule } from "@/types/game";
import { GAME_METADATA } from "@/games/registry";
import { sizeEngine, type SizeSessionData } from "./engine";
import { sizeGenerator } from "./generator";
import { sizeValidator } from "./validator";
import type { SizeMove, SizeState } from "./types";

export const sizeItUpModule: GameModule<SizeSessionData, SizeState, SizeMove> =
  {
    meta: GAME_METADATA["size-it-up"],
    engine: sizeEngine,
    generator: sizeGenerator,
    validator: sizeValidator,
  };

export { sizeEngine, sizeGenerator, sizeValidator };
export { SIZE_OBJECTS } from "./data/objects";
export { SILHOUETTES } from "./silhouettes";
export * from "./types";
