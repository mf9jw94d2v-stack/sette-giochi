import { createJiti } from "jiti";
import { resolve } from "node:path";
const root = "/Users/giovannifrattin/Projects/seven-games-platform";
const jiti = createJiti(import.meta.url, {
  alias: { "@": resolve(root, "src") },
  interopDefault: true,
});
const { GEO_REGIONS } = await jiti.import(
  resolve(root, "src/games/geoslice/data/regions.ts"),
);
const { scoreCut } = await jiti.import(
  resolve(root, "src/games/geoslice/engine.ts"),
);
for (const r of GEO_REGIONS) {
  let best = 100;
  for (const theta of [0, 45, 90, 135])
    for (let pos = 0; pos <= 100; pos += 2) {
      const { pctA } = scoreCut(r.cities, theta, pos);
      best = Math.min(best, Math.abs(pctA - 50));
    }
  console.log(
    `${best <= 8 ? "ok " : "BAD"} ${r.id.padEnd(16)} best off ${best.toFixed(1)}%`,
  );
}
