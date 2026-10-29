#!/usr/bin/env node
/**
 * Fails if regenerating docs/quality-report.md changes anything other than the
 * timings. The generators are deterministic, so the counts in that file must
 * be reproducible from the same seeds — otherwise the committed report is not
 * evidence of anything.
 *
 * Usage: node scripts/validation/check-quality-report.mjs --days 365 --end YYYY-MM-DD
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const reportPath = resolve(root, "docs/quality-report.md");

/** Lines that legitimately differ between runs: wall-clock timings. */
const VOLATILE = /^(- Esecuzione: |- Tempo totale)|\d+(\.\d+)? ms/;

function meaningful(text) {
  return text
    .split("\n")
    .filter((line) => !VOLATILE.test(line))
    .join("\n");
}

const before = readFileSync(reportPath, "utf8");
try {
  execFileSync(
    process.execPath,
    [
      resolve(root, "scripts/generation/quality-report.mjs"),
      ...process.argv.slice(2),
    ],
    { cwd: root, stdio: "inherit" },
  );
  const after = readFileSync(reportPath, "utf8");
  if (meaningful(before) !== meaningful(after)) {
    console.error(
      "docs/quality-report.md non è riproducibile: i conteggi sono cambiati a parità di semi.",
    );
    process.exit(1);
  }
  console.log("Report di qualità riproducibile: conteggi invariati.");
} finally {
  // Leave the working tree as we found it: only timings would have changed.
  writeFileSync(reportPath, before, "utf8");
}
