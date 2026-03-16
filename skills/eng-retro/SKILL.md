---
name: eng-retro
description: |
  Engineering retrospective for Paperclip agents. Analyzes commit history, work patterns,
  code quality metrics, and agent performance across a time window. Produces per-agent
  breakdowns, shipping velocity, test discipline, and actionable recommendations.
  Designed for oversight agents (CEO, CTO, team leads).
---

# Engineering Retro (Paperclip Agent)

You are running an engineering retrospective within a Paperclip heartbeat. Analyze the
team's (including other agents') recent work and produce an actionable summary.

## When to use

Use this skill:
- On a weekly heartbeat schedule for ongoing team health monitoring
- When asked to evaluate team/agent performance
- Before planning meetings to understand current velocity and patterns

## Arguments

Default: last 7 days. Override via task context or instructions:
- `7d` — last 7 days
- `14d` — last 14 days
- `30d` — last 30 days

## Step 1: Gather Data

First, detect the default branch and current user context:

```bash
_DEFAULT=$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name 2>/dev/null || echo "main")
git fetch origin "$_DEFAULT" --quiet
echo "DEFAULT_BRANCH: $_DEFAULT"
```

Run these data-gathering commands (independent — can run in parallel):

```bash
# Commits with metadata
git log "origin/$_DEFAULT" --since="<window>" --format="%H|%aN|%ae|%ai|%s" --shortstat

# Per-commit file breakdown (test vs production)
git log "origin/$_DEFAULT" --since="<window>" --format="COMMIT:%H|%aN" --numstat

# Commit timestamps for session detection
git log "origin/$_DEFAULT" --since="<window>" --format="%at|%aN|%ai|%s" | sort -n

# File hotspots
git log "origin/$_DEFAULT" --since="<window>" --format="" --name-only | grep -v '^$' | sort | uniq -c | sort -rn

# Per-author commit counts
git shortlog "origin/$_DEFAULT" --since="<window>" -sn --no-merges

# PR numbers from commit messages
git log "origin/$_DEFAULT" --since="<window>" --format="%s" | grep -oE '#[0-9]+' | sort -n | uniq
```

## Step 2: Compute Metrics

| Metric | Value |
|--------|-------|
| Commits to main | N |
| Contributors | N (list: human agents + Paperclip agents) |
| PRs merged | N |
| Total insertions / deletions | +N / -N |
| Net LOC | N |
| Test LOC ratio | N% |
| Active days | N |
| Detected sessions | N |
| Avg LOC/session-hour | N |

### Per-contributor leaderboard

```
Contributor         Commits   +/-          Top area
agent-ceo               12   +800/-150    agents/ceo/
agent-eng                32   +2400/-300   src/
human-dev                8    +400/-100    ui/
```

Identify which contributors are Paperclip agents (check for `Co-Authored-By` patterns
or match against known agent names from `$PAPERCLIP_AGENT_ID`).

## Step 3: Commit Time Distribution

Show hourly histogram:

```
Hour  Commits  ████████████████
 00:    4      ████
 09:    12     ████████████
 14:    8      ████████
```

Note patterns:
- Agent activity patterns (do they cluster around heartbeat schedules?)
- Human activity patterns
- Dead zones

## Step 4: Session Detection

Detect sessions using 45-minute gap threshold. Classify:
- **Deep sessions** (50+ min) — sustained focused work
- **Medium sessions** (20-50 min) — typical heartbeat execution
- **Micro sessions** (<20 min) — quick fixes, single-commit heartbeats

## Step 5: Shipping Velocity

Categorize commits by type (feat/fix/refactor/test/chore/docs):

```
feat:     20  (40%)  ████████████████████
fix:      15  (30%)  ███████████████
test:      8  (16%)  ████████
refactor:  5  (10%)  █████
chore:     2  ( 4%)  ██
```

Flag if fix ratio >50% — may indicate review gaps or unstable code.

### PR Size Distribution
- **Small** (<100 LOC): ideal for review
- **Medium** (100-500 LOC): acceptable
- **Large** (500-1500 LOC): flag for splitting
- **XL** (1500+ LOC): flag as concerning

## Step 6: Code Quality Signals

- Test LOC ratio (target: >25%)
- Hotspot analysis (files changed 5+ times = churn)
- XL PRs that should have been split

## Step 7: Agent Performance (Paperclip-specific)

For each Paperclip agent contributor:
- Heartbeats executed (from commit patterns)
- Tasks completed (cross-reference with Paperclip task IDs in commit messages)
- Success rate (commits that stick vs reverted/fixed)
- Average heartbeat duration (from session detection)

## Step 8: Narrative Report

Output the retro report:

```markdown
# Engineering Retro: [date range]

**Tweetable:** [window]: N commits (X contributors), Y LOC, Z% tests, W PRs

## Summary Table
[metrics from Step 2]

## Shipping Velocity
[from Step 5]

## Code Quality
[from Step 6]

## Per-Contributor Breakdown

### [Agent/Person Name]
- **Shipped:** [2-3 sentences on contributions]
- **Strengths:** [1-2 specific things anchored in commits]
- **Growth area:** [1 actionable suggestion]

## Top 3 Wins
1. [What, who, why it matters]

## 3 Things to Improve
[Specific, actionable, anchored in data]

## 3 Recommendations for Next Week
[Small, practical, realistic]
```

## Step 9: Save History

```bash
mkdir -p .context/retros
```

Save a JSON snapshot with the computed metrics for trend tracking across retros.

## Rules

- ALL narrative goes to stdout / Paperclip comment. Only the JSON snapshot is written to disk.
- Use `origin/<default>` for all git queries (not local main which may be stale)
- If zero commits in window, say so and suggest a different window
- Be specific — anchor all praise and criticism in actual commits
- Frame improvements as investments, not failures
- Treat agent and human contributors with equal rigor
