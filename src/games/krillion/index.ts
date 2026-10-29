import type { GameModule } from "@/types/game";
import { GAME_METADATA } from "@/games/registry";
import { krillionEngine, type KrillionSessionData } from "./engine";
import { krillionGenerator } from "./generator";
import { krillionValidator } from "./validator";
import type { KrillionMove, KrillionState } from "./types";

export const krillionModule: GameModule<
  KrillionSessionData,
  KrillionState,
  KrillionMove
> = {
  meta: GAME_METADATA.krillion,
  engine: krillionEngine,
  generator: krillionGenerator,
  validator: krillionValidator,
};

export { krillionEngine, krillionGenerator, krillionValidator };
export { KRILLION_PROMPTS } from "./data/prompts";
export * from "./types";
