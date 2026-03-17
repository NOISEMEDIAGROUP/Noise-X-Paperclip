# Test Cases: agents-md Skill

## Trigger Tests (Should Fire)

| # | Prompt | Expected |
|---|--------|----------|
| T1 | "I need to write an AGENTS.md for my researcher agent" | TRIGGER |
| T2 | "What goes in AGENTS.md vs CLAUDE.md?" | TRIGGER |
| T3 | "My CLAUDE.md is getting bloated with agent-specific rules" | TRIGGER |
| T4 | "How do I set up workflow routing for my agent?" | TRIGGER |
| T5 | "Create an agent manifest for my builder" | TRIGGER |
| T6 | "What's the AGENTS.md format?" | TRIGGER |
| T7 | "Help me scope tool permissions per agent role" | TRIGGER |
| T8 | "How do I configure agent-specific behavior separate from project settings?" | TRIGGER |
| T9 | "Build an agent instructions file for my code reviewer" | TRIGGER |
| T10 | "I want to create a workflow routing table for my Claude agent" | TRIGGER |
| T11 | "What's the difference between CLAUDE.md and AGENTS.md?" | TRIGGER |
| T12 | "Show me an agent design template for an orchestrator" | TRIGGER |

## No-Fire Tests (Should NOT Fire)

| # | Prompt | Expected | Correct Skill |
|---|--------|----------|---------------|
| N1 | "Run my agents in parallel" | NO TRIGGER | multi-agent-coordination |
| N2 | "Set up a heartbeat for my agent" | NO TRIGGER | proactive-agent |
| N3 | "Configure my MCP server" | NO TRIGGER | mcp-integration |
| N4 | "Help me debug my code systematically" | NO TRIGGER | systematic-debugging |
| N5 | "What is CLAUDE.md?" | NO TRIGGER | general question, no skill needed |

## Output Tests

After trigger, the skill should produce outputs containing:

| # | Scenario | Expected Output Contains |
|---|----------|--------------------------|
| O1 | "Write an AGENTS.md for a researcher" | Identity block + routing table + tool access + reference to 06-templates.md |
| O2 | "What belongs in AGENTS.md vs CLAUDE.md?" | Split rule + decision table reference (01-split-rule.md) |
| O3 | "How do I build a workflow routing table?" | Routing table example + trigger types + reference to 03-workflow-routing.md |
| O4 | "My CLAUDE.md is bloated" | Bloat diagnostic + split rule + reference to 01-split-rule.md |
| O5 | "Show me the core structure of AGENTS.md" | Four blocks: identity, routing, tool access, anti-rationalization + reference to 02-core-structure.md |
| O6 | "Help me scope tools for a reviewer agent" | Least privilege principle + reviewer access example + reference to 04-tool-access.md |
| O7 | "Wire my agents into a team" | Skills invocation + chain of command + reference to 05-composability.md |
| O8 | "Give me a template to start with" | Reference to 06-templates.md + 4 template types listed |
