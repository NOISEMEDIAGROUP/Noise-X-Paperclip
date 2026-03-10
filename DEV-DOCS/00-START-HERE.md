# Start Here

Last updated: 2026-03-10

## Current focus

Paperclip has already shipped the executive-layer sprint and now includes the next operational governance layer:

- `/roadmap` as the operator-facing strategy surface (backed by the existing `goals` model)
- dashboard `System Health` diagnostics
- company-level and agent-level manager planning modes
- approval-gated top-level manager issue creation via `approve_manager_plan`
- durable `records`, schedules, milestones, knowledge publication, and checkout-aware execution flows

## Current branch

- Working branch: `development`
- Integration branch: `development`

## Immediate priorities

1. Keep `DEV-DOCS/` aligned with the roadmap/health/governance implementation.
2. Preserve the compatibility contract:
   - internal `goals` persistence
   - operator-facing `Roadmap` language
3. Keep manager governance rules easy to audit in code reviews.
4. End with full verification:
   - `pnpm -r typecheck`
   - `pnpm test:run`
   - `pnpm build`

## Important current truths

- `/dashboard` is still the operator telemetry page, but it now also surfaces instance-level subsystem health.
- The old Goals tab is now the Roadmap surface.
- Managers resolve planning mode from company default plus optional agent override.
- Approval-required managers must attach an approved `approvalId` when creating top-level issues.
- `development` is the active integration branch in this workspace.

## Read next

1. `DEV-DOCS/DEVELOPMENT-STATUS.md`
2. `DEV-DOCS/01-task-list.md`
3. `DEV-DOCS/ARCHITECTURE.md`
