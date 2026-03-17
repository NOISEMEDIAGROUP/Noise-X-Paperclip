# Core Structure: Full Annotated AGENTS.md Template

## The Four Blocks

Every AGENTS.md has exactly four blocks:

1. **Identity** — who this agent is
2. **Workflow Routing** — what it does and when
3. **Tool Access** — what it's allowed to use
4. **Anti-Rationalization** — what it tells itself to avoid its mandate

## Minimal Identity Block

```markdown
---
name: AgentName                  # Display name — used in comments and logs
slug: agent-name                 # URL-safe key — used in routing
role: researcher                 # researcher | engineer | qa | manager | writer
title: Human-readable job title
capabilities: comma-separated list of what this agent can do
reportsTo: manager-agent-name    # Chain of command — who to escalate to
---
```

## Workflow Routing Block

```markdown
## Workflow Routing

| When the request... | Route to |
|---|---|
| [trigger pattern 1] | [Workflow Name] |
| [trigger pattern 2] | [Workflow Name] |
| Default | [Default Workflow] |
```

The routing table IS the agent's mandate. Anything not in the table is out of scope.

## Tool Access Block

```markdown
## Tool Access

**Authorized:**
- Read, Glob, Grep — file reading
- [add what this role actually needs]

**Not authorized:**
- Write/Edit — not my role
- Bash — no commands needed
- [anything this role shouldn't have]
```

## Data Sources Block (optional, recommended)

```markdown
## Data Sources

Authorized to pull from:
- [Source 1] — [what it's used for]
- [Source 2] — [what it's used for]

Not authorized:
- [Forbidden source] — [why]
```

## Anti-Rationalization Block

Every AGENTS.md MUST have this section. It's the difference between an agent that stays on mandate and one that drifts.

```markdown
## Anti-Rationalization

| What you'll tell yourself | The truth |
|---|---|
| "[excuse to skip hard part]" | [why that excuse is wrong] |
| "[excuse to expand scope]" | [why staying in scope matters] |
| "[excuse to skip verification]" | [why verification matters] |
```

## Complete Template

```markdown
---
name: AgentName
slug: agent-name
role: [researcher | engineer | qa | manager | writer]
title: Human-readable job title
capabilities: comma-separated list of capabilities
reportsTo: manager-agent-name
---

# AgentName — Title

One-sentence description of what this agent does and why it exists.

## Workflow Routing

| When the request... | Route to |
|---|---|
| [primary trigger pattern] | [Primary Workflow] |
| [secondary trigger pattern] | [Secondary Workflow] |
| Default | [Default Workflow] |

## Tool Access

**Authorized:** [tools this role actually needs]
**Not authorized:** [tools this role should not have]

## Data Sources

- [Source] — [purpose]

## Anti-Rationalization

| What you'll tell yourself | The truth |
|---|---|
| "[excuse]" | "[truth]" |
```

## Field Reference

| Field | Required | Notes |
|---|---|---|
| name | Yes | Display name — shown in UI and comments |
| slug | Yes | Lowercase, hyphenated, URL-safe |
| role | Yes | researcher, engineer, qa, manager, writer |
| title | Yes | Human-readable description of the role |
| capabilities | Yes | Comma-separated list of what this agent can do |
| reportsTo | Yes | Manager's slug — enables escalation |
| Workflow Routing | Yes | At least 3 trigger patterns including a default |
| Tool Access | Yes | Explicit allow/deny list |
| Anti-Rationalization | Yes | At least 3 rows |
