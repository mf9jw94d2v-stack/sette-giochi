import type { GameModule } from "@/types/game";
import { GAME_METADATA } from "@/games/registry";
import { gazillionEngine, type GazillionSessionData } from "./engine";
import { gazillionGenerator } from "./generator";
import { gazillionValidator } from "./validator";
import type { GazillionMove, GazillionState } from "./types";

export const gazillionModule: GameModule<
  GazillionSessionData,
  GazillionState,
  GazillionMove
> = {
  meta: GAME_METADATA.gazillion,
  engine: gazillionEngine,
  generator: gazillionGenerator,
  validator: gazillionValidator,
};

export { gazillionEngine, gazillionGenerator, gazillionValidator };
export { GAZILLION_EVENTS } from "./data/events";
export * from "./types";
