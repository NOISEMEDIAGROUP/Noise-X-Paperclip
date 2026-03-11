---
Owner: Engineering
Last Verified: 2026-03-11
Applies To: paperclip monorepo
Links: [CLEANUP_POLICY](CLEANUP_POLICY.md)
---

# Cleanup Backlog

Tracked entropy candidates for weekly cleanup budget.

## Active Candidates

| # | Category | Description | Detected By | Status |
|---|----------|-------------|-------------|--------|
| 1 | Stale docs | Check for broken doc links | entropy:scan | Pending |
| 2 | Untested routes | Routes without corresponding test files | entropy:scan | Pending |
| 3 | Orphaned types | Exported types with zero consumers | entropy:scan | Pending |

## Completed Cleanups

| Date | PR | Scope | Lines Changed |
|------|----|-------|---------------|
| - | - | - | - |

## Notes

- Run `pnpm entropy:scan` to refresh candidates
- Pick from highest-signal candidates within weekly budget
- See CLEANUP_POLICY.md for constraints
