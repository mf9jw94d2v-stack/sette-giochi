/** A population centre placed on an abstract 0–100 grid. */
export interface GeoCity {
  name: string;
  /** Position in a 0–100 box (stylised layout, not precise cartography). */
  x: number;
  y: number;
  /** Population weight (thousands). */
  pop: number;
}

export interface GeoRegion {
  id: string;
  name: string;
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
