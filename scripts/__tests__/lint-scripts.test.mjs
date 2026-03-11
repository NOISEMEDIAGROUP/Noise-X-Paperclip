/**
 * Unit tests for harness engineering lint scripts.
 * Run with: node --test scripts/__tests__/lint-scripts.test.mjs
 */
import { execFileSync } from 'child_process';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '../..');

// Helper: run script, return { code, stdout, stderr }
function run(script, args = [], opts = {}) {
  try {
    const stdout = execFileSync('node', [resolve(ROOT, script), ...args], {
      cwd: ROOT, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
      ...opts,
    });
    return { code: 0, stdout, stderr: '' };
  } catch (e) {
    return { code: e.status ?? 1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

describe('harness-scorecard.mjs', () => {
  it('passes on valid scorecard', () => {
    const r = run('scripts/harness-scorecard.mjs');
    assert.equal(r.code, 0);
    assert.match(r.stdout, /PASSED/);
  });
});

describe('docs-lint.mjs', () => {
  it('passes on current docs', () => {
    const r = run('scripts/docs-lint.mjs');
    assert.equal(r.code, 0);
    assert.match(r.stdout, /PASSED/);
  });
});

describe('arch-lint.mjs', () => {
  it('passes on current codebase', () => {
    const r = run('scripts/arch-lint.mjs');
    assert.equal(r.code, 0);
    assert.match(r.stdout, /PASSED/);
  });
});

describe('check-pr-evidence.mjs', () => {
  it('passes with all required sections', () => {
    const body = `## Scope\nChanged X\n## Verification\ntypecheck pass, test:run pass, build pass\n## Contract Sync\nN/A\n## Risks\nNone`;
    const r = run('scripts/check-pr-evidence.mjs', [], {
      input: body, stdio: ['pipe', 'pipe', 'pipe'],
    });
    // execFileSync with input needs different approach
    try {
      const stdout = execFileSync('node', [resolve(ROOT, 'scripts/check-pr-evidence.mjs')], {
        cwd: ROOT, encoding: 'utf-8', input: body, stdio: ['pipe', 'pipe', 'pipe'],
      });
      assert.match(stdout, /PASSED/);
    } catch (e) {
      assert.fail(`Should pass but got: ${e.stderr}`);
    }
  });

  it('fails with missing sections', () => {
    const body = `Just some text without sections`;
    try {
      execFileSync('node', [resolve(ROOT, 'scripts/check-pr-evidence.mjs')], {
        cwd: ROOT, encoding: 'utf-8', input: body, stdio: ['pipe', 'pipe', 'pipe'],
      });
      assert.fail('Should have failed');
    } catch (e) {
      assert.equal(e.status, 1);
      assert.match(e.stderr, /Missing required section/);
    }
  });

  it('fails with empty Verification section', () => {
    const body = `## Scope\nChanged X\n## Verification\n## Contract Sync\nN/A\n## Risks\nNone`;
    try {
      execFileSync('node', [resolve(ROOT, 'scripts/check-pr-evidence.mjs')], {
        cwd: ROOT, encoding: 'utf-8', input: body, stdio: ['pipe', 'pipe', 'pipe'],
      });
      assert.fail('Should have failed');
    } catch (e) {
      assert.equal(e.status, 1);
      assert.match(e.stderr, /empty/i);
    }
  });

  it('fails when Verification missing typecheck reference', () => {
    const body = `## Scope\nChanged X\n## Verification\ntest:run pass, build pass\n## Contract Sync\nN/A\n## Risks\nNone`;
    try {
      execFileSync('node', [resolve(ROOT, 'scripts/check-pr-evidence.mjs')], {
        cwd: ROOT, encoding: 'utf-8', input: body, stdio: ['pipe', 'pipe', 'pipe'],
      });
      assert.fail('Should have failed');
    } catch (e) {
      assert.equal(e.status, 1);
      assert.match(e.stderr, /typecheck/);
    }
  });

  it('shows help with --help', () => {
    const r = run('scripts/check-pr-evidence.mjs', ['--help']);
    assert.equal(r.code, 0);
    assert.match(r.stdout, /Usage/);
  });
});

describe('entropy scripts', () => {
  it('find-stale-doc-links outputs JSON', () => {
    const r = run('scripts/entropy/find-stale-doc-links.mjs');
    const parsed = JSON.parse(r.stdout);
    assert.equal(parsed.type, 'stale-doc-links');
    assert.equal(typeof parsed.count, 'number');
  });

  it('find-untested-routes outputs JSON', () => {
    const r = run('scripts/entropy/find-untested-routes.mjs');
    const parsed = JSON.parse(r.stdout);
    assert.equal(parsed.type, 'untested-routes');
    assert.equal(typeof parsed.count, 'number');
  });

  it('find-orphaned-types outputs JSON', () => {
    const r = run('scripts/entropy/find-orphaned-types.mjs');
    const parsed = JSON.parse(r.stdout);
    assert.equal(parsed.type, 'orphaned-types');
    assert.equal(typeof parsed.count, 'number');
  });
});
