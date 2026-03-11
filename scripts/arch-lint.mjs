#!/usr/bin/env node

/**
 * Enforces import boundary rules between monorepo packages.
 * Usage: node scripts/arch-lint.mjs
 * Exit 0 on success, 1 on violation.
 *
 * Checks: static imports, dynamic import(), re-exports, require().
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, relative, extname } from 'path';
import { ROOT, ARCH_RULES } from './harness.config.mjs';

const TS_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);

function walkDir(dir) {
  const files = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.next') continue;
    const fullPath = resolve(dir, entry);
    const stat = statSync(fullPath, { throwIfNoEntry: false });
    if (!stat) continue;
    if (stat.isDirectory()) {
      files.push(...walkDir(fullPath));
    } else if (TS_EXTENSIONS.has(extname(entry))) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Extract all import/require/export-from specifiers from file content.
 * Handles: static import, dynamic import(), require(), export...from.
 * Returns array of { specifier, line, code }.
 */
function extractImportSpecifiers(content) {
  const results = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Static import: import ... from "specifier"
    // Also matches: import type ... from "specifier"
    const staticImport = line.match(/(?:import|export)\s+.*?from\s+['"]([^'"]+)['"]/);
    if (staticImport) {
      results.push({ specifier: staticImport[1], line: i + 1, code: line.trim() });
      continue;
    }

    // Dynamic import: import("specifier") or import('specifier')
    const dynamicImport = line.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (dynamicImport) {
      results.push({ specifier: dynamicImport[1], line: i + 1, code: line.trim() });
      continue;
    }

    // require("specifier") or require('specifier')
    const requireCall = line.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (requireCall) {
      results.push({ specifier: requireCall[1], line: i + 1, code: line.trim() });
      continue;
    }

    // Bare export from: export { foo } from "specifier"
    const exportFrom = line.match(/export\s+\{[^}]*\}\s+from\s+['"]([^'"]+)['"]/);
    if (exportFrom) {
      results.push({ specifier: exportFrom[1], line: i + 1, code: line.trim() });
    }
  }

  return results;
}

let violations = [];

for (const rule of ARCH_RULES) {
  let sourceDir;

  if (rule.scanSubdirs) {
    // For packages/adapters: scan each adapter's src/ subdirectory
    const adaptersRoot = resolve(ROOT, rule.source);
    let adapterDirs;
    try {
      adapterDirs = readdirSync(adaptersRoot)
        .filter(e => {
          const st = statSync(resolve(adaptersRoot, e), { throwIfNoEntry: false });
          return st && st.isDirectory() && e !== 'node_modules';
        })
        .flatMap(adapter => {
          const srcDir = resolve(adaptersRoot, adapter, 'src');
          try {
            statSync(srcDir);
            return [srcDir];
          } catch {
            // No src/ dir, scan adapter root
            return [resolve(adaptersRoot, adapter)];
          }
        });
    } catch {
      adapterDirs = [];
    }

    for (const dir of adapterDirs) {
      checkDir(dir, rule);
    }
    continue;
  }

  sourceDir = resolve(ROOT, rule.source);
  checkDir(sourceDir, rule);
}

function checkDir(dir, rule) {
  const files = walkDir(dir);
  for (const filePath of files) {
    let content;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    const imports = extractImportSpecifiers(content);
    for (const imp of imports) {
      for (const { pattern, label } of rule.forbidden) {
        if (pattern.test(imp.specifier) || pattern.test(imp.code)) {
          const relPath = relative(ROOT, filePath);
          violations.push({
            file: relPath,
            line: imp.line,
            rule: rule.description,
            imported: label,
            code: imp.code,
          });
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error('Architecture lint FAILED:\n');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    Rule: ${v.rule}`);
    console.error(`    Forbidden import: ${v.imported}`);
    console.error(`    Code: ${v.code}\n`);
  }
  console.error(`${violations.length} violation(s) found.`);
  process.exit(1);
} else {
  console.log('Architecture lint PASSED');
  console.log(`  - ${ARCH_RULES.length} boundary rules checked`);
  console.log('  - No violations found');
  process.exit(0);
}
