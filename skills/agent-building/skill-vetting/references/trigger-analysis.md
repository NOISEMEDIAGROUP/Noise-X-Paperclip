# Trigger Phrase Analysis

## What a Trigger Does

The `description:` frontmatter is the routing signal — Claude Code matches user intent against it to decide which skill fires. Overly broad triggers create two problems:
1. The skill fires on conversations it wasn't meant for (data exposure)
2. It displaces the skill that should have fired (functionality disruption)

## Red Flag Patterns

### Single-Word or Generic Triggers
```
# BAD: fires on every coding conversation
description: Use when coding.

# BAD: fires on every writing task
description: Use when writing or editing text.
```

Any trigger that matches a category of work rather than a specific task is too broad.

### Missing NOT-for Exclusions

A skill with no `NOT for:` clause has no guard rail. Even well-intentioned triggers produce false positives at scale.

```
# Red flag: no exclusions
description: Use when reviewing code or analyzing files.

# Better: explicit exclusions prevent fires on adjacent workflows
description: Use when reviewing a Claude Code skill... NOT for: general code review, npm auditing, CLAUDE.md review.
```

### Overlap With Common Skills

Check if the trigger overlaps with skills you already have installed:
- "use when reviewing" → overlaps with code-review-automation
- "use when building agents" → overlaps with autonomous-agent, proactive-agent
- "use when debugging" → overlaps with systematic-debugging

Overlap creates a race condition: whichever skill fires first wins, and it may not be the right one.

### Ambiguous Intent Markers

Phrases that could match user intent in multiple unrelated contexts:

| Trigger Word | Ambiguous Because |
|---|---|
| "analyze" | Applies to code, data, text, security, performance, etc. |
| "review" | Code review, PR review, doc review, design review |
| "improve" | Code, writing, performance, processes |
| "check" | Syntax, style, security, URLs, status |
| "help with" | Almost anything |

## Trigger Set Size

| Count | Signal |
|---|---|
| < 3 phrases | Too narrow — will miss valid use cases |
| 3-12 phrases | Healthy range |
| > 12 phrases | Too broad — precision is degrading |

## Trigger Overlap Detection Checklist

1. List the top 10-15 skills in your installed catalog
2. For each skill's trigger, ask: "Could the new skill's trigger also match this?"
3. Flag any skill where the answer is yes
4. Check if the new skill has explicit NOT-for language ruling it out

## Scoring Triggers

| Finding | Severity |
|---|---|
| Single-word trigger with no NOT-for | Critical |
| Generic category trigger (no specifics) | High |
| No NOT-for exclusions at all | Medium |
| Overlaps with one existing skill | Medium |
| Trigger set > 15 phrases | Low |
| Trigger set < 3 phrases | Low |
