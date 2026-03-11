# Phase 2 Summary: Repository Knowledge as System of Record

## Completed
- Created doc/ARCHITECTURE.md: bounded contexts, layer boundaries, dependency directions, key invariants
- Created doc/QUALITY_SCORE.md: KPIs, quality gates, regression policy
- Created doc/RELIABILITY.md: SLOs for issue checkout, heartbeat, approvals, budget, activity logging
- Created doc/SECURITY.md: auth model, company-scoping rules, mutation audit requirements, sensitive paths
- Created doc/DECISIONS/0001-harness-engineering-adoption.md: ADR for the adoption plan
- All docs have YAML frontmatter (Owner, Last Verified, Applies To, Links)
- Created scripts/docs-lint.mjs: validates existence, frontmatter, local link integrity
- Added pnpm docs:lint to package.json
- Added docs:lint CI step in pr-verify.yml before typecheck

## Verification
- pnpm docs:lint passes with all 6 required docs, frontmatter, and links validated

## Files Changed
- Created: doc/ARCHITECTURE.md, doc/QUALITY_SCORE.md, doc/RELIABILITY.md, doc/SECURITY.md
- Created: doc/DECISIONS/0001-harness-engineering-adoption.md
- Created: scripts/docs-lint.mjs
- Modified: package.json, .github/workflows/pr-verify.yml
