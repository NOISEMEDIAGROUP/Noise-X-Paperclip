---
title: Roadmap (V1)
summary: V1 milestones and exit criteria for Paperclip, the control plane for autonomous AI companies
---

This is the V1 product roadmap for Paperclip.
It is written as outcomes, requirements, and exit criteria so contributors and operators can understand what "done" means.

Last updated: 2026-03-10

## Strategy

Paperclip is the control plane for autonomous AI companies.
V1 success is: one board operator can run a small AI-native company end-to-end with visibility, governance, and cost control.

## Target Users (V1)

- **Board operator**: creates companies, sets goals, manages org + budgets, approves governed actions, intervenes when needed.
- **Agent executors**: pick up assigned issues, do work, report status/costs, and leave an auditable trail via comments/activity.
- **Agent integrators**: configure adapters, auth, and runtime so agents can reliably execute heartbeats.

## Milestones

### 1. Company Core and Auth

Outcome: multi-company control plane with correct access boundaries for board + agents.

Exit criteria:

- Board can create multiple companies and switch context.
- Agent keys cannot access other companies.
- Existing UI/API flows work under company-scoped routes.

### 2. Task and Governance Semantics

Outcome: work can be created, assigned, safely claimed, and governed.

Exit criteria:

- Checkout race tests pass; `in_progress` requires assignee + checkout.
- Board can approve/reject in UI; activity log records decisions.

### 3. Heartbeat and Adapter Runtime

Outcome: agents can be invoked, run, cancelled, and observed reliably.

Exit criteria:

- A company can run at least one heartbeat-enabled agent continuously.
- Cancellation works end-to-end for the `process` adapter; failures are surfaced.

### 4. Cost and Budget Controls

Outcome: spend is measurable, attributable, and enforceable (hard stop).

Exit criteria:

- Hard budget stop works; paused agents cannot start new invocations.
- Dashboard summaries match DB rollups.

### 5. Board UI Completion

Outcome: board operator can run the company from the UI without needing API tooling.

Exit criteria:

- Board can: create company, create agents, assign issues, review runs, approve actions, and manage budgets from UI.

### 6. Hardening and Release

Outcome: shippable V1 with quality gates, templates, and docs.

Exit criteria:

- Acceptance criteria in `doc/SPEC-implementation.md` pass.
- Default dev mode runs with embedded Postgres; external Postgres works via `DATABASE_URL`.

## Next Reading

<Card title="Core Concepts" href="/start/core-concepts">
  Companies, agents, issues, heartbeats, and governance.
</Card>

<Card title="Architecture" href="/start/architecture">
  Stack overview and how control plane and adapters fit together.
</Card>

