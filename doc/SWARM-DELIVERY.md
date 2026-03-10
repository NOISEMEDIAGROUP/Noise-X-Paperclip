# Swarm Delivery Playbook

This playbook standardizes multi-agent delivery for Paperclip while preserving company-scope invariants and contract sync requirements.

## Scope

Use this playbook when work spans multiple subsystems (`server`, `ui`, `cli`, `packages/db`, `packages/shared`, deployment).

It provides an end-to-end flow for:

1. Analysis
2. Planning
3. Task split / assignment
4. Aggregation
5. Integration
6. Testing
7. Delivery

## Runtime Model

Swarm delivery uses one leader and multiple worker agents.

- Leader (`architect-lead`): owns scope, sequencing, risk gates, final sign-off.
- `security-reviewer`: validates auth, tenant boundaries, secrets, and API abuse risks.
- `backend-executor`: server routes/services/middleware and API contracts.
- `frontend-executor`: UI pages, API client behavior, UX error handling.
- `data-executor`: schema/migration/shared contract synchronization.
- `qa-release`: verification matrix, build outputs, release checklist.

Recommended when `tmux` + `omx` are available:

```sh
omx team 5:executor "<goal statement>"
```

If runtime orchestration is unavailable, use this repo's file-based swarm workflow (`scripts/swarm/*`) as a deterministic fallback.

## Artifact Contract

Each swarm run has a unique `run_id` and runtime workspace:

- `.paperclip-local/swarm/<run_id>/`

Required artifacts:

- `analysis.md`
- `plan.md`
- `task-board.yaml`
- `reports/aggregation.md`
- `reports/integration-report.md`
- `reports/verification.md`
- `reports/delivery-summary.md`
- `release-checklist.md`

## Phase Gates

### 1) Analysis

Entry:

- Goal statement exists.
- Current system surface is identified.

Exit:

- `analysis.md` captures topology, trust boundaries, auth/data flows, API contracts, coupling, and migration safety.

### 2) Planning

Entry:

- Analysis approved by leader.

Exit:

- `plan.md` includes milestones, dependencies, rollback path, acceptance criteria.

### 3) Split / Assignment

Entry:

- Plan milestones can be parallelized.

Exit:

- `task-board.yaml` assigns each task to one owner agent with dependencies and acceptance checks.
- Per-agent inbox files are generated.

### 4) Execution + Aggregation

Entry:

- Owners accepted tasks.

Exit:

- Agent outputs are collected into `reports/aggregation.md`.
- Every task has implementation evidence or explicit blocker.

### 5) Integration

Entry:

- Individual outputs merged into integration branch/working tree.

Exit:

- `reports/integration-report.md` lists touched surfaces and contract-sync checks across:
  - `packages/db`
  - `packages/shared`
  - `server`
  - `ui`

### 6) Testing

Entry:

- Integration report has no unresolved blockers.

Exit:

- `reports/verification.md` records command-level results and pass/fail state.
- Minimum expected checks:

```sh
pnpm -r typecheck
pnpm test:run
pnpm build
```

(If environment constraints prevent full tests, include exact failing command and reason.)

### 7) Delivery

Entry:

- Verification complete.

Exit:

- `release-checklist.md` completed.
- `reports/delivery-summary.md` finalized with risks, rollback path, and ship/no-ship decision.

## Risk Register (Mandatory)

Every swarm run must score and document:

- Data damage risk
- Privilege escalation risk
- Performance regression risk
- Deployment rollback risk

Use `Low/Medium/High` and include mitigation plus owner.

## Command Workflow

```sh
pnpm swarm:init [run_id]
pnpm swarm:split [run_id]
# agents execute and write reports
pnpm swarm:collect [run_id]
pnpm swarm:integrate [run_id]
pnpm swarm:verify [run_id] [--full]
pnpm swarm:deliver [run_id]
```

`run_id` can be omitted to auto-select the latest run.
