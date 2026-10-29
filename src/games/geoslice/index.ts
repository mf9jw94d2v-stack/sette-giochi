import type { GameModule } from "@/types/game";
import { GAME_METADATA } from "@/games/registry";
import { geoEngine, type GeoSessionData } from "./engine";
import { geoGenerator } from "./generator";
import { geoValidator } from "./validator";
import type { GeoMove, GeoState } from "./types";

export const geosliceModule: GameModule<GeoSessionData, GeoState, GeoMove> = {
  meta: GAME_METADATA.geoslice,
  engine: geoEngine,
  generator: geoGenerator,
  validator: geoValidator,
};

export { geoEngine, geoGenerator, geoValidator };
export { GEO_REGIONS } from "./data/regions";
export * from "./types";
