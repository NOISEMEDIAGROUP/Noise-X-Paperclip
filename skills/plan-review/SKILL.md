---
name: plan-review
description: |
  Two-phase plan review for Paperclip agents. Phase 1 (CEO mode): challenge premises,
  find the 10-star product, evaluate scope. Phase 2 (Eng mode): lock architecture,
  map error paths, diagram data flows, identify test gaps. Outputs a structured
  review document with findings, diagrams, and actionable recommendations.
---

# Plan Review (Paperclip Agent)

You are reviewing a plan or proposal within a Paperclip heartbeat. This combines CEO-level
product thinking with engineering rigor into a single structured review.

## When to use

Use this skill:
- When assigned a planning or design review task
- Before starting implementation of a significant feature
- When evaluating a proposal from another agent

## Phase 1: Product & Scope Review (CEO Mode)

### 1A. Premise Challenge
1. Is this the right problem to solve? Could a different framing yield a simpler or more impactful solution?
2. What is the actual user/business outcome? Is the plan the most direct path?
3. What would happen if we did nothing?

### 1B. Existing Code Leverage
1. What existing code already partially or fully solves each sub-problem?
2. Is this plan rebuilding anything that already exists? If yes, explain why rebuilding beats refactoring.

### 1C. Scope Assessment

Evaluate and recommend one of three modes:

- **EXPAND**: The plan is good but could be great. Propose the ambitious version.
- **HOLD**: The plan's scope is right. Make it bulletproof.
- **REDUCE**: The plan is overbuilt. Propose the minimum that achieves the core goal.

Context-dependent defaults:
- Greenfield feature → default EXPAND
- Bug fix or hotfix → default HOLD
- Refactor → default HOLD
- Plan touching >15 files → suggest REDUCE

### 1D. Dream State Mapping
```
  CURRENT STATE            THIS PLAN              12-MONTH IDEAL
  [describe]      --->     [describe delta]  --->  [describe target]
```

## Phase 2: Engineering Review

### 2A. Architecture
- Component boundaries and dependency graph (ASCII diagram required)
- Data flow — happy path, nil path, empty path, error path
- State machines — diagram for every new stateful object
- Scaling: what breaks at 10x load? 100x?
- Single points of failure
- Security: auth boundaries, data access patterns, new API surfaces
- Rollback posture: if this ships and breaks, what's the recovery plan?

### 2B. Error & Rescue Map
For every new method/service/codepath that can fail:

```
  METHOD/CODEPATH        | WHAT CAN GO WRONG      | EXCEPTION CLASS
  -----------------------|------------------------|----------------
  ExampleService#call    | API timeout            | TimeoutError
                         | Malformed response     | ParseError
  -----------------------|------------------------|----------------

  EXCEPTION CLASS    | RESCUED? | RESCUE ACTION       | USER SEES
  -------------------|----------|--------------------|-----------
  TimeoutError       | Y        | Retry 2x, raise    | "Temporarily unavailable"
  ParseError         | N ← GAP  | —                   | 500 error ← BAD
```

Rules:
- `catch (error)` with only `console.error` is insufficient — log full context
- Every rescued error must retry, degrade gracefully, or re-raise with context
- For LLM calls: handle malformed response, empty response, refusal, hallucinated JSON

### 2C. Test Coverage Map
```
  NEW CODEPATHS:
    [list each new branch, condition, or execution path]

  For each:
    - Happy path test exists?
    - Failure path test exists?
    - Edge case test? (nil, empty, boundary, concurrent)
```

### 2D. Performance
- N+1 queries
- Missing indexes on new queries
- Memory: max size of new data structures in production
- Caching opportunities for expensive computations
- Connection pool pressure (DB, Redis, HTTP)

### 2E. Observability
- Logging at entry, exit, and significant branches of new codepaths
- What metric tells you this is working? What tells you it's broken?
- If a bug is reported 3 weeks post-ship, can you reconstruct what happened from logs?

## Output Format

Structure your review as:

```markdown
# Plan Review: [plan title]

## Scope Assessment
Mode: EXPAND / HOLD / REDUCE
[Rationale — 2-3 sentences]

## Architecture
[Findings + ASCII diagrams]

## Error Map
[Table from 2B]

## Test Gaps
[List from 2C]

## Performance Concerns
[Findings from 2D]

## Observability Gaps
[Findings from 2E]

## Failure Modes Registry
| CODEPATH | FAILURE MODE | RESCUED? | TEST? | USER SEES? | LOGGED? |
|----------|-------------|----------|-------|------------|---------|

## Verdict
- N critical gaps
- N informational findings
- Recommended scope: EXPAND / HOLD / REDUCE

## NOT in scope
[Work considered and explicitly deferred, one-line rationale each]

## Deferred work (for TODOS)
[Items that should be tracked for future work]
```

## Rules

- Do NOT make any code changes. This is a review, not implementation.
- Produce ASCII diagrams for every non-trivial flow.
- Be specific: file names, line numbers, concrete failure scenarios.
- Every finding needs a concrete recommendation, not just "consider improving."
- Post the review as a Paperclip comment on the task when complete.
