# The Split Rule: CLAUDE.md vs AGENTS.md

One rule: **shared project context → CLAUDE.md; agent-specific behavior → AGENTS.md.**

## Decision Table

| Item | CLAUDE.md | AGENTS.md | Why |
|------|-----------|-----------|-----|
| Coding style guide | ✅ | | All agents follow the same coding standards |
| Commit message format | ✅ | | Project-wide convention |
| How tests are structured | ✅ | | Applies to anyone writing tests |
| Database migration rules | ✅ | | Project convention, not agent-specific |
| API error handling patterns | ✅ | | Shared technical convention |
| Company context and background | ✅ | | Shared context for all agents |
| Tech stack overview | ✅ | | All agents need this |
| Security rules | ✅ | | Apply to all agents equally |
| Agent name and role | | ✅ | Each agent has a unique identity |
| What tasks this agent handles | | ✅ | Agent's mandate, not project context |
| Which other agents to escalate to | | ✅ | Agent-specific chain of command |
| Tool access limits | | ✅ | Scoped to this agent's role |
| Anti-rationalization table | | ✅ | Prevents this specific agent from drifting |
| Approved data sources | | ✅ | What this agent is authorized to use |
| Workflow routing table | | ✅ | How this agent routes its own requests |
| Which skills this agent invokes | | ✅ | Agent's capability declarations |
| Forbidden actions for this agent | | ✅ | Role-specific constraints |
| When to escalate to a human | | ✅ | Agent-specific escalation thresholds |
| Output format | Either | Either | Project-wide → CLAUDE.md; role-specific → AGENTS.md |
| Response tone and voice | Either | Either | Consistent across agents → CLAUDE.md; role-specific → AGENTS.md |

## Quick Diagnostic

**Adding to CLAUDE.md?** Ask: "Which agents does this apply to?"
- All of them → stays in CLAUDE.md
- Just [AgentName] → move to `agents/[agent]/AGENTS.md`

**Adding to AGENTS.md?** Ask: "Does any other agent need this?"
- Yes → move to CLAUDE.md
- No → stays in AGENTS.md

## The Bloat Diagnostic

Run this when CLAUDE.md exceeds 200 lines:

1. Read each rule in CLAUDE.md
2. Ask: "Which agents does this apply to?"
3. If "all of them" → stays
4. If "just [AgentName]" → move to `agents/[agent]/AGENTS.md`

Common CLAUDE.md bloat sources (all should move to AGENTS.md):
- "The ResearchAgent should always search ClawHub first"
- "The ReviewerAgent should never approve without running tests"
- "[BuilderAgent]-specific tool access rules"
- "When the QC agent receives a skill, it should..."
- Any rule that names a specific agent role
