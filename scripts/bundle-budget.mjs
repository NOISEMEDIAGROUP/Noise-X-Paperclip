#!/usr/bin/env node
/**
 * Bundle budget checker — runs after UI build to verify sizes.
 * Warns (but does not fail) if bundles exceed thresholds.
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";

const DIST_DIR = join(import.meta.dirname, "../ui/dist/assets");
const BUDGETS = {
  "main (index*.js)": { pattern: /^index.*\.js$/, maxGzipKB: 500 },
  "vendor (vendor*.js)": { pattern: /^vendor.*\.js$/, maxGzipKB: 300 },
  "total JS": { pattern: /\.js$/, maxGzipKB: 1000 },
};

let files;
try {
  files = readdirSync(DIST_DIR);
} catch {
  console.log("[bundle-budget] No dist/assets found — skipping.");
  process.exit(0);
}

let hasWarning = false;

for (const [label, budget] of Object.entries(BUDGETS)) {
  const matching = files.filter((f) => budget.pattern.test(f));
  let totalGzipBytes = 0;

  for (const file of matching) {
    const raw = readFileSync(join(DIST_DIR, file));
    const gzipped = gzipSync(raw);
    totalGzipBytes += gzipped.length;
  }

  const gzipKB = Math.round(totalGzipBytes / 1024);

  if (gzipKB > budget.maxGzipKB) {
    console.warn(`⚠ [bundle-budget] ${label}: ${gzipKB}KB gzip exceeds ${budget.maxGzipKB}KB budget`);
    hasWarning = true;
  } else {
    console.log(`✓ [bundle-budget] ${label}: ${gzipKB}KB gzip (budget: ${budget.maxGzipKB}KB)`);
  }
}

if (hasWarning) {
  console.warn("\n⚠ Bundle budget exceeded — consider code splitting or removing large dependencies.");
}
