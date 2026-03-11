---
Owner: Engineering
Last Verified: 2026-03-11
Applies To: paperclip monorepo
Links: [SECURITY](SECURITY.md), [ARCHITECTURE](ARCHITECTURE.md), [QUALITY_SCORE](QUALITY_SCORE.md)
---

# Merge Policy

Risk-tiered merge lanes for higher safe throughput.

## Risk Taxonomy

PRs are classified by the paths they touch:

### High Risk

Require elevated review. Changes to auth, company scoping, governance state machines, financial controls, or data model.

| Path Pattern | Reason |
|-------------|--------|
| `server/src/routes/auth*` | Authentication logic |
| `server/src/services/auth*` | Auth service layer |
| `server/src/routes/access*` | Access control |
| `server/src/services/access*` | Access service |
| `server/src/routes/authz*` | Authorization helpers |
| `server/src/routes/companies*` | Company boundary enforcement |
| `server/src/services/companies*` | Company service |
| `server/src/services/approval*` | Governance state machine |
| `server/src/routes/approvals*` | Approval routes |
| `server/src/services/budget*` | Financial controls |
| `server/src/services/costs*` | Cost tracking |
| `server/src/routes/costs*` | Cost routes |
| `server/src/routes/issues-checkout*` | Atomic checkout invariant |
| `server/src/services/issues*` | Issue service (checkout logic) |
| `packages/db/src/schema/*` | Data model changes |
| `packages/db/src/migrations/*` | Database migrations |
| `.github/workflows/*` | CI/CD pipeline |
| `.env*` | Secrets and configuration |

### Medium Risk

Standard review. Changes to API surface, shared contracts, or UI logic.

| Path Pattern | Reason |
|-------------|--------|
| `server/src/routes/*` | API surface (non-auth routes) |
| `server/src/services/*` | Business logic (non-auth services) |
| `packages/shared/*` | Shared types and validators |
| `packages/adapters/*` | Agent execution adapters |
| `ui/src/*` | UI components and pages |

### Low Risk

Fast-lane eligible. Documentation, tests, scripts, configs.

| Path Pattern | Reason |
|-------------|--------|
| `doc/*` | Documentation |
| `*.md` | Markdown files |
| `*test*` | Test files |
| `scripts/*` | Build and utility scripts |
| `.planning/*` | Planning artifacts |
| `*.config.*` | Configuration files |

## Review Requirements

| Risk Tier | Min Reviewers | Auto-Merge Eligible | Notes |
|-----------|---------------|---------------------|-------|
| High | 2 | No | Requires explicit approval from code owner |
| Medium | 1 | No | Standard review process |
| Low | 1 | Yes (when all checks green) | Fast lane for safe throughput |

## Fast Lane Rules

A PR qualifies for fast lane when ALL of:
1. Classified as low-risk by changed paths
2. All CI checks pass (typecheck, test:run, build, docs:lint, arch:lint)
3. No merge conflicts
4. At least 1 approval

## Classification Override

Reviewers can manually escalate risk tier by adding labels:
- `risk:high` — force high-risk review process
- `risk:medium` — force medium-risk review
- `risk:low` — only if reviewer confirms scope is truly low-risk

## Merge Statistics

Track weekly:
- PR count by risk tier
- Median cycle time by tier
- Auto-merge rate for low-risk PRs
- High-risk policy violations caught
