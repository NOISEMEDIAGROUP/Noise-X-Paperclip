---
Owner: Server + UI + Platform
Last Verified: 2026-03-11
Applies To: paperclip monorepo
Links: [Adoption Plan](../plans/2026-03-11-harness-engineering-adoption-plan.md), [HARNESS_SCORECARD](../HARNESS_SCORECARD.md)
---

# ADR-0001: Harness Engineering Adoption

## Status

Accepted

## Context

Paperclip has strong control-plane invariants and CI fundamentals (typecheck, test:run, build). However, the harness-engineering maturity baseline is ~52/100 with critical gaps in:

- Repository knowledge as a system of record
- Mechanical architecture enforcement
- Agent PR quality contracts
- Risk-tiered merge throughput
- Continuous entropy cleanup

As we scale agent-authored contributions, these gaps become blocking risks for safe throughput.

## Decision

Adopt a systematic harness-engineering layer across 8 phases:

1. **Baseline scorecard** to make progress measurable
2. **Canonical docs** (ARCHITECTURE, QUALITY_SCORE, RELIABILITY, SECURITY) enforced by CI
3. **Import boundary enforcement** and contract tests for invariants
4. **Deterministic agent harness** with observable, reproducible runs
5. **Risk-tiered merge policy** for throughput without safety regression
6. **Agent PR quality contracts** defining minimum evidence for merge
7. **Entropy cleanup** with bounded weekly budget
8. **Learning loop** tying experiments to release process

## Consequences

- All PRs will run additional CI checks (docs:lint, arch:lint) — slight increase in CI time
- Documentation becomes a first-class engineering artifact with freshness requirements
- Agent-authored PRs must include tests, docs, and contract sync — higher bar but safer throughput
- Weekly cleanup cadence creates ongoing maintenance cost, offset by reduced entropy accumulation

## Alternatives Considered

1. **Ad hoc quality improvements**: Rejected — doesn't create measurable, enforceable baseline
2. **External quality platform**: Rejected — adds dependency; in-repo enforcement is more durable
3. **Smaller scope (docs only)**: Rejected — docs without enforcement don't change behavior
