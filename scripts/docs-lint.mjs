#!/usr/bin/env node

/**
 * Lints required documentation: existence, frontmatter markers, local link
 * integrity, and optionally doc freshness.
 * Usage: node scripts/docs-lint.mjs
 * Exit 0 on success, 1 on validation failure.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import {
  ROOT,
  REQUIRED_DOCS,
  REQUIRED_FRONTMATTER_FIELDS,
  DOC_FRESHNESS_THRESHOLD_DAYS,
} from './harness.config.mjs';

let errors = [];
let warnings = [];
const fileCache = new Map();

function readCached(fullPath) {
  if (fileCache.has(fullPath)) return fileCache.get(fullPath);
  try {
    const content = readFileSync(fullPath, 'utf-8');
    fileCache.set(fullPath, content);
    return content;
  } catch {
    return null;
  }
}

// 1. Check required docs exist
for (const docPath of REQUIRED_DOCS) {
  const fullPath = resolve(ROOT, docPath);
  if (!existsSync(fullPath)) {
    errors.push(`Missing required doc: ${docPath}`);
  }
}

// 2. Check frontmatter markers and freshness in existing docs
for (const docPath of REQUIRED_DOCS) {
  const fullPath = resolve(ROOT, docPath);
  const content = readCached(fullPath);
  if (!content) continue;

  const lines = content.split('\n');
  const fmStart = lines.indexOf('---');
  const fmEnd = lines.indexOf('---', fmStart + 1);

  if (fmStart === -1 || fmEnd === -1 || fmStart === fmEnd) {
    errors.push(`${docPath}: Missing YAML frontmatter (--- delimiters)`);
    continue;
  }

  const frontmatter = lines.slice(fmStart + 1, fmEnd).join('\n');
  for (const field of REQUIRED_FRONTMATTER_FIELDS) {
    if (!frontmatter.includes(`${field}:`)) {
      errors.push(`${docPath}: Missing frontmatter field: ${field}`);
    }
  }

  // Freshness check
  const verifiedMatch = frontmatter.match(/Last Verified:\s*(\d{4}-\d{2}-\d{2})/);
  if (verifiedMatch) {
    const verifiedDate = new Date(verifiedMatch[1]);
    const now = new Date();
    const daysSince = Math.floor((now - verifiedDate) / (1000 * 60 * 60 * 24));
    if (daysSince > DOC_FRESHNESS_THRESHOLD_DAYS) {
      warnings.push(`${docPath}: Last Verified ${verifiedMatch[1]} is ${daysSince} days ago (threshold: ${DOC_FRESHNESS_THRESHOLD_DAYS})`);
    }
  }
}

// 3. Check local link integrity for doc/* references
for (const docPath of REQUIRED_DOCS) {
  const fullPath = resolve(ROOT, docPath);
  const content = readCached(fullPath);
  if (!content) continue;

  const linkPattern = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = linkPattern.exec(content)) !== null) {
    const linkTarget = match[2];
    if (linkTarget.startsWith('http') || linkTarget.startsWith('#') || linkTarget.startsWith('/')) {
      continue;
    }
    const docDir = dirname(fullPath);
    const targetPath = resolve(docDir, linkTarget.split('#')[0]);
    if (!existsSync(targetPath)) {
      errors.push(`${docPath}: Broken local link: [${match[1]}](${linkTarget})`);
    }
  }
}

// Report
if (warnings.length > 0) {
  console.warn('Documentation freshness warnings:\n');
  for (const w of warnings) {
    console.warn(`  ! ${w}`);
  }
  console.warn('');
}

if (errors.length > 0) {
  console.error('Documentation lint FAILED:\n');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  console.error(`\n${errors.length} error(s) found.`);
  process.exit(1);
} else {
  console.log('Documentation lint PASSED');
  console.log(`  - ${REQUIRED_DOCS.length} required docs verified`);
  console.log(`  - All frontmatter fields present`);
  console.log(`  - All local links valid`);
  if (warnings.length > 0) {
    console.log(`  - ${warnings.length} freshness warning(s) (non-blocking)`);
  }
  process.exit(0);
}
