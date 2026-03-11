#!/usr/bin/env node
/**
 * Finds broken local links in doc/*.md files.
 * Outputs JSON report to stdout.
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';

const DOC_DIR = resolve(process.cwd(), 'doc');
const results = [];

function scanDir(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) { scanDir(full); continue; }
    if (!entry.name.endsWith('.md')) continue;
    const content = readFileSync(full, 'utf-8');
    const linkPattern = /\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkPattern.exec(content)) !== null) {
      const target = match[2];
      if (target.startsWith('http') || target.startsWith('#') || target.startsWith('/')) continue;
      const resolved = resolve(dirname(full), target.split('#')[0]);
      if (!existsSync(resolved)) {
        results.push({ file: full.replace(process.cwd() + '/', ''), link: target, text: match[1] });
      }
    }
  }
}

scanDir(DOC_DIR);
console.log(JSON.stringify({ type: 'stale-doc-links', count: results.length, items: results }, null, 2));
process.exit(results.length > 0 ? 1 : 0);
