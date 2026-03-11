# Phase 5 Summary: Risk-Tiered Merge Policy

## Completed
- Created doc/MERGE_POLICY.md with:
  - High/medium/low risk path classification tables
  - Review requirements per tier (2 reviewers for high, 1 for medium/low)
  - Fast lane rules for low-risk PRs
  - Manual override via risk labels
  - Merge statistics to track
- Updated .github/workflows/pr-policy.yml with risk classification step
  - Classifies PRs based on changed paths against high/medium/low patterns
  - Outputs GitHub warnings/notices with classification
- Added doc/MERGE_POLICY.md to docs:lint required docs

## Verification
- pnpm docs:lint passes with 8 required docs
- PR policy workflow classifies risk tier based on changed paths

## Files Changed
- Created: doc/MERGE_POLICY.md
- Modified: .github/workflows/pr-policy.yml, scripts/docs-lint.mjs
