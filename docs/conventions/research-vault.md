# Convention: Research Vault

## Overview

A persistent, file-based knowledge store for progressive deep investigations. Instead of producing one-shot briefs, a Research Vault accumulates knowledge across multiple sessions — broad landscape first, then entity-by-entity deep dives. All state lives in markdown artifacts; any session can resume any vault by reading ENTITIES.md.

## Vault Location

```
~/.claude/research-vaults/
├── YYYY-MM-DD_topic-slug/
│   ├── LANDSCAPE.md        ← Broad domain overview (written in iteration 1 only)
│   ├── ENTITIES.md         ← Scored entity catalog: status, value, effort
│   ├── INDEX.md            ← Vault table of contents
│   └── entities/
│       ├── entity-a.md     ← Deep-dive profile
│       └── entity-b.md     ← Deep-dive profile
```

## ENTITIES.md Format

```markdown
# Entity Catalog

| Entity | Category | Status | Value | Effort | Profile |
|--------|----------|--------|-------|--------|---------|
| LangChain | Framework | PENDING | CRITICAL | EASY | — |
| CrewAI | Framework | RESEARCHED | HIGH | MODERATE | entities/crewai.md |
| AutoGen | Framework | PENDING | HIGH | EASY | — |
| SmolAgent | Framework | SKIP | LOW | EASY | — |

Status: PENDING / RESEARCHED / SKIP
Value: CRITICAL / HIGH / MEDIUM / LOW
Effort: EASY / MODERATE / HARD
```

### Scoring Rubric

**Value** — how much this entity matters to the investigation:
- `CRITICAL` — Core to the domain; must have a profile
- `HIGH` — Important; should have a profile
- `MEDIUM` — Useful context; profile optional
- `LOW` — Peripheral; safe to skip

**Effort** — how hard to research this entity:
- `EASY` — Well-documented, active community, lots of sources
- `MODERATE` — Requires digging; some sources limited
- `HARD` — Sparse documentation, limited public data, niche

**Status:**
- `PENDING` — Not yet researched
- `RESEARCHED` — Profile written in `entities/`
- `SKIP` — Explicitly excluded (add reason in a comment row below the entity)

## Entity Profile Template

```markdown
# [Entity Name]

## Overview
[2-3 paragraph summary of what this entity is and why it matters]

## Key Facts
- Founded/Created: [date]
- Category: [from ENTITIES.md]
- Size/Scale: [relevant metrics — downloads, stars, team size, revenue, etc.]

## Strengths
- [bullet points]

## Weaknesses
- [bullet points]

## Relevance to Investigation
[How this entity connects to the broader landscape and to other entities]

## Sources
[Verified URLs only — no hallucinated links]
```

## Stateless Resumption Model

The vault is stateless by design. There is no daemon, no database, no lock files. Resumption works by:

1. Opening ENTITIES.md
2. Finding the first `PENDING` entity with `CRITICAL` or `HIGH` value
3. Researching it and writing its profile
4. Updating ENTITIES.md to `RESEARCHED`

Any session can resume any vault. Multiple sessions should NOT run on the same vault concurrently (no conflict resolution).

## Naming Convention

Vault directories follow `YYYY-MM-DD_topic-slug`:
- Date: ISO 8601, when the investigation started
- Slug: kebab-case, 3-5 words describing the domain
- Examples: `2026-03-16_ai-agent-frameworks`, `2026-03-16_claude-code-skills-market`

## Completion Criteria

A vault is complete when:
- All `CRITICAL` entities are `RESEARCHED`
- All `HIGH` entities are `RESEARCHED` or explicitly `SKIP`'d with a reason
- At least one entity per category is `RESEARCHED`
