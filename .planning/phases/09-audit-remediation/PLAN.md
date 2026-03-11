# Phase 09 Plan: Audit Remediation — Bring Score to 100

Fix all 20 findings from audit_harness_engineering.txt.

## Tasks

### Batch 1 — P0 Critical & Quick Fixes
1. F-006: Make PR evidence check blocking in CI (pr-policy.yml)
2. F-003: Fix entropy:scan exit code masking (package.json)
3. F-002: Fix execSync injection in find-orphaned-types.mjs
4. F-004: Add empty Verification section check (check-pr-evidence.mjs)
5. F-012: Add trailing newline to .gitignore

### Batch 2 — P1 Fixes
6. F-010: Fix brittle logActivity regex (mutation-activity-log-contract.test.ts)
7. F-005: Add `wait` after process substitution (run-agent-task.sh)
8. F-017: Use jq for JSON generation (run-agent-task.sh)
9. F-007: Remove test duplication (agent-auth + company-scope)
10. F-015: Rename misleading test name (issue-transition-guard)
11. F-013: Fix naive route/test matching (find-untested-routes.mjs)

### Batch 3 — Improvements
12. F-011: Fix process.cwd() → git root in all lint scripts
13. F-008/F-009: Extract shared harness config
14. F-001/F-020: Improve arch-lint (dynamic imports, re-exports, adapters path)
15. F-018: Add doc freshness check
16. F-019: Fail-safe risk classification (empty diff → high)
17. F-014: Parametrize artifact paths in collect-artifacts.sh
18. F-016: Add unit tests for all lint scripts
