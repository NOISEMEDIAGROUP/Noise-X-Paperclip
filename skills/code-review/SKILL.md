---
name: code-review
description: |
  Pre-landing code review for Paperclip agents. Analyzes diff against the base branch
  for production-critical bugs: race conditions, SQL safety, trust boundaries, N+1 queries,
  conditional side effects, and issues that pass CI but break production. Designed for
  autonomous agent use within Paperclip heartbeats — no interactive prompts.
---

# Code Review (Paperclip Agent)

You are running an autonomous code review within a Paperclip heartbeat. Analyze the current
branch's diff against the base branch for structural issues that tests don't catch.

## When to use

Use this skill:
- Before creating a PR for work you completed
- When assigned a review task by another agent or the board
- As part of a ship workflow before pushing

## Step 1: Detect base branch

```bash
_BASE=$(gh pr view --json baseRefName -q .baseRefName 2>/dev/null || gh repo view --json defaultBranchRef -q .defaultBranchRef.name 2>/dev/null || echo "main")
echo "BASE: $_BASE"
```

## Step 2: Check for changes

```bash
git fetch origin "$_BASE" --quiet
git diff "origin/$_BASE" --stat
```

If on the base branch or no diff exists, report: "No changes to review." and stop.

## Step 3: Get the full diff

```bash
git diff "origin/$_BASE"
```

## Step 4: Two-pass review

Apply this checklist against the diff:

### Pass 1 — CRITICAL (must fix before merge)

**SQL & Data Safety**
- Raw SQL with string interpolation (SQL injection)
- Missing transactions around multi-step mutations
- Schema changes without backward compatibility
- Missing indexes on new foreign keys or query columns

**Race Conditions & Concurrency**
- Shared mutable state without locks
- Check-then-act patterns without atomicity
- Missing uniqueness constraints where business logic requires them

**Trust Boundaries**
- LLM/AI output used in SQL, shell commands, or HTML without sanitization
- User input passed to privileged operations without validation
- API responses trusted without schema validation

**Enum & Value Completeness**
- New enum value, status, or type constant added but not handled in all switch/case/if-else blocks
- **This requires reading code OUTSIDE the diff.** When the diff introduces a new value, use Grep to find all references to sibling values and verify the new value is handled everywhere.

### Pass 2 — INFORMATIONAL (note but don't block)

- Conditional side effects (side effect inside an if-branch that could be missed)
- Magic numbers or string constants that should be named
- Dead code or inconsistencies with existing patterns
- Missing error handling on external calls
- N+1 query patterns
- Test gaps for new codepaths
- Frontend/view issues (broken layouts, accessibility, missing loading states)

## Step 5: Report findings

Output findings in this format:

```
## Code Review: [branch-name]

### CRITICAL (N issues)
1. **[Category]** `file:line` — Description. Fix: [one-line fix]

### INFORMATIONAL (N issues)
1. **[Category]** `file:line` — Description.

### Verdict
- SHIP IT — no critical issues
- NEEDS FIX — N critical issues must be resolved
```

## Step 6: Auto-fix critical issues (if you authored the code)

If you are reviewing your own work (you made the commits on this branch):
- Fix all CRITICAL issues immediately
- Commit fixes: `git add <fixed-files> && git commit -m "fix: address code review findings"`
- Re-run the review on the updated diff to confirm fixes

If reviewing another agent's work:
- Post findings as a Paperclip comment on the task
- Do NOT modify their code

## Rules

- Read the FULL diff before commenting. Do not flag issues already addressed in the diff.
- Be terse. One line problem, one line fix.
- Only flag real problems. Skip anything that's fine.
- Never commit, push, or create PRs unless this is your own code and you're fixing critical issues.
