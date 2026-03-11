#!/usr/bin/env node
/**
 * Finds route files without corresponding test files.
 * Outputs JSON report to stdout.
 */
import { readdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { ROOT, ROUTES_SKIP } from '../harness.config.mjs';

const ROUTES_DIR = resolve(ROOT, 'server/src/routes');
const TESTS_DIR = resolve(ROOT, 'server/src/__tests__');

const routes = readdirSync(ROUTES_DIR).filter(f => f.endsWith('.ts') && !ROUTES_SKIP.includes(f));
const tests = existsSync(TESTS_DIR) ? readdirSync(TESTS_DIR) : [];

const untested = routes.filter(route => {
  const base = route.replace('.ts', '');
  return !tests.some(t => t === `${base}.test.ts` || t.startsWith(`${base}.`) || t.startsWith(`${base}-`));
});

console.log(JSON.stringify({ type: 'untested-routes', count: untested.length, items: untested.map(f => ({ route: `server/src/routes/${f}` })) }, null, 2));
process.exit(untested.length > 0 ? 1 : 0);
