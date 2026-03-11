/**
 * Shared configuration for harness engineering lint and enforcement scripts.
 * Single source of truth for required docs, route classifications, and lint rules.
 */
import { execSync } from 'child_process';
import { resolve } from 'path';

/** Repository root (works from any subdirectory or worktree). */
export const ROOT = (() => {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch {
    return process.cwd();
  }
})();

/** Required documentation files with frontmatter. */
export const REQUIRED_DOCS = [
  'doc/ARCHITECTURE.md',
  'doc/QUALITY_SCORE.md',
  'doc/RELIABILITY.md',
  'doc/SECURITY.md',
  'doc/HARNESS_SCORECARD.md',
  'doc/HARNESS_RUNBOOK.md',
  'doc/MERGE_POLICY.md',
  'doc/AGENT_PR_CONTRACT.md',
  'doc/DECISIONS/0001-harness-engineering-adoption.md',
];

/** Frontmatter fields required in every documentation file. */
export const REQUIRED_FRONTMATTER_FIELDS = [
  'Owner',
  'Last Verified',
  'Applies To',
  'Links',
];

/** Route files containing mutations — must have logActivity calls. */
export const MUTATION_ROUTE_FILES = [
  'issues.ts',
  'agents.ts',
  'approvals.ts',
  'companies.ts',
  'goals.ts',
  'projects.ts',
  'costs.ts',
  'secrets.ts',
];

/** Infrastructure/read-only route files — exempt from mutation logging. */
export const EXEMPT_ROUTE_FILES = [
  'index.ts',
  'health.ts',
  'authz.ts',
  'access.ts',
  'activity.ts',
  'assets.ts',
  'dashboard.ts',
  'issues-checkout-wakeup.ts',
  'llms.ts',
  'sidebar-badges.ts',
];

/** Route files to skip in untested-routes entropy scan. */
export const ROUTES_SKIP = ['index.ts', 'authz.ts'];

/** Architecture import boundary rules. */
export const ARCH_RULES = [
  {
    source: 'ui/src',
    forbidden: [
      { pattern: /@paperclipai\/db/, label: '@paperclipai/db' },
      { pattern: /from\s+['"]\.\.\/.*server/, label: 'server/ (relative)' },
      { pattern: /from\s+['"].*\/server\//, label: 'server/ (path)' },
    ],
    description: 'ui/ must not import from server/ or packages/db/',
  },
  {
    source: 'packages/shared/src',
    forbidden: [
      { pattern: /@paperclipai\/db/, label: '@paperclipai/db' },
      { pattern: /from\s+['"].*\/server\//, label: 'server/' },
      { pattern: /from\s+['"].*\/ui\//, label: 'ui/' },
    ],
    description: 'packages/shared/ must not import from server/, ui/, or packages/db/',
  },
  {
    source: 'packages/db/src',
    forbidden: [
      { pattern: /@paperclipai\/shared/, label: '@paperclipai/shared' },
      { pattern: /from\s+['"].*\/server\//, label: 'server/' },
      { pattern: /from\s+['"].*\/ui\//, label: 'ui/' },
    ],
    description: 'packages/db/ must not import from server/, ui/, or packages/shared/',
  },
  {
    source: 'packages/adapters',
    scanSubdirs: true,
    forbidden: [
      { pattern: /from\s+['"].*\/server\//, label: 'server/ (relative)' },
      { pattern: /from\s+['"].*\/ui\//, label: 'ui/' },
    ],
    description: 'packages/adapters/ must not import from server/ or ui/',
  },
];

/** Max days since "Last Verified" before a doc is considered stale. */
export const DOC_FRESHNESS_THRESHOLD_DAYS = 90;

/** Minimum number of harness scorecard parameters. */
export const MIN_SCORECARD_PARAMETERS = 11;

/** Scorecard required headings. */
export const SCORECARD_REQUIRED_HEADINGS = [
  '# Harness Engineering Scorecard',
  '## Parameters',
  '## Scoring Method',
  '## Update History',
  '## Quarterly Delta',
];

/** Scorecard required frontmatter fields. */
export const SCORECARD_REQUIRED_FRONTMATTER = [
  'Owner',
  'Last Verified',
  'Applies To',
  'Links',
  'Update Cadence',
];
