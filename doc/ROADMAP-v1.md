# Paperclip V1 Roadmap (Product)

Status: working product roadmap derived from `doc/GOAL.md`, `doc/PRODUCT.md`, and `doc/SPEC-implementation.md`  
Last updated: 2026-03-10

## Strategy (What We Are Building)

Paperclip is the control plane for autonomous AI companies.
V1 success is: one board operator can run a small AI-native company end-to-end with visibility, governance, and cost control.

### Target Users (V1)

- Board operator (single human): creates companies, sets goals, manages org + budgets, approves governed actions, intervenes when needed.
- Agent executors (AI agents): pick up assigned issues, do work, report status/costs, and leave an auditable trail via comments/activity.
- Agent integrator (developer): configures adapters, auth, and runtime so agents can reliably execute heartbeats.

### Product Principles (V1)

- Company is first-order: every record is company-scoped; boundaries are enforced.
- Control plane, not execution plane: Paperclip orchestrates; agents run elsewhere.
- Single assignee + atomic checkout: `in_progress` is conflict-safe.
- Governance is explicit: approvals gates for hires and CEO strategy; board override exists.
- Costs are enforceable: spend is reported and budgets can stop work.
- Auditability: every mutation is visible and attributable.

## Roadmap (Milestones -> Outcomes)

This is the V1 delivery plan, translated into product outcomes, requirements, and exit criteria.

### Milestone 1: Company Core and Auth

Outcome: multi-company control plane with correct access boundaries for board + agents.

Requirements:

- Company lifecycle: create/list/get/update/archive.
- Company scoping applied to existing entities and API paths.
- Auth modes: board sessions (mode-dependent) and agent API keys.

Exit criteria:

- Board can create multiple companies and switch context.
- Agent key cannot access other companies.
- Existing UI/API flows work under company-scoped routes.

Key risks:

- Leaky scoping or mixed identifiers leading to cross-company reads/writes.

### Milestone 2: Task and Governance Semantics

Outcome: work can be created, assigned, safely claimed, and governed.

Requirements:

- Issues (tasks): hierarchical parent/child, status machine, lifecycle guards.
- Atomic checkout endpoint: concurrent claims return `409`.
- Issue comments: auditable communication channel for board and agents.
- Approvals: hire approval + CEO strategy approval flows (create, approve, reject, resubmit).

Exit criteria:

- Checkout race tests pass; `in_progress` requires assignee + checkout.
- Board can approve/reject in UI; activity log records decisions.

Key risks:

- Partial state transitions that break invariants (e.g., `in_progress` without assignee).

### Milestone 3: Heartbeat and Adapter Runtime

Outcome: agents can be invoked, run, cancelled, and observed reliably.

Requirements:

- Adapter interface: contract for invocation + context delivery.
- `process` adapter: run command, capture status, support cancellation.
- `http` adapter: wake external agent, timeouts and error handling.
- Heartbeat runs persisted, visible, cancellable; stuck run detection starts.

Exit criteria:

- Company can run at least one heartbeat-enabled agent continuously.
- Cancellation works end-to-end for `process` adapter; failures are surfaced.

Key risks:

- “Ghost runs” (running processes without control-plane visibility) or unreliable cancel semantics.

### Milestone 4: Cost and Budget Controls

Outcome: spend is measurable, attributable, and enforceable (hard stop).

Requirements:

- Cost event ingestion API for agents.
- Monthly UTC rollups at agent/task/project/company levels.
- Budget settings and enforcement: soft alerts + hard limit auto-pause.

Exit criteria:

- Hard budget stop test passes; paused agents cannot start new invocations.
- Dashboard summaries match DB rollups.

Key risks:

- Inconsistent rollups or delayed enforcement that lets spend exceed limits materially.

### Milestone 5: Board UI Completion

Outcome: board operator can run the company from UI without needing API tooling.

Requirements:

- Company selector + org chart view.
- Approvals pages and cost pages.
- Operational dashboard: heartbeats, stuck runs, stale task surfacing.

Exit criteria:

- Board can: create company, create agents, assign issues, review runs, approve actions, and manage budgets from UI.

Key risks:

- UX gaps that force operators into API usage for core flows.

### Milestone 6: Hardening and Release

Outcome: shippable V1 with quality gates, templates, and docs.

Requirements:

- Integration/e2e suite (minimum regression suite).
- Seed/demo company templates for local testing.
- Release checklist and docs updates.

Exit criteria (Release Gate):

- All acceptance criteria in `doc/SPEC-implementation.md` pass.
- Default dev mode runs with embedded Postgres; external Postgres works via `DATABASE_URL`.

## PRD-Level Requirements (V1)

This section is a compact PRD-style checklist of what “done” means at the feature level.

### Company & Tenancy

- Every entity is company-scoped and checked server-side.
- Company status gates behavior (e.g., archived is read-only or hidden per spec).

### Agents & Org

- Agents form a strict tree (single manager, no cycles).
- Agent status machine: paused/idle/running/error/terminated semantics are consistent across UI and API.
- Adapter config is stored and auditable; V1 supports `process` and `http`.

### Tasks (Issues)

- Issue states: `backlog | todo | in_progress | in_review | done | blocked | cancelled`.
- Single assignee model; `in_progress` requires assignee + checkout.
- Atomic checkout semantics and conflict-safe transitions.
- Comments are the canonical communication channel (no separate chat).

### Governance (Approvals)

- Hire approval flow blocks governed creation until approved.
- CEO strategy approval flow supports propose/approve/reject/resubmit with audit trail.
- Board override capabilities are explicit and logged.

### Heartbeats

- Heartbeat runs are persisted with status, timestamps, and linkage to issue(s) where relevant.
- Runs can be cancelled; cancellation is observable and reliable.
- Stuck runs and stale tasks are surfaced (no silent self-healing in V1).

### Cost & Budgets

- Agents can post cost events using API keys.
- Rollups are queryable and shown in dashboard.
- Hard budget limit pauses agents and blocks new invocations until resolved.

### Auditability & Ops

- Every mutation writes an activity log entry with actor attribution.
- Operational dashboard provides “at a glance” status: who is running, what they’re doing, and what it costs.

## Metrics (V1)

Leading indicators:

- Time-to-first-company (create company + first agent + first heartbeat run).
- % of tasks with valid goal trace (goal/project/parent chain).
- Checkout conflict rate and recovery time when collisions happen.
- Budget enforcement: time from threshold breach to pause.

Success criteria:

- A small autonomous company can run continuously under board supervision with clear control and audit trails.

