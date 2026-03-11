---
Owner: Engineering
Last Verified: 2026-03-11
Applies To: paperclip monorepo
Links: [HARNESS_SCORECARD](HARNESS_SCORECARD.md), [DEVELOPING](DEVELOPING.md)
---

# Quality Score

Quality KPIs and target thresholds for the Paperclip monorepo.

## KPIs

| KPI | Current | Target | Measurement |
|-----|---------|--------|-------------|
| CI pass rate (first attempt) | Unmeasured | >=95% | GitHub Actions workflow success rate |
| Typecheck clean | Yes | Yes | `pnpm -r typecheck` exits 0 |
| Test suite passing | Yes | Yes | `pnpm test:run` exits 0 |
| Build succeeds | Yes | Yes | `pnpm build` exits 0 |
| Doc freshness compliance | Unmeasured | >=90% | docs:lint checks required docs exist with valid frontmatter |
| Contract sync coverage | Partial | 100% | Shared validators used for all API request bodies |
| PR evidence completeness | Unmeasured | >=80% | pr:evidence:check pass rate |
| Median PR cycle time | Unmeasured | <24h (low-risk) | GitHub PR analytics by risk tier |

## Quality Gates

Every PR must pass before merge:

1. `pnpm -r typecheck`
2. `pnpm test:run`
3. `pnpm build`

Additional gates added incrementally:
- `pnpm docs:lint` (Phase 2)
- `pnpm arch:lint` (Phase 3)
- `pnpm pr:evidence:check` (Phase 6)

## Regression Policy

- No new test failures introduced by a PR
- No typecheck regressions
- No build regressions
- Flaky tests must be fixed or quarantined within one sprint
