#!/usr/bin/env node
/**
 * Finds exported types in packages/shared that may have zero consumers.
 * Heuristic: grep for type name across server/ and ui/src/.
 * Outputs JSON report to stdout.
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const SHARED_DIR = resolve(process.cwd(), 'packages/shared/src');
const exportPattern = /export\s+(?:type|interface)\s+(\w+)/g;

const types = [];
function scanDir(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) { scanDir(full); continue; }
    if (!entry.name.endsWith('.ts')) continue;
    const content = readFileSync(full, 'utf-8');
    let match;
    while ((match = exportPattern.exec(content)) !== null) {
      types.push({ name: match[1], file: full.replace(process.cwd() + '/', '') });
    }
  }
}
scanDir(SHARED_DIR);

const orphaned = [];
for (const t of types) {
  try {
    const result = execSync(`grep -r "${t.name}" server/src/ ui/src/ --include="*.ts" --include="*.tsx" -l 2>/dev/null`, { cwd: process.cwd(), encoding: 'utf-8' });
    if (!result.trim()) orphaned.push(t);
  } catch {
    orphaned.push(t);
  }
}

console.log(JSON.stringify({ type: 'orphaned-types', count: orphaned.length, items: orphaned }, null, 2));
process.exit(orphaned.length > 0 ? 1 : 0);
