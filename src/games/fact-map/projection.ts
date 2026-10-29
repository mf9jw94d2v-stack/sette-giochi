/**
 * Miller cylindrical projection: the classic rectangular world map of
 * school atlases and wall maps. Meridians are straight and evenly spaced,
 * parallels straight; the poles are cut off, as on a political map, at
 * 58°S (no Antarctica: no place of the game lies south of 34°S) and 84°N.
 * Scaled into a WORLD_W × WORLD_H box with the origin top-left.
 */
const RAD = Math.PI / 180;
export const LAT_MIN = -58;
export const LAT_MAX = 84;

const millerY = (latDeg: number) =>
  1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * latDeg * RAD));

export const WORLD_W = 360;
/** Map units per radian of longitude. */
const K = WORLD_W / (2 * Math.PI);
const Y_TOP = millerY(LAT_MAX);
export const WORLD_H = (Y_TOP - millerY(LAT_MIN)) * K;

const clampLat = (lat: number) => Math.max(LAT_MIN, Math.min(LAT_MAX, lat));

/** Longitude/latitude in degrees → map units (x right, y down). */
export function project(lon: number, lat: number): [number, number] {
  return [(lon + 180) * RAD * K, (Y_TOP - millerY(clampLat(lat))) * K];
}

/** Map units → longitude/latitude, kept inside the map. */
export function unproject(X: number, Y: number): { lon: number; lat: number } {
  const lon = Math.max(-180, Math.min(180, X / K / RAD - 180));
  const y = Y_TOP - Y / K;
  const lat = (2.5 * Math.atan(Math.exp(0.8 * y)) - 0.625 * Math.PI) / RAD;
  return { lon, lat: clampLat(lat) };
}

/** The edge of the map: a plain rectangle. */
export function outlinePath(): string {
  return `M0 0H${WORLD_W}V${WORLD_H.toFixed(2)}H0Z`;
}

/** Meridians and parallels every `every` degrees, straight lines. */
export function graticulePath(every = 30): string {
  let d = "";
  for (let lon = -180 + every; lon < 180; lon += every) {
    const [x] = project(lon, 0);
    d += `M${x.toFixed(2)} 0V${WORLD_H.toFixed(2)}`;
  }
  for (let lat = -30; lat <= 60; lat += every) {
    const [, y] = project(0, lat);
    d += `M0 ${y.toFixed(2)}H${WORLD_W}`;
  }
  return d;
}
