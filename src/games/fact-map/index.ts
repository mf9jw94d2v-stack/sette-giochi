import type { GameModule } from "@/types/game";
import { GAME_METADATA } from "@/games/registry";
import { factEngine, type FactSessionData } from "./engine";
import { factGenerator } from "./generator";
import { factValidator } from "./validator";
import type { FactMove, FactState } from "./types";

export const factMapModule: GameModule<FactSessionData, FactState, FactMove> = {
  meta: GAME_METADATA["fact-map"],
  engine: factEngine,
  generator: factGenerator,
  validator: factValidator,
};

export { factEngine, factGenerator, factValidator };
export { FACT_PLACES } from "./data/places";
export * from "./types";
