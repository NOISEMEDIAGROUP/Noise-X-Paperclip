# Step 3: Deep Investigation - Completed

## What I Built

A progressive iterative research workflow built around a persistent file-based vault at `~/.claude/research-vaults/`. The workflow integrates into the Research agent via sub-routing (Step 1's pattern), triggers on deep investigation requests, and runs three distinct phases: first iteration (landscape + entity discovery), continuation (one entity deep-dive per session), and completion (report when all CRITICAL/HIGH entities researched).

## Files Changed

| File | Changes |
|------|---------|
| `docs/conventions/research-vault.md` | Created — vault directory structure, ENTITIES.md format, scoring rubric, entity profile template, naming convention, completion criteria |
| `agents/research/Workflows/DeepInvestigation.md` | Created — iteration detection (Step 0), first iteration (Steps 1-2), continuation (Step 3), completion (Step 4), vault management helpers |
| `agents/research/AGENTS.md` | Added Workflow Routing section before Data Sources — routes deep investigation triggers to DeepInvestigation.md, keeps standard brief inline |
| `~/.claude/research-vaults/.gitkeep` | Created directory for vault persistence |

## Verification

- [x] `test -f agents/research/Workflows/DeepInvestigation.md` — PASS
- [x] `test -f docs/conventions/research-vault.md` — PASS
- [x] Grep "Workflow Routing" in agents/research/AGENTS.md — PASS (1 match)
- [x] `test -d ~/.claude/research-vaults` — PASS

## Self-Review

- Completeness: All requirements met — 3-phase workflow, vault convention, ENTITIES.md scoring, entity profile template, routing in AGENTS.md, vault directory created
- Scope: Clean — no domain template packs, no vault management CLI, existing brief workflow untouched. Diff limited to the 4 specified files.
- Quality: Iteration detection is explicit with 3 discrete branches. Profile template matches spec verbatim. Routing section follows context-cost-management pattern exactly.

## Deviations from Spec

None.

## Learnings

- `docs/conventions/` already existed from Step 1 — no directory creation needed there
- The `agents/research/Workflows/` directory was net-new — created via mkdir
- Routing section placement: inserted before "Data Sources" section so it appears early in the agent instructions, matching how context-cost-management puts Workflow Routing near the top of SKILL.md

## Concerns

None. The workflow is intentionally simple — stateless resumption via ENTITIES.md table scan is the right call and the spec is explicit about it.
