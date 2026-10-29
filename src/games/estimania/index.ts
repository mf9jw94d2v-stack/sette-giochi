import type { GameModule } from "@/types/game";
import { GAME_METADATA } from "@/games/registry";
import { estimaniaEngine, type EstimaniaSessionData } from "./engine";
import { estimaniaGenerator } from "./generator";
import { estimaniaValidator } from "./validator";
import type { EstimaniaMove, EstimaniaState } from "./types";

export const estimaniaModule: GameModule<
  EstimaniaSessionData,
  EstimaniaState,
  EstimaniaMove
> = {
  meta: GAME_METADATA.estimania,
  engine: estimaniaEngine,
  generator: estimaniaGenerator,
  validator: estimaniaValidator,
};

export { estimaniaEngine, estimaniaGenerator, estimaniaValidator };
export { ESTIMANIA_ITEMS } from "./data/questions";
export * from "./types";
