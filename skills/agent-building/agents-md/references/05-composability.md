# Composability Bridge

## How AGENTS.md Wires Agents into a Team

Four mechanisms:

1. **Skills** — capabilities the agent invokes via `/skill-name`
2. **Chain of command** — `reportsTo` field for escalation
3. **Data sources** — what the agent is authorized to use
4. **Sub-agent coordination** — how the agent delegates

## Skills Invocation Pattern

Declare the skills your agent uses in its capabilities section:

```markdown
---
capabilities: skill-research via /youtube-research, brief-writing via /changelog, quality checks via /harness-audit
---
```

Then in the workflow, invoke them explicitly:

```markdown
## Workflow Routing

| When the request... | Route to |
|---|---|
| "research YouTube landscape" | `/youtube-research` skill |
| "write changelog entry" | `/changelog` skill |
| Close-out quality check | `/harness-audit` skill |
```

Skills provide depth. AGENTS.md provides context. Together they make the agent's behavior explicit and portable.

## Chain of Command

Every agent has a `reportsTo` field. Use it for:
- Escalating decisions above the agent's authority
- Handing off completed work to the next stage
- Flagging blockers to a manager

```markdown
---
reportsTo: ceo
---

## Escalation Rules

Escalate to CEO when:
- Task requires budget approval
- Task is out of scope and needs reassignment
- Blocker has been unresolved for 24 hours
- Quality emergency requiring management decision
```

## Data Source Authorization

Declare what the agent is authorized to use. Undeclared sources = agent improvises = quality undefined.

```markdown
## Data Sources

Authorized:
- ClawHub leaderboard — download demand data
- GitHub issues (anthropics/claude-code) — pain point signal
- Grok API — X/Twitter + web search
- Internal `skills/briefs/` — existing briefs for context

Not authorized:
- Paid APIs without pre-approval
- Sources requiring credentials not in env
- Internal databases outside this project
```

## Orchestrator Composition Pattern

Orchestrators coordinate multiple agents. Their AGENTS.md looks different from IC agents — they delegate everything, implement nothing.

```markdown
---
name: CEO
role: manager
capabilities: agent coordination, budget allocation, pipeline management
reportsTo: board
---

# CEO Agent

Coordinate the pipeline. Assign work. Review output. Escalate to board for budget.

## Workflow Routing

| When... | Action |
|---|---|
| Research brief arrives | Assign to SkillBuilder |
| Skill built | Assign to QC |
| QC passes | Assign to Optimizer, then Marketing |
| QC fails | Return to SkillBuilder with specific failures |
| Budget alert >80% | Pause non-critical work, escalate to board |

## Delegation Rules

- Never implement directly — delegate to the right agent
- Always verify handoffs were received before marking done
- Track pipeline state — know what's in flight at all times
```

## Cross-Agent Communication

Agents communicate via four mechanisms. Good AGENTS.md documents which each agent uses:

| Mechanism | Use For |
|---|---|
| Issues (create/assign/comment) | Formal work assignment and handoff |
| Shared files (`skills/learnings/`, `skills/briefs/`) | Persistent knowledge transfer |
| Git commits | Audit trail and change history |
| @-mention in comments | Trigger a heartbeat in the mentioned agent |

## Composing a Team from AGENTS.md Files

A team is composable when each agent's AGENTS.md declares:
1. What it accepts (workflow routing triggers)
2. What it produces (output format and destination)
3. Who it hands off to (next stage in chain of command)

If every agent in the pipeline has these three things declared, the pipeline is self-documenting.
