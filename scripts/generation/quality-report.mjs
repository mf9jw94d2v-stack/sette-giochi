#!/usr/bin/env node
/**
 * Runs the real quality pipeline over a window of daily seeds and writes
 * docs/quality-report.md. Every number in that file comes from this run — it
 * is never hand-written.
 *
 * Usage: node scripts/generation/quality-report.mjs [--days 180] [--end YYYY-MM-DD]
 */
import { createJiti } from "jiti";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const days = Number(flag("days", "180"));
const end = flag("end", new Date().toISOString().slice(0, 10));

const jiti = createJiti(import.meta.url, {
  alias: { "@": resolve(root, "src") },
  interopDefault: true,
});

const { reviewAll } = await jiti.import(
  resolve(root, "src/services/quality/pipeline.ts"),
);
const { GAME_METADATA } = await jiti.import(
  resolve(root, "src/games/registry.ts"),
);

const report = reviewAll(end, days);

const pct = (v) => (v === null ? "—" : `${(v * 100).toFixed(1)} %`);
const ms = (v) => (v === null ? "—" : `${v.toFixed(2)} ms`);

const lines = [];
lines.push("# Quality Report");
lines.push("");
lines.push(
  "**Generato automaticamente** da `npm run quality:report` — non modificare a mano.",
);
lines.push("");
lines.push(`- Esecuzione: \`${report.runAt}\``);
lines.push(
  `- Semi analizzati: ${report.seeds.count} giorni, da \`${report.seeds.from}\` a \`${report.seeds.to}\` (i semi reali delle sfide giornaliere)`,
);
lines.push(
  `- Totali: ${report.totals.generated} generati · ${report.totals.published} pubblicati · ${report.totals.quarantined} in quarantena (di cui ${report.totals.duplicates} duplicati) · ${report.totals.rejected} rifiutati`,
);
lines.push(
  `- Tempo totale di generazione + validazione: ${report.totals.totalMs.toFixed(0)} ms`,
);
lines.push("");
lines.push("## Per gioco");
lines.push("");
lines.push(
  "| Gioco | Generatore | Generati | Validati | Pubblicati | Quarantena | Duplicati | Rifiutati | Validità | Tempo medio |",
);
lines.push(
  "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
);
for (const g of report.games) {
  const name = GAME_METADATA[g.gameId]?.name ?? g.gameId;
  lines.push(
    `| ${name} | \`${g.generatorVersion}\` | ${g.generated} | ${g.validated} | ${g.published} | ${g.quarantined} | ${g.duplicates} | ${g.rejected} | ${pct(g.validityRate)} | ${ms(g.avgMs)} |`,
  );
}
lines.push("");
lines.push("## Distribuzione della difficoltà (solo livelli pubblicati)");
lines.push("");
lines.push("| Gioco | Facile | Media | Difficile | Esperto |");
lines.push("| --- | ---: | ---: | ---: | ---: |");
for (const g of report.games) {
  const d = g.difficultyDistribution;
  const name = GAME_METADATA[g.gameId]?.name ?? g.gameId;
  lines.push(`| ${name} | ${d.easy} | ${d.medium} | ${d.hard} | ${d.expert} |`);
}
lines.push("");
lines.push("## Affidabilità del secondo controllo (indipendente)");
lines.push("");
lines.push(
  "`verified` = la correttezza è dimostrata da un algoritmo indipendente; `heuristic` = coerenza verificata ma non dimostrata; `unverified` = non verificabile automaticamente.",
);
lines.push("");
lines.push("| Gioco | verified | heuristic | unverified |");
lines.push("| --- | ---: | ---: | ---: |");
for (const g of report.games) {
  const c = g.confidenceCounts;
  const name = GAME_METADATA[g.gameId]?.name ?? g.gameId;
  lines.push(`| ${name} | ${c.verified} | ${c.heuristic} | ${c.unverified} |`);
}
lines.push("");
lines.push("## Quarantena");
lines.push("");
const anyFailure = report.games.some((g) => g.failures.length > 0);
if (!anyFailure) {
  lines.push(
    "Nessun livello in quarantena in questa finestra di semi. (Stato vuoto esplicito: non significa che la pipeline non venga eseguita, ma che tutti i semi analizzati hanno superato entrambi i controlli.)",
  );
} else {
  for (const g of report.games) {
    if (!g.failures.length) continue;
    const name = GAME_METADATA[g.gameId]?.name ?? g.gameId;
    lines.push(`### ${name} — ${g.failures.length} livelli`);
    lines.push("");
    lines.push("| Seme | Stato | Motivo | Dettaglio |");
    lines.push("| --- | --- | --- | --- |");
    for (const f of g.failures.slice(0, 50)) {
      lines.push(
        `| \`${f.seed}\` | ${f.status} | ${f.reason} | ${f.reasons.join("; ").replace(/\|/g, "\\|")} |`,
      );
    }
    if (g.failures.length > 50)
      lines.push(`\n_(mostrati i primi 50 di ${g.failures.length})_`);
    lines.push("");
  }
}
lines.push("");
lines.push("## Come riprodurlo");
lines.push("");
lines.push("```bash");
lines.push(
  `node scripts/generation/quality-report.mjs --days ${days} --end ${end}`,
);
lines.push("```");
lines.push("");
lines.push(
  "La generazione è deterministica: con gli stessi semi i conteggi sono identici (cambiano solo i tempi).",
);
lines.push("");

writeFileSync(
  resolve(root, "docs/quality-report.md"),
  lines.join("\n"),
  "utf8",
);
console.log(
  `quality-report.md aggiornato — ${report.totals.generated} livelli, ${report.totals.published} pubblicati, ${report.totals.quarantined} in quarantena.`,
);
