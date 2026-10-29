/**
 * Build Taglio's regions from real data:
 *   - cities: position and population from Natural Earth populated places
 *     (1:10m, public domain; `pop_max` = population of the urban area);
 *   - outline: the country from Natural Earth 1:50m via world-atlas (ISC),
 *     keeping the mainland and the islands near the cities, so overseas
 *     territories do not squeeze the map.
 * Both are projected the same way (local equirectangular, true proportions
 * at the country's middle latitude) into the game's 0–100 field.
 *
 *   curl -L -o places.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places_simple.geojson
 *   node scripts/geo/build-geoslice.mjs places.geojson
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { feature } from "topojson-client";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
const placesFile = process.argv[2];
if (!placesFile)
  throw new Error(
    "usage: node scripts/geo/build-geoslice.mjs <ne_10m_populated_places_simple.geojson>",
  );

const cfg = JSON.parse(
  readFileSync(join(root, "scripts/geo/geoslice-cities.json"), "utf8"),
);
const places = JSON.parse(readFileSync(placesFile, "utf8")).features.map(
  (f) => f.properties,
);
const countries = JSON.parse(
  readFileSync(require.resolve("world-atlas/countries-50m.json"), "utf8"),
);
const countryFeatures = feature(
  countries,
  countries.objects.countries,
).features;

const norm = (s) =>
  (s ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const MARGIN = 7;

function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const dx = bx - ax,
      dy = by - ay,
      len2 = dx * dx + dy * dy;
    let best = -1,
      bestD = tol * tol;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i];
      const t = len2
        ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
        : 0;
      const d = (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2;
      if (d > bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best >= 0) {
      keep[best] = 1;
      stack.push([a, best], [best, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}
const area = (pts) => {
  let s = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++)
    s += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
  return Math.abs(s / 2);
};

const out = [];
for (const r of cfg.regions) {
  const candidates = places.filter((p) => p.iso_a2 === r.iso);
  const cities = Object.entries(r.cities).map(([it, en]) => {
    const hits = candidates.filter((p) =>
      [p.name, p.nameascii, ...(p.namealt ?? "").split("|")]
        .map(norm)
        .includes(norm(en)),
    );
    if (hits.length !== 1)
      throw new Error(`${r.id}: "${en}" matched ${hits.length} places`);
    const h = hits[0];
    return {
      name: it,
      lon: h.longitude,
      lat: h.latitude,
      pop: Math.round(h.pop_max / 1000),
    };
  });

  // A fair 50/50 cut needs no single city carrying close to half of the
  // total. Where the chosen cities leave one metropolis above 40 %, add the
  // country's next largest real cities (never two points of one urban area,
  // which would count it twice) until it falls below — up to 26 cities.
  // A country that still cannot be cut fairly is left out of the game.
  const km = (a, b) => {
    const R = 6371,
      rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad,
      dLon = (b.lon - a.lon) * rad;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const share = () =>
    Math.max(...cities.map((c) => c.pop)) /
    cities.reduce((n, c) => n + c.pop, 0);
  // Only within the area of the chosen cities (plus a margin): far islands
  // such as Madeira, the Azores or Okinawa would stretch the map and squeeze
  // the mainland into a corner.
  const bb = [
    Math.min(...cities.map((c) => c.lon)),
    Math.max(...cities.map((c) => c.lon)),
    Math.min(...cities.map((c) => c.lat)),
    Math.max(...cities.map((c) => c.lat)),
  ];
  const mLon = (bb[1] - bb[0]) * 0.15 + 0.5,
    mLat = (bb[3] - bb[2]) * 0.15 + 0.5;
  const pool = candidates
    .filter((p) => p.pop_max > 0)
    .filter(
      (p) =>
        p.longitude >= bb[0] - mLon &&
        p.longitude <= bb[1] + mLon &&
        p.latitude >= bb[2] - mLat &&
        p.latitude <= bb[3] + mLat,
    )
    .sort((a, b) => b.pop_max - a.pop_max)
    .map((p) => ({
      name: p.name,
      lon: p.longitude,
      lat: p.latitude,
      pop: Math.round(p.pop_max / 1000),
    }));
  for (const p of pool) {
    if (share() <= 0.4 || cities.length >= 26) break;
    if (cities.some((c) => km(c, p) < 35)) continue;
    cities.push(p);
  }
  if (share() > 0.5) {
    console.log(
      `left out: ${r.id} (largest city ${(share() * 100).toFixed(0)}% of ${cities.length} cities)`,
    );
    continue;
  }

  const lons = cities.map((c) => c.lon),
    lats = cities.map((c) => c.lat);
  const [lo0, lo1, la0, la1] = [
    Math.min(...lons),
    Math.max(...lons),
    Math.min(...lats),
    Math.max(...lats),
  ];
  const padLo = (lo1 - lo0) * 0.25 + 0.3,
    padLa = (la1 - la0) * 0.25 + 0.3;

  const country = countryFeatures.find((f) => f.id === r.num);
  if (!country) throw new Error(`${r.id}: no country ${r.num}`);
  const g = country.geometry;
  const polys = (g.type === "Polygon" ? [g.coordinates] : g.coordinates).filter(
    (poly) => {
      const ring = poly[0];
      const xs = ring.map((p) => p[0]),
        ys = ring.map((p) => p[1]);
      return (
        Math.max(...xs) >= lo0 - padLo &&
        Math.min(...xs) <= lo1 + padLo &&
        Math.max(...ys) >= la0 - padLa &&
        Math.min(...ys) <= la1 + padLa
      );
    },
  );

  // Local equirectangular around the middle latitude: true proportions there.
  const midLat =
    (Math.min(la0, ...polys.flatMap((p) => p[0].map((q) => q[1]))) +
      Math.max(la1, ...polys.flatMap((p) => p[0].map((q) => q[1])))) /
    2;
  const k = Math.cos((midLat * Math.PI) / 180);
  const raw = ([lon, lat]) => [lon * k, -lat];
  const allPts = [
    ...polys.flatMap((p) => p[0]),
    ...cities.map((c) => [c.lon, c.lat]),
  ].map(raw);
  const [x0, x1] = [
    Math.min(...allPts.map((p) => p[0])),
    Math.max(...allPts.map((p) => p[0])),
  ];
  const [y0, y1] = [
    Math.min(...allPts.map((p) => p[1])),
    Math.max(...allPts.map((p) => p[1])),
  ];
  const scale = (100 - 2 * MARGIN) / Math.max(x1 - x0, y1 - y0);
  const ox = MARGIN + (100 - 2 * MARGIN - (x1 - x0) * scale) / 2;
  const oy = MARGIN + (100 - 2 * MARGIN - (y1 - y0) * scale) / 2;
  const fit = (p) => {
    const [x, y] = raw(p);
    return [ox + (x - x0) * scale, oy + (y - y0) * scale];
  };

  let outline = "";
  for (const poly of polys) {
    for (const ring of poly) {
      const pts = simplify(ring.map(fit), 0.12);
      if (pts.length < 4 || area(pts) < 0.05) continue;
      outline +=
        "M" +
        pts
          .slice(0, -1)
          .map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`)
          .join("L") +
        "Z";
    }
  }
  out.push({
    id: r.id,
    name: r.name,
    outline,
    cities: cities
      .map((c) => {
        const [x, y] = fit([c.lon, c.lat]);
        return {
          name: c.name,
          x: +x.toFixed(2),
          y: +y.toFixed(2),
          pop: c.pop,
          lat: +c.lat.toFixed(4),
          lon: +c.lon.toFixed(4),
        };
      })
      .sort((a, b) => b.pop - a.pop),
  });
}

const body = out
  .map(
    (r) => `  {
    id: ${JSON.stringify(r.id)},
    name: ${JSON.stringify(r.name)},
    outline:
      ${JSON.stringify(r.outline)},
    cities: [
${r.cities.map((c) => `      { name: ${JSON.stringify(c.name)}, x: ${c.x}, y: ${c.y}, pop: ${c.pop}, lat: ${c.lat}, lon: ${c.lon} },`).join("\n")}
    ],
  },`,
  )
  .join("\n");

writeFileSync(
  join(root, "src/games/geoslice/data/regions.ts"),
  `// GENERATED by scripts/geo/build-geoslice.mjs — do not edit by hand.
import type { GeoRegion } from "../types";

/**
 * Taglio's regions, from real data. Cities: position and population of the
 * urban area (\`pop\`, thousands) from Natural Earth populated places
 * (public domain). Outline: the country from Natural Earth 1:50m (public
 * domain, via world-atlas), mainland and nearby islands. Both projected
 * with true proportions at the country's middle latitude into the game's
 * 0–100 field. Populations are Natural Earth's estimates, not a census.
 */
