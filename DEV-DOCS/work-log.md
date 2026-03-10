# Work Log

## 2026-03-10

### Session: roadmap, health, and manager-governance implementation

- Extended the `goals` model into the operator-facing roadmap surface:
  - added `planningHorizon`, `sortOrder`, and `guidance`
  - added roadmap alias routes while preserving goal compatibility
  - renamed the UI surface from Goals to Roadmap
- Added system-health diagnostics:
  - new subsystem health service
  - `GET /api/health/subsystems`
  - dashboard `System Health` section
- Added manager planning governance:
  - company default planning mode
  - agent override planning mode
  - resolved planning mode in agent reads
  - `approve_manager_plan`
  - top-level issue creation enforcement with `approvalId`
- Added focused automated coverage for:
  - subsystem health service and route
  - roadmap alias routes
  - approval-required issue creation
  - manager-plan approval wakeups
  - manager planning mode resolution
  - roadmap/health/planning-mode UI rendering
- Refreshed DEV-DOCS and added a detailed architecture document grounded in the current code.
- Re-ran:
  - `pnpm -r typecheck`
  - `pnpm test:run`
  - `pnpm build`

### Session: development-first CI alignment

- Updated GitHub Actions to match the intended branch model:
  - PR policy now runs for `development` and `master`
  - PR verification now runs for `development` and `master`
  - lockfile refresh moved from `master` pushes to `development` pushes
- Preserved the lockfile policy for promotion PRs:
  - manual `pnpm-lock.yaml` edits are still blocked
  - `development` -> `master` promotion PRs may carry the CI-owned lockfile update
- Updated `doc/DEVELOPING.md` and the DEV-DOCS operational spine so the branch/CI contract is explicit instead of implied.
- Re-ran:
  - `pnpm -r typecheck`
  - `pnpm test:run`
  - `pnpm build`

## 2026-03-09

### Session: executive-layer status and sprint baseline

- Verified the repo state on `development` after the merged executive briefings work.
- Documented the current shipped product shape:
  - telemetry dashboard
  - executive board
  - durable plans/results
  - record detail and promotion flows
- Added the missing DEV-DOCS operational spine so the next sprint work has a trustworthy status ledger.
- Marked the roadmap truthfully:
  - Phase 1 shipped
  - Phases 2, 4, and 5 partial
  - Phase 3 not started

### Session: all-phases sprint implementation

- Added shared/data-model contracts for:
  - briefing schedules
  - knowledge entries
  - project milestones
  - workspace checkouts
- Added backend APIs and services for:
  - schedule CRUD
  - schedule execution
  - knowledge publication
  - portfolio summaries
  - milestone CRUD
- Added UI surfaces for:
  - briefing library
  - portfolio board
  - knowledge library
  - briefing detail generation/schedule controls
- Added repo-backed workspace checkout resolution in heartbeat execution.
- Surfaced workspace metadata into run and issue detail pages.
- Improved issue-level and portfolio-level cost truthfulness messaging for unpriced usage.
- Re-ran:
  - `pnpm -r typecheck`
  - `pnpm test:run`
  - `pnpm build`

### Session: QA hardening and sprint verification

- Fixed the process adapter so repo-backed issue runs execute in the resolved checkout cwd instead of falling back to stale config cwd.
- Persisted enriched `paperclipWorkspace` context back onto heartbeat runs so issue detail and run detail can show the real checkout path and branch after the run completes.
- Fixed company route handling for `/knowledge`.
- Fixed record detail so schedule controls do not flash misleading default values before the saved schedule loads.
- Extended cost truthfulness into the dedicated `Costs` page and agent run cost rows.
- Added focused automated coverage for:
  - process adapter workspace cwd/env propagation
  - record schedule routes
  - cost pricing-state aggregation
  - company route handling for `/knowledge`
- Completed browser QA against:
  - briefing board
  - briefing library
  - plans/results libraries
  - portfolio board
  - knowledge library
  - issue detail
  - approval detail
  - agent run detail
- Final verification passed:
  - `pnpm -r typecheck`
  - `pnpm test:run`
  - `pnpm build`

### Session: checkout lifecycle follow-through

- Added a logical checkout release boundary in `issues.ts`.
- Active workspace checkout rows now transition to `released` when an issue:
  - leaves `in_progress`
  - changes assignee
  - is explicitly released back to `todo`
- Added focused unit coverage for the release-decision helper.
- Re-ran focused verification:
  - `pnpm --filter @paperclipai/server typecheck`
  - `pnpm vitest run server/src/__tests__/issues-user-context.test.ts server/src/__tests__/costs-service.test.ts server/src/__tests__/process-adapter-workspace.test.ts`
