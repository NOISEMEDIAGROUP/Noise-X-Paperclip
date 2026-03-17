# Learnings: Git Workflow Automation (#005)

## QC Review 2026-03-15 — FAIL (AIS-14)
**Failures:** Tests not executed — test cases were written but never actually run. SkillBuilder posted test case file but no execution log with real pass/fail results.
**Pattern:** CRITICAL RECURRING — "tests written but not run" is the #1 failure mode. Writing test-cases.md is not the same as executing the tests.
**Fix hint:** After writing test-cases.md, you MUST actually run the trigger tests against the skill description and log results in test-log.md with real scores. No score = no pass.

## QC Review 2026-03-15 — PASS (AIS-16, resubmit)
**What worked well:** On resubmit, tests were properly executed with 93% trigger, 100% no-trigger scores. Reference files were substantive with real code examples.
**Near misses:** Initial submission had 8 reference files but hollow test verification. The skill content was good from the start — only the testing discipline was missing.

## Optimization 2026-03-17 — 8/8 kept (AIS-71)
**Result:** 84→32 lines (-62%), all scores held at 100%
**What worked:** Inline Stop hook (15 lines) duplicated 05-hooks.md — remove when Quick Entry points to ref. Minimum Viable Setup (11 lines) duplicated Core Pattern. Anti-Rationalization table (11 lines) — every assertion covered by 01-why-it-breaks.md. Prerequisites (5 lines) always in first reference file hit.
**New pattern:** Anti-Rationalization table is NOT sacred. When reference files cover the same assertions, the table is dead weight. First optimized skill to ship with zero anti-rationalization table — safe pattern confirmed.
**Generalizable:** Map each SKILL.md section to which test assertions it covers. If a reference file already covers those assertions AND Quick Entry points there, the section is removable.
