---
Owner: Engineering
Last Verified: 2026-03-11
Applies To: paperclip monorepo
Links: [QUALITY_SCORE](QUALITY_SCORE.md), [HARNESS_SCORECARD](HARNESS_SCORECARD.md)
---

# Cleanup Policy

Continuous entropy reduction with bounded scope and safe rollback.

## What Qualifies as Entropy

1. **Unused code** — exports, functions, or components with zero consumers
2. **Stale docs** — broken links, outdated references, missing owners
3. **Dead configs** — unused env vars, orphaned workflow steps, stale feature flags
4. **Duplicate tests** — tests covering identical behavior in multiple files
5. **Orphaned types** — TypeScript types/interfaces exported but never imported

## Weekly Cleanup Budget

- Max 1 cleanup PR per week
- Max 200 lines changed per cleanup PR
- Must not touch high-risk paths (auth, company-scoping, approvals, budgets)
- Must include rollback plan (revert commit or feature flag)

## Cleanup PR Requirements

1. Title prefixed with `cleanup:`
2. Each removed item justified with evidence (e.g., "zero imports found via grep")
3. All existing tests must continue to pass
4. No behavioral changes — cleanup PRs are refactor-only

## Rollback Expectations

- Every cleanup PR must be independently revertable
- If a cleanup PR causes a regression, revert first, investigate second
- Cleanup PRs should not be combined with feature work

## Entropy Scan

Run the entropy detection scripts:

```sh
pnpm entropy:scan
```

This produces a machine-readable JSON report of cleanup candidates.
