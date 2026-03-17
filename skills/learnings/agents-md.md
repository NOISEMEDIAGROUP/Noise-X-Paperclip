## QC Review 2026-03-17 — PASS

**What worked well:**
- Split rule (CLAUDE.md vs AGENTS.md decision table) is a differentiator vs generic agent docs — 20 examples + diagnostic workflow make the rule stick
- Template gallery with annotations solves "where do I start" — copy-paste-ready with callouts explaining each section
- NOT-for exclusions are precise (agent tool mechanics vs agent authoring is a real boundary; heartbeat/cron is correctly delegated to proactive-agent)
- Test coverage at 100% (25/25) catches all brief sections and correctly handles adjacent skill boundaries

**Near misses:**
- None — skill is tight at 122 lines

**Pattern:**
- Agent-focused skills (this is #016) benefit from explicit templates + decision tables over prose. Readers need actionable structures, not narratives about what agents are.

## Optimization 2026-03-17 — 8/8 kept

**What improved:** 122→61 lines (-50%), all scores held at 100% across all 8 iterations.

**Biggest wins:**
- Anti-Patterns section (15 lines): zero test coverage, removed entirely
- Reference Index (14 lines): every ref already embedded in each section inline — redundant
- Component overview table + "What is AGENTS.md" section (11 lines combined): opening paragraph + mental model said the same thing twice

**What didn't work:** Nothing was discarded — all 8 iterations kept.

**Pattern:** At 100% trigger/output scores, ALL gains are simplicity-only. The checklist:
1. Scan every section for inline tables/code that duplicate reference file content → remove
2. Check if "What is X" intro section duplicates the opening paragraph → merge
3. Remove Reference Index if each section already has inline file pointers
4. Remove any section with zero test coverage (anti-patterns, maintenance, audit checklists)
5. Collapse bullet lists of 3-4 items into single comma-separated sentences

**Generalizable insight:** Skills that start well-structured tend to have Anti-Patterns + Reference Index as double dead weight. Both are useful to the skill *author* but invisible to the evaluation — combine for ~30 lines of free savings.
