#!/usr/bin/env node
/**
 * Measures the true bounding box of every Size It Up silhouette and compares
 * it with the box declared in `src/games/size-it-up/silhouettes.ts`.
 *
 * Why this exists: a silhouette is scored on. If a path stops 8 % short of the
 * box it claims to fill, the object is drawn 8 % too small and the player is
 * marked wrong for the drawing's slop. Hand-checking a path cannot catch that;
 * only rendering it can.
 *
 * It writes a page that measures the paths with the browser's own `getBBox`,
 * because an SVG arc's real extent is not something you can read off the path
 * text. Open it with the dev server running:
 *
 *   node scripts/validation/silhouette-bbox.mjs
 *   # then open http://localhost:5173/_silhouette-bbox.html
 *
 * The page prints one line per silhouette, flagging any whose measured box
 * differs from the declared one. Copy the corrected numbers back into
 * `silhouettes.ts` and delete the page (it lives in public/, so it must not be
 * committed).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = readFileSync(
  resolve(root, "src/games/size-it-up/silhouettes.ts"),
  "utf8",
);

const body = src.slice(src.indexOf("export const SILHOUETTES"));
const re =
  /(\w+): \{\s*box: \{ x: ([-\d.]+), y: ([-\d.]+), w: ([\d.]+), h: ([\d.]+) \},\s*measure: "(\w)",[\s\S]*?d: "([^"]+)",/g;

const items = [];
let m;
while ((m = re.exec(body))) {
  const [, id, x, y, w, h, measure, d] = m;
  items.push({ id, declared: { x: +x, y: +y, w: +w, h: +h }, measure, d });
}

const out = resolve(root, "public/_silhouette-bbox.html");
writeFileSync(
  out,
  `<!doctype html><meta charset="utf-8"><title>Silhouette bbox</title>
<body style="font:13px ui-monospace,monospace;white-space:pre;padding:16px">
<svg id="probe" width="0" height="0" aria-hidden="true"></svg><div id="out"></div>
<script>
const items = ${JSON.stringify(items)};
const probe = document.getElementById("probe");
const lines = items.map((it) => {
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", it.d);
  p.setAttribute("fill-rule", "evenodd");
  probe.appendChild(p);
  const b = p.getBBox();
  probe.removeChild(p);
  const near = (a, c) => Math.abs(a - c) < 0.05;
  const ok = near(b.x, it.declared.x) && near(b.y, it.declared.y) &&
             near(b.width, it.declared.w) && near(b.height, it.declared.h);
  const f = (v) => (Math.round(v * 100) / 100);
  return (ok ? "ok       " : "DA CORREGGERE ") + it.id.padEnd(14) +
    "box: { x: " + f(b.x) + ", y: " + f(b.y) +
    ", w: " + f(b.width) + ", h: " + f(b.height) + " }";
});
const bad = lines.filter((l) => l.startsWith("DA")).length;
document.getElementById("out").textContent =
  lines.join("\\n") + "\\n\\n" +
  (bad === 0 ? "Tutte le sagome combaciano con il riquadro dichiarato."
             : bad + " sagome da correggere: copia i valori qui sopra.");
</script></body>`,
  "utf8",
);

console.log(
  `Pagina scritta: ${out}\nApri http://localhost:5173/_silhouette-bbox.html con il dev server attivo, poi cancella il file.`,
);
