# Learnings: self-improving-agent skill

## QC Review 2026-03-16 — FAIL

**Failures:**
1. **Missing "Why Agents Stay Dumb" section** — Brief Section 1 specifies opening section to establish session amnesia problem and three failure modes (capture-without-apply, apply-without-verify, verify-without-iterate). Content is scattered across phases but not organized as required.
2. **Missing visual loop diagram** — Brief specifies "Visual: loop diagram showing phases and what fires each one." SKILL.md has text description but no diagram asset.

**Pattern:** Scope creep in skill building — when compressing content into quick-entry format, the brief's structural guidance gets lost. SkillBuilder optimized for trigger score (100%) without verifying brief alignment.

**Fix hint:**
- Add `## Why Agents Stay Dumb` section (explain amnesia, three failure modes) — ~15 lines
- Add ASCII loop diagram or reference to diagram asset — ~8 lines
- Re-run tests (all pass, scores held)
- Brief alignment is prerequisite for publish, not post-publish cleanup

---

## QC Review 2026-03-16 — PASS (Iteration 2)

**What worked well:**
- Iteration 2 fix directly addressed brief scope concerns: added "Why Agents Stay Dumb" (session amnesia + 3 failure modes table) and ASCII loop diagram. 100% test scores held — no regression.
- Anti-rationalization table (5 entries) effectively teaches common mental traps (n=1 noise, over-capturing, bad rules, skipping verification). More engaging than dry anti-patterns list.
- Progressive disclosure pattern solid: Quick Entry table (8 links) → 2-3 line phase summaries → 6 substantive references (~4K each, not stubs).
- Four-phase loop concept distinctive: not covered by #001 (harness), #002 (mechanics), #009 (scheduling). Clear scope boundary preserved throughout.
- Trigger/no-fire tests at 100% with good coverage: 12 trigger phrases, 5 no-fire tests for all adjacent skills.
- Reference files substantial: working PostToolUse/Stop hook examples, violation classifier patterns, rule refinement diagnosis steps, keep/discard protocol.

**Near misses:**
- T11 ("detect when my agent breaks its rules") scored medium confidence (80%). Exact phrase not in trigger list. Recommend adding to list if real eval flags it.
- N1 ("Set up persistent memory") borderline: NOT-for clause catches it but "session memory improvement" in description creates overlap. Consider stronger wording: "NOT for basic memory capture — this requires a refinement loop."

**Pattern across skills:**
- Brief scope alignment remains a post-QC catch. AIS-34 (initial build), AIS-37 (this skill, iteration 2) both needed fixes for "Why..." intro sections. SkillBuilder should validate brief checklist before submission — would eliminate 1-2 iteration cycles per skill.

---

## Optimization 2026-03-16 (AIS-39) — 8/8 kept

**What improved:** 156 → 114 lines (-27%). All scores held at 100%/100%/100%.

**Changes kept:**
- Removed Phase 1 inline JSON config (-15 lines) — already in 01-violation-hooks.md
- Removed Phase 2 inline entry format (-9 lines) — already in 02-lessons-file.md
- Removed Session-End Summary inline JSON (-8 lines) — already in 05-session-end-summary.md
- Removed "Three failure modes" label (-2) — table header is self-explanatory
- Removed "The fix: make all four phases mandatory" closing line (-2) — implicit in four-phase structure
- Removed redundant Four-Phase Loop closing sentence (-2) — duplicate of intro para on line 10
- Removed "Group by violation type → find top 3..." from Phase 3 (-2) — covered in ref
- Removed Phase 4 intro sentence (-2) — scoring table is self-explanatory

**What didn't work:** N/A — 8/8 kept. Clean run.

**Pattern:** Inline code blocks in SKILL.md that duplicate reference files are the largest source of dead weight (10-15 lines each). When a section already has a `→ [reference-file.md]` pointer, any code example above it is pure duplication. Remove aggressively — output tests pass from the reference, not from SKILL.md.

**Generalizable insight:** At 100% baseline trigger score, the hierarchy of gains (largest first): (1) inline code blocks duplicating refs, (2) redundant explanatory text, (3) closing sentences restating earlier content, (4) intro sentences for self-explanatory tables.
