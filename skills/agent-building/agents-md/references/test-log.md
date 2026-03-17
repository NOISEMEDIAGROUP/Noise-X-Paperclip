# Test Log: agents-md Skill

## Iteration 1 — 2026-03-17 (Initial Build)

### Trigger Test Results

| # | Prompt | Description Match | Result |
|---|--------|-------------------|--------|
| T1 | "write an AGENTS.md for my researcher agent" | "write an AGENTS.md" explicit phrase | ✅ PASS |
| T2 | "What goes in AGENTS.md vs CLAUDE.md?" | "CLAUDE.md vs AGENTS.md" phrase | ✅ PASS |
| T3 | "My CLAUDE.md is getting bloated with agent-specific rules" | "CLAUDE.md is bloated" + "agent-specific rules" | ✅ PASS |
| T4 | "How do I set up workflow routing for my agent?" | "workflow routing table" phrase | ✅ PASS |
| T5 | "Create an agent manifest for my builder" | "agent manifest" phrase | ✅ PASS |
| T6 | "What's the AGENTS.md format?" | "AGENTS.md" explicit | ✅ PASS |
| T7 | "Help me scope tool permissions per agent role" | "tool permissions per agent" phrase | ✅ PASS |
| T8 | "How do I configure agent-specific behavior separate from project settings?" | "agent-specific behavior" phrase | ✅ PASS |
| T9 | "Build an agent instructions file for my code reviewer" | "agent instructions file" phrase | ✅ PASS |
| T10 | "I want to create a workflow routing table for my Claude agent" | "workflow routing table" phrase | ✅ PASS |
| T11 | "What's the difference between CLAUDE.md and AGENTS.md?" | "CLAUDE.md vs AGENTS.md" phrase | ✅ PASS |
| T12 | "Show me an agent design template for an orchestrator" | "agent design" phrase | ✅ PASS |

**Trigger score: 12/12 (100%)**

### No-Fire Test Results

| # | Prompt | Description Exclusion | Result |
|---|--------|----------------------|--------|
| N1 | "Run my agents in parallel" | Explicit NOT-for: "agent tool mechanics or parallel execution" | ✅ PASS |
| N2 | "Set up a heartbeat for my agent" | Explicit NOT-for: "heartbeat/cron scheduling" | ✅ PASS |
| N3 | "Configure my MCP server" | Explicit NOT-for: "MCP server configuration" | ✅ PASS |
| N4 | "Help me debug my code systematically" | No match in description | ✅ PASS |
| N5 | "What is CLAUDE.md?" | No AGENTS.md authoring focus; description is about authoring AGENTS.md files | ✅ PASS |

**No-fire score: 5/5 (100%)**

### Output Test Results

| # | Scenario | Expected Content | Result |
|---|----------|-----------------|--------|
| O1 | Write an AGENTS.md for a researcher | Identity block + routing + tool access + templates ref | ✅ PASS |
| O2 | AGENTS.md vs CLAUDE.md question | Split rule + 01-split-rule.md reference | ✅ PASS |
| O3 | Build a workflow routing table | Table example + 03-workflow-routing.md reference | ✅ PASS |
| O4 | CLAUDE.md is bloated | Bloat diagnostic + 01-split-rule.md reference | ✅ PASS |
| O5 | Core structure of AGENTS.md | Four blocks + 02-core-structure.md reference | ✅ PASS |
| O6 | Scope tools for a reviewer | Least privilege + 04-tool-access.md reference | ✅ PASS |
| O7 | Wire agents into a team | Skills invocation + 05-composability.md reference | ✅ PASS |
| O8 | Give me a template | 06-templates.md reference + 4 template types | ✅ PASS |

**Output score: 8/8 (100%)**

### Summary

```
Total: 25/25 (100%)
Trigger: 12/12 (100%)
No-fire: 5/5 (100%)
Output: 8/8 (100%)
```

**Notes:**
- All 8 brief sections present (What is AGENTS.md, Split Rule, Core Structure, Workflow Routing, Tool Access, Composability, Templates, Anti-Patterns)
- NOT-for exclusions correctly prevent multi-agent-coordination, proactive-agent, and mcp-integration false fires
- Anti-rationalization table covers the 5 core excuses for avoiding AGENTS.md authoring
- 6 substantive reference files (no stubs) with copy-paste-ready content
- SKILL.md: 122 lines (well under 200 limit)
