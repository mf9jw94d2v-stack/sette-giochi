/** A city: its real place, projected into the game's 0–100 field. */
export interface GeoCity {
  name: string;
  /** Position in the 0–100 field (true proportions, see data/regions.ts). */
  x: number;
  y: number;
  /** Population of the urban area (thousands, Natural Earth estimate). */
  pop: number;
  /** Where it really is, in degrees (provenance; the game uses x and y). */
  lat?: number;
  lon?: number;
}

export interface GeoRegion {
  id: string;
  name: string;
  /** The country's outline in the same 0–100 field, as an SVG path. */
  outline?: string;
  cities: GeoCity[];
}

export type GeoLevelData = GeoRegion;

export interface GeoCut {
  /** Normal angle of the cut line, in degrees. */
  theta: number;
  /** Position along the normal, 0–100 (mapped to the projection range). */
  pos: number;
}

export interface GeoRound {
  data: GeoLevelData;
  cut: GeoCut | null;
  /** Percentage of population on side A after the cut. */
  pctA: number;
  points: number;
}

export interface GeoState {
  rounds: GeoRound[];
  current: number;
  finished: boolean;
}

export type GeoMove =
  { type: "submit"; theta: number; pos: number } | { type: "pass" };
