# Step 5: Evals Framework - Completed

## What I Built

A lightweight eval runner (`scripts/eval-runner.ts`) that reads existing `test-cases.md` files, scores trigger accuracy and output quality using keyword-overlap heuristics, and saves timestamped JSON results. Exposed via a `/eval` slash command and backed by a judge prompt with scoring rubrics.

## Files Changed

| File | Changes |
|------|---------|
| `scripts/eval-runner.ts` | Created: Bun eval orchestrator with single-skill, --all, --compare modes |
| `skills/evals/judges/skill-quality.md` | Created: Judge prompt with rubrics for trigger match, no-fire, and output quality |
| `skills/evals/results/.gitkeep` | Created: Results directory placeholder |
| `skills/eval/SKILL.md` | Created: /eval slash command skill |

## Verification

- [x] `head -1 scripts/eval-runner.ts` — `#!/usr/bin/env bun`
- [x] `bun scripts/eval-runner.ts skills/agent-building/autonomous-agent/SKILL.md` — runs, produces 80% overall score
- [x] `ls skills/evals/results/autonomous-agent/` — `2026-03-16.json` present
- [x] `test -f skills/evals/judges/skill-quality.md && echo "PASS"` — PASS
- [x] `bun scripts/eval-runner.ts --all` — runs all 14 skills, 6 pass ≥80%
- [x] `bun scripts/eval-runner.ts --compare autonomous-agent` — produces delta output
- [x] JSON output matches spec format (skill, date, version, scores, overall, failures, duration_ms)

## Self-Review

- Completeness: All requirements met — all 4 files created, all 3 modes implemented
- Scope: Clean — no dashboard, no model comparison, no test-cases.md modifications
- Quality: Typed throughout (no `any`), clear function names, follows codebase patterns

## Deviations from Spec

**Parser robustness:** The spec showed a single test-cases.md format, but actual files use multiple formats:
- Table with "TRIGGER"/"NO TRIGGER" expected values
- Table with "YES"/"NO" expected values
- Checklist output assertions (`- [ ] assertion`)
- Freeform output assertions with sub-headers (`**T1 — scenario:**`)

The runner handles all observed formats.

**Score calibration:** Skills with many specific output assertions against heavily optimized SKILL.md files (e.g., mcp-integration at 56 lines) score below 80% on output quality. Well-formed skills (code-review: 89%, persistent-memory: 89%, structured-project: 88%, git-workflow: 81%, autonomous-agent: 80%) all meet the 80%+ threshold. The heuristic scorer is a documented limitation — the judge prompt exists for the LLM-assisted path.

## Learnings

- Test-cases.md files use at least 4 distinct formats across the skill library — the parser must be flexible
- NOT-for exclusion matching is tricky: single-word exclusions ("mcp") cause false positives; need 2+ words OR one very long domain-specific word
- Skills optimized to minimal line counts have mismatch with detailed test suites — output quality scores reflect SKILL.md density, not actual skill correctness
- The `--compare` flag needs at least 2 result files to be useful; it degrades gracefully to a message otherwise

## Concerns

- Output quality scoring is a heuristic proxy, not ground truth. Skills that reference sub-files extensively (`references/`) may score low because the heuristic only reads SKILL.md. The judge prompt is designed for when Claude API judging is integrated.
- The scorer uses `process.cwd()` as repo root — works when run from project root, may fail if called from subdirectory.
