# Harness Engineering Adoption Plan (Paperclip)

Status: Proposed  
Date: 2026-03-11  
Owner: Server + UI + Platform  
Scope: `paperclip` monorepo V1 hardening and throughput uplift

## Goal

Raise harness-engineering maturity from the current baseline (~52/100) to >=85/100 overall, while bringing critical dimensions (legibility, architecture enforcement, autonomy safety, merge throughput) to >=90/100.

## Architecture

Paperclip already has strong control-plane invariants and CI fundamentals (`typecheck`, `test:run`, `build`). This plan adds a deterministic harness layer on top: repository knowledge contracts, mechanical architecture checks, artifact-rich autonomous execution, risk-tiered merge lanes, and continuous entropy cleanup. The result should be higher safe throughput without weakening company-scoping, auth boundaries, or governance semantics.

## Tech Stack

- TypeScript monorepo (`server`, `ui`, `packages/*`)
- GitHub Actions workflows under `.github/workflows/`
- Vitest + Playwright
- Existing docs under `doc/`

---

## 1. Baseline and Target Matrix

| Parameter from OpenAI harness engineering article | Baseline | Target | Definition of 100 |
|---|---:|---:|---|
| Start from empty repository (agent-first bootstrap) | 25 | 80 | Every new subsystem is scaffolded agent-first with tests/CI/docs in one controlled template flow. |
| Redefine engineer role (steer > hand-code) | 55 | 90 | Humans set intent/risk gates; agents execute end-to-end changes with explicit escalation policy. |
| Increase application legibility | 65 | 95 | Any change is reproducible by deterministic harness with standard logs, snapshots, and traces. |
| Repo knowledge as system of record | 70 | 95 | Core architecture/quality/reliability/security docs are mandatory, fresh, linked, and CI-enforced. |
| Agent legibility as explicit objective | 60 | 95 | Critical decisions and invariants are always encoded in repo docs/tests, not only in chat memory. |
| Enforce architecture and taste mechanically | 58 | 92 | Import boundaries, API contracts, and invariant checks fail CI on violations. |
| Throughput-driven merge philosophy | 45 | 90 | Risk-tiered merge lanes with fast path for low-risk, stricter gates for high-risk surfaces. |
| Clarify what “agent-generated” means | 35 | 88 | Agent-authored PRs include code + tests + docs + migration of affected contracts. |
| Increase autonomy levels | 40 | 85 | Single command can reproduce, fix, validate, and prepare merge-ready PR for scoped tasks. |
| Entropy and garbage collection | 52 | 90 | Scheduled cleanup agent continuously proposes safe refactors and stale-policy removals. |
| Institutionalize learning loop | 68 | 90 | Unknowns are tracked as experiments with metric, owner, due date, and decision outcome. |

## 2. Workstreams

1. Knowledge System of Record
2. Mechanical Architecture and Invariant Enforcement
3. Deterministic Agent Harness and Artifacts
4. Risk-Tiered Merge and Throughput Policy
5. Autonomy Ladder and Execution Contracts
6. Entropy Cleanup and Learning Cadence

## 3. Phase Plan (12 Weeks)

### Phase 0 (Week 1): Baseline Instrumentation and Scorecard

Objective: lock initial metrics so progress is measurable.

#### Task 0.1: Add harness scorecard document

**Files:**
- Create: `doc/HARNESS_SCORECARD.md`

**Implementation:**
1. Add current baseline table (11 parameters).
2. Define metric source for each parameter (CI, docs freshness, PR metadata, workflow stats).
3. Add update cadence (weekly) and owner field.

**Verification:**
- Manual review that all 11 parameters exist and each has measurable source.

#### Task 0.2: Add scorecard update helper

**Files:**
- Create: `scripts/harness-scorecard.mjs`
- Modify: `package.json`

**Implementation:**
1. Script validates scorecard schema and required headings.
2. Add `pnpm harness:scorecard:check`.

**Verification:**
```sh
pnpm harness:scorecard:check
```

### Phase 1 (Weeks 1-2): Repository Knowledge as System of Record

Objective: make repo documentation legible for both humans and agents.

#### Task 1.1: Add canonical knowledge docs

**Files:**
- Create: `doc/ARCHITECTURE.md`
- Create: `doc/QUALITY_SCORE.md`
- Create: `doc/RELIABILITY.md`
- Create: `doc/SECURITY.md`
- Create: `doc/DECISIONS/0001-harness-engineering-adoption.md`

**Implementation:**
1. `ARCHITECTURE.md`: bounded contexts, layer boundaries, allowed dependency directions.
2. `QUALITY_SCORE.md`: quality KPIs + target thresholds.
3. `RELIABILITY.md`: SLOs for critical flows (issue checkout, heartbeat invoke, approval state changes).
4. `SECURITY.md`: auth boundary matrix, company-scoping rules, mutation audit requirements.
5. ADR for adoption principles and scope.

**Verification:**
- Each doc has `Owner`, `Last Verified`, `Applies To`, `Links`.

#### Task 1.2: Enforce doc contracts in CI