export const GEO_REGIONS: readonly GeoRegion[] = [
${body}
];
`,
);
// A light copy of one region for the Taglio cover on the home page: the
// outline simplified to ~1 % of the field, the ten largest cities.
{
  const it = out.find((r) => r.id === "italia");
  const pts = [...it.outline.matchAll(/M([^Z]+)Z/g)].map((m) =>
    m[1].split("L").map((p) => p.trim().split(" ").map(Number)),
  );
  const coarse = pts
    .map((ring) => simplify(ring.concat([ring[0]]), 0.9))
    .filter((ring) => ring.length >= 4 && area(ring) > 2)
    .map(
      (ring) =>
        "M" +
        ring
          .slice(0, -1)
          .map(([x, y]) => `${Math.round(x * 4)} ${Math.round(y * 4)}`)
          .join("L") +
        "Z",
    )
    .join("");
  writeFileSync(
    join(root, "src/components/games/geosliceCover.ts"),
    `// GENERATED by scripts/geo/build-geoslice.mjs — do not edit by hand.
// Italy for the Taglio cover: the same real outline and cities as the game
// (Natural Earth, public domain), simplified, in a 400 × 400 box.
export const COVER_OUTLINE = ${JSON.stringify(coarse)};
export const COVER_CITIES: [number, number, number][] = ${JSON.stringify(
      it.cities
        .slice(0, 10)
        .map((c) => [Math.round(c.x * 4), Math.round(c.y * 4), c.pop]),
    )};
`,
  );
}
console.log(
  `Wrote ${out.length} regions, ${out.reduce((n, r) => n + r.cities.length, 0)} cities.`,
);
