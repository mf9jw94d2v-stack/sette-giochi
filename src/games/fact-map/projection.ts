/**
 * Equal Earth projection (Šavrič, Patterson & Jenny, 2018), forward and
 * inverse, scaled into a WORLD_W × WORLD_H box with the origin top-left.
 *
 * Why Equal Earth: areas keep their true proportions (Greenland is not the
 * size of Africa, as on the old flat 360×180 map), meridians curve gently,
 * and the shape still fills a wide screen. Checked against d3-geo's
 * geoEqualEarth in projection.test.ts.
 */
const A1 = 1.340264;
const A2 = -0.081106;
const A3 = 0.000893;
const A4 = 0.003796;
const M = Math.sqrt(3) / 2;
const RAD = Math.PI / 180;

function polyY(t: number): number {
  const t2 = t * t;
  const t6 = t2 * t2 * t2;
  return t * (A1 + A2 * t2 + t6 * (A3 + A4 * t2));
}
function polyDY(t: number): number {
  const t2 = t * t;
  const t6 = t2 * t2 * t2;
  return A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2);
}

/** Raw projected extent: x in [-XMAX, XMAX], y in [-YMAX, YMAX]. */
const XMAX = Math.PI / (M * A1);
const YMAX = polyY(Math.asin(M * Math.sin(Math.PI / 2)));

export const WORLD_W = 360;
export const WORLD_H = (WORLD_W * YMAX) / XMAX;

/** Longitude/latitude in degrees → map units (x right, y down). */
export function project(lon: number, lat: number): [number, number] {
  const l = lon * RAD;
  const t = Math.asin(M * Math.sin(lat * RAD));
  const x = (l * Math.cos(t)) / (M * polyDY(t));
  const y = polyY(t);
  return [((x / XMAX + 1) / 2) * WORLD_W, ((1 - y / YMAX) / 2) * WORLD_H];
}

/**
 * Map units → longitude/latitude. Points outside the world's outline are
 * brought back to its edge, so a click just past the rim still lands on the
 * globe instead of nowhere.
 */
export function unproject(X: number, Y: number): { lon: number; lat: number } {
  const x = ((X / WORLD_W) * 2 - 1) * XMAX;
  const y = Math.max(-YMAX, Math.min(YMAX, (1 - (Y / WORLD_H) * 2) * YMAX));
  let t = y / A1;
  for (let i = 0; i < 12; i++) {
    const d = (polyY(t) - y) / polyDY(t);
    t -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  const lat = Math.asin(Math.max(-1, Math.min(1, Math.sin(t) / M))) / RAD;
  const cos = Math.cos(t);
  const lon = cos > 1e-9 ? (M * x * polyDY(t)) / cos / RAD : 0;
  return { lon: Math.max(-180, Math.min(180, lon)), lat };
}

/** The outline of the whole world (the ±180° meridians), for the sea. */
export function outlinePath(step = 2): string {
  const pts: [number, number][] = [];
  for (let lat = -90; lat <= 90; lat += step) pts.push(project(180, lat));
  for (let lat = 90; lat >= -90; lat -= step) pts.push(project(-180, lat));
  return (
    pts
      .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`)
      .join("") + "Z"
  );
}

/** Meridians and parallels every `every` degrees, as one path. */
export function graticulePath(every = 30, step = 2): string {
  let d = "";
  for (let lon = -180 + every; lon < 180; lon += every) {
    for (let lat = -90; lat <= 90; lat += step) {
      const [x, y] = project(lon, lat);
      d += `${lat === -90 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    }
  }
  for (let lat = -90 + every; lat < 90; lat += every) {
    for (let lon = -180; lon <= 180; lon += step) {
      const [x, y] = project(lon, lat);
      d += `${lon === -180 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    }
  }
  return d;
}