**Files:**
- Create: `scripts/docs-lint.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/pr-verify.yml`

**Implementation:**
1. Linter checks required docs exist.
2. Linter checks mandatory front-matter markers.
3. Linter checks link integrity for local `doc/*` references.
4. Add CI step before typecheck.

**Verification:**
```sh
pnpm docs:lint
```

### Phase 2 (Weeks 2-4): Mechanical Architecture and Invariant Enforcement

Objective: convert textual rules into failing checks.

#### Task 2.1: Add import-boundary enforcement

**Files:**
- Create: `.dependency-cruiser.cjs` (or equivalent script config)
- Modify: `package.json`
- Modify: `.github/workflows/pr-verify.yml`

**Implementation:**
1. Forbid `ui` importing from `server`.
2. Forbid routes bypassing services for mutation paths where policy requires service logging.
3. Restrict direct DB schema imports outside allowed data access layers.
4. Add `pnpm arch:lint`.

**Verification:**
```sh
pnpm arch:lint
```

#### Task 2.2: Add contract tests for control-plane invariants

**Files:**
- Create: `server/src/__tests__/company-scope-contract.test.ts`
- Create: `server/src/__tests__/mutation-activity-log-contract.test.ts`
- Create: `server/src/__tests__/issue-transition-guard-contract.test.ts`
- Create: `server/src/__tests__/agent-auth-company-boundary-contract.test.ts`

**Implementation:**
1. Company boundary denial tests for cross-company IDs.
2. Mutation endpoints must emit activity log entries.
3. Issue state transitions follow allowed graph.
4. Agent API keys cannot access other companies.

**Verification:**
```sh
pnpm test:run
```

#### Task 2.3: Shared contract drift guard

**Files:**
- Create: `server/src/__tests__/shared-validator-contract.test.ts`
- Modify: `packages/shared/src/validators/index.ts` (export stability)

**Implementation:**
1. Validate server routes use `packages/shared` validators for request bodies.
2. Add snapshot for key API shapes consumed by UI.

**Verification:**
```sh
pnpm test:run
```

### Phase 3 (Weeks 4-6): Deterministic Agent Harness and Artifacts

Objective: every autonomous run is observable and reproducible.

#### Task 3.1: Standardize harness run command

**Files:**
- Create: `scripts/harness/run-agent-task.sh`
- Create: `scripts/harness/collect-artifacts.sh`
- Modify: `package.json`

**Implementation:**
1. Single entrypoint runs scoped task in isolated workspace/worktree context.
2. Collects logs, failing test output, and run metadata.
3. For UI changes, collect Playwright screenshot/video artifacts.

**Verification:**
```sh
pnpm harness:run --help
```

#### Task 3.2: Upload harness artifacts in CI

**Files:**
- Modify: `.github/workflows/pr-verify.yml`
- Modify: `.github/workflows/e2e.yml`

**Implementation:**
1. On failure, upload server logs + failing snapshots.
2. On UI paths, upload Playwright artifacts consistently.
3. Add artifact naming convention keyed by PR SHA.

**Verification:**
- Failed CI run includes artifact bundle with deterministic layout.

#### Task 3.3: Add local operator runbook

**Files:**
- Create: `doc/HARNESS_RUNBOOK.md`
- Modify: `doc/DEVELOPING.md`

**Implementation:**
1. How to reproduce CI harness locally.
2. How to interpret artifacts.
3. How to classify failures (code bug vs harness bug vs infra flake).

**Verification:**
- Dry-run walkthrough by another engineer yields same result.

### Phase 4 (Weeks 6-8): Risk-Tiered Merge Policy

Objective: increase throughput without reducing safety.

#### Task 4.1: Define risk taxonomy and labels

**Files:**
- Create: `doc/MERGE_POLICY.md`
- Modify: `.github/workflows/pr-policy.yml`

**Implementation:**
1. `low`, `medium`, `high` risk categories from changed paths.
2. High-risk paths: auth, company scoping, issue checkout/wakeup, approval transitions, budgets.
3. Enforce mandatory reviewer count by risk tier.

**Verification:**
- PR touching high-risk files fails without required label/review policy.

#### Task 4.2: Add fast lane for low-risk PRs

**Files:**
- Modify: `.github/workflows/pr-verify.yml`
- Create: `.github/workflows/auto-merge-low-risk.yml` (if policy allows)

**Implementation:**
1. If low-risk and all checks green, enable auto-merge path.
2. Block fast lane when docs/contract checks fail.
3. Record merge-lane stats.

**Verification:**
- Sample low-risk PR can flow with fewer manual steps.

### Phase 5 (Weeks 8-10): Autonomy Ladder

Objective: define and enforce what “agent-generated PR” means.

#### Task 5.1: Add agent PR quality contract

**Files:**
- Create: `doc/AGENT_PR_CONTRACT.md`
- Modify: `AGENTS.md`

**Implementation:**
1. Minimum PR package: implementation + tests + docs + migration/contract sync when relevant.
2. Explicit escalation triggers (security/auth/budget logic, unclear requirements, data loss risk).
3. Required proof section in PR description.

