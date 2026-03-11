# Phase 09 Summary: Audit Remediation

## Fixed (20 findings)

### Critical
- F-006: PR evidence check now blocking in CI (removed `|| echo` advisory fallback)

### Major
- F-001/F-020: arch-lint rewritten with specifier extraction (dynamic import, re-export, export-from); adapters scans src/ subdirs
- F-002: find-orphaned-types uses execFileSync with -F (no shell injection)
- F-003: entropy:scan uses && instead of ; (proper exit code propagation)
- F-004: Empty Verification section now caught as error
- F-005: Added `wait` after process substitution in run-agent-task.sh
- F-007: Removed test duplication; extracted fakeReq to shared helper
- F-010: logActivity regex loosened to `/logActivity\s*\(/`
- F-011: All scripts use shared ROOT from git rev-parse via harness.config.mjs
- F-016: Added 11 unit tests for lint scripts (node:test)

### Minor
- F-008/F-009: Extracted shared harness.config.mjs (single source of truth)
- F-012: .gitignore ends with newline
- F-013: find-untested-routes uses exact route/test matching
- F-014: collect-artifacts.sh paths configurable via env vars
- F-015: Renamed misleading test to "in_progress status exists for checkout workflow"
- F-017: metadata.json generated via jq with proper escaping (heredoc fallback)
- F-018: docs-lint now checks Last Verified freshness (90-day threshold, warning)
- F-019: Fail-safe risk classification step (empty tier → high)

## New Files
- scripts/harness.config.mjs — shared configuration
- scripts/__tests__/lint-scripts.test.mjs — 11 unit tests
- server/src/__tests__/helpers/fakeReq.ts — shared test helper