**Verification:**
- PR template rejects missing evidence sections.

#### Task 5.2: Add PR evidence checker

**Files:**
- Create: `scripts/check-pr-evidence.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/pr-policy.yml`

**Implementation:**
1. Check description contains required sections:
   - Scope
   - Verification
   - Contract Sync
   - Risks
2. Require command output references for `typecheck`, `test:run`, `build`.

**Verification:**
```sh
pnpm pr:evidence:check
```

### Phase 6 (Weeks 10-11): Entropy and Garbage Collection

Objective: institutionalize continuous cleanup.

#### Task 6.1: Add cleanup backlog protocol

**Files:**
- Create: `doc/CLEANUP_POLICY.md`
- Create: `doc/CLEANUP_BACKLOG.md`

**Implementation:**
1. Define what qualifies as entropy (unused code, stale docs, dead configs, duplicate tests).
2. Set weekly cleanup budget and risk constraints.
3. Define rollback expectations for cleanup PRs.

**Verification:**
- Weekly cleanup issue is generated with bounded scope.

#### Task 6.2: Add cleanup detection scripts

**Files:**
- Create: `scripts/entropy/find-stale-doc-links.mjs`
- Create: `scripts/entropy/find-untested-routes.mjs`
- Create: `scripts/entropy/find-orphaned-types.mjs`
- Modify: `package.json`

**Implementation:**
1. Surface high-signal cleanup candidates.
2. Export machine-readable report for future automation.

**Verification:**
```sh
pnpm entropy:scan
```

### Phase 7 (Week 12): Learning Loop and Quarterly Re-Scoring

Objective: turn unknowns into explicit experiments.

#### Task 7.1: Add learning registry

**Files:**
- Create: `doc/HARNESS_LEARNING_REGISTRY.md`

**Implementation:**
1. Template fields:
   - Hypothesis
   - Metric
   - Experiment Window
   - Decision
   - Follow-up
2. Add top 10 unknowns from rollout.

**Verification:**
- Registry has owner and dates for all active experiments.

#### Task 7.2: Quarterly score recalibration process

**Files:**
- Modify: `doc/HARNESS_SCORECARD.md`
- Modify: `doc/RELEASING.md`

**Implementation:**
1. Add release preflight checkpoint requiring scorecard review.
2. Publish delta table per quarter.

**Verification:**
- Release checklist references scorecard gate.

## 4. Parameter-to-Workstream Mapping (How each reaches 100)

| Parameter | Work needed to reach 100 |
|---|---|
| Empty-repo/agent-first bootstrap | Agent bootstrap template + generator that emits code/test/docs/CI together for new subsystems. |
| Engineer role redefinition | `AGENTS.md` + `AGENT_PR_CONTRACT.md` define steer/escalate model and hard responsibilities. |
| Application legibility | Harness runner + artifact collector + reproducible runbook with deterministic output. |
| Repo as SoR | Mandatory architecture/reliability/security docs + docs lint in CI. |
| Agent legibility as goal | ADR discipline + invariant docs + contract tests for every critical rule. |
| Architecture/taste enforcement | Import boundaries + invariant tests + shared-validator drift checks. |
| Throughput merge philosophy | Risk-tier labels + fast lane + high-risk escalation gates. |
| Meaning of agent-generated | PR evidence checker requiring tests/docs/contracts, not code-only diffs. |
| Increasing autonomy | One-command harness execution pipeline with standardized success artifacts. |
| Entropy/garbage collection | Weekly cleanup backlog + entropy scan scripts + safe cleanup PR process. |
| Learning loop | Learning registry + scheduled rescoring tied to release process. |

## 5. KPI Dashboard

Track weekly:

1. CI pass rate on first attempt.
2. Median PR cycle time by risk tier.
3. Agent-authored PR acceptance without human rewrite.
4. Percentage of PRs with full evidence sections.
5. Count of high-risk policy violations caught pre-merge.
6. Entropy backlog size and burn-down.
7. Documentation freshness compliance rate.

## 6. Risks and Mitigations

1. Risk: process overhead slows delivery.
Mitigation: strict fast lane for low-risk changes.

2. Risk: false confidence from synthetic checks.
Mitigation: keep behavioral integration tests for core invariants.

3. Risk: doc rot.
Mitigation: CI freshness checks and named owners.

4. Risk: cleanup PRs introduce regressions.
Mitigation: cleanup scope caps + rollback-safe policy.

## 7. Verification Gate Before Merge (for each phase)

Run:

```sh
pnpm docs:lint
pnpm arch:lint
pnpm -r typecheck
pnpm test:run
pnpm build
```

If a phase does not include all commands yet, document the gap in phase PR and keep `typecheck/test/build` mandatory.

## 8. Definition of Done for This Plan

1. Overall score >=85 and no critical parameter below 80.
2. `Repository as SoR`, `Legibility`, `Architecture enforcement`, `Throughput policy` >=90.
3. Evidence of two consecutive release cycles with stable gates and no rollback from policy gaps.
4. Weekly scorecard updates maintained for at least 8 consecutive weeks.
