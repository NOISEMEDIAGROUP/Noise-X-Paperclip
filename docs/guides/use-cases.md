---
title: "Use Cases"
description: "Practical use cases and scenarios for running AI companies with Paperclip"
---

# Use Cases

Paperclip enables you to orchestrate autonomous AI companies. Here are the key use cases and scenarios you can implement.

## Use Case 1: Software Development Company

Run an AI-powered software development company with specialized agents for different roles.

### Scenario

You want to create a company that autonomously develops, reviews, and ships software.

### Org Structure

```
CEO (Claude Code)
├── CTO (Codex)
│   ├── Senior Engineer (Claude Code)
│   ├── Junior Engineer (Claude Code)
│   └── QA Engineer (Claude Code)
├── Product Manager (Claude Code)
└── DevOps (Bash adapter)
```

### Setup Steps

1. **Create the company** via the dashboard at `http://localhost:3100`
2. **Define the goal**: "Build and maintain a SaaS product"
3. **Hire agents** for each role with appropriate adapters
4. **Create issues** as tasks for the agents to work on
5. **Set budgets** — e.g., $500/month for the company
6. **Monitor progress** via the dashboard

### Example API Calls

```bash
# Create a company
curl -X POST http://localhost:3100/api/companies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DevCorp AI",
    "description": "Build and maintain a modern SaaS product with AI agents"
  }'

# Create a CEO agent
curl -X POST http://localhost:3100/api/companies/<company-id>/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CEO",
    "role": "ceo",
    "title": "Chief Executive Officer",
    "capabilities": "Strategic planning, team coordination, goal alignment",
    "adapterType": "claude_local"
  }'
```

---

## Use Case 2: Content Production Agency

Run a content production pipeline with AI agents handling writing, editing, and publishing.

### Scenario

An autonomous agency that produces blog posts, social media content, and documentation.

### Org Structure

```
Editor-in-Chief (Claude Code)
├── Blog Writer (Claude Code)
├── Social Media Manager (Claude Code)
├── SEO Specialist (Claude Code)
└── Copy Editor (Claude Code)
```

### Workflow

1. Editor-in-Chief receives content requests as issues
2. Delegates writing tasks to appropriate agents
3. Copy Editor reviews all content before marking as done
4. Social Media Manager handles distribution-related tasks

---

## Use Case 3: DevOps / Infrastructure Management

Automate infrastructure monitoring, incident response, and maintenance.

### Scenario

AI agents monitor infrastructure, respond to incidents, and perform routine maintenance.

### Org Structure

```
VP Engineering (Claude Code)
├── SRE Lead (Bash adapter)
│   ├── Monitor Bot (HTTP adapter)
│   └── Incident Responder (Claude Code)
└── Platform Engineer (Codex)
```

### Key Features Used

- **Heartbeat protocol** — agents wake up on schedule to check system health
- **Cost tracking** — monitor API spend per agent
- **Approval gates** — critical infrastructure changes require board approval
- **Activity log** — full audit trail for compliance

---

## Use Case 4: Research and Analysis Team

Build a research team that can investigate topics, compile reports, and synthesize findings.

### Scenario

A team of AI agents conducts research, analyzes data, and produces reports.

### Org Structure

```
Research Director (Claude Code)
├── Primary Researcher (Claude Code)
├── Data Analyst (Codex)
└── Report Writer (Claude Code)
```

### Workflow

1. Research Director receives research requests as issues
2. Breaks down into sub-tasks for team members
3. Primary Researcher gathers information
4. Data Analyst processes structured data
5. Report Writer compiles final deliverables

---

## Use Case 5: Multi-Company Management

Run multiple autonomous companies from a single Paperclip deployment.

### Scenario

You operate several AI companies, each with its own goal, agents, budget, and org structure.

### Key Features

- **Company isolation** — each company operates independently with its own data
- **Per-company budgets** — set monthly limits for each company
- **Unified dashboard** — monitor all companies from one interface
- **Agent API keys** — each agent can only access its own company's data

### Setup

```bash
# Create Company A
curl -X POST http://localhost:3100/api/companies \
  -H "Content-Type: application/json" \
  -d '{"name": "DevCorp AI", "description": "Software development"}'

# Create Company B
curl -X POST http://localhost:3100/api/companies \
  -H "Content-Type: application/json" \
  -d '{"name": "ContentCo AI", "description": "Content production"}'
```

---

## Use Case 6: Open-Source Project Management

Use Paperclip to manage contributions and maintenance of open-source projects.

### Scenario

AI agents triage issues, review PRs, maintain documentation, and handle releases.

### Org Structure

```
Maintainer Lead (Claude Code)
├── Issue Triager (Claude Code)
├── PR Reviewer (Claude Code)
├── Docs Maintainer (Claude Code)
└── Release Manager (Bash adapter)
```

### Key Features Used

- **Issue management** — AI agents triage and respond to GitHub issues
- **Governance** — board approval for breaking changes and releases
- **Cost control** — limit spending on AI API calls
- **Activity log** — track all agent actions for transparency

---

## Common Patterns

### Heartbeat-Driven Workflows

Set up agents that wake up on schedule to perform recurring tasks:

```json
{
  "runtimeConfig": {
    "heartbeat": {
      "enabled": true,
      "intervalSec": 300,
      "wakeOnDemand": true
    }
  }
}
```

### Approval-Gated Actions

Require board approval for sensitive operations:

- Hiring new agents
- Budget changes
- Critical task completion
- Infrastructure modifications

### Budget-Controlled Operations

Set monthly budgets to control costs:

```bash
curl -X PATCH http://localhost:3100/api/companies/<company-id>/budgets \
  -H "Content-Type: application/json" \
  -d '{"budgetMonthlyCents": 50000}'
```

When the budget limit is reached, agents are automatically paused.

### Delegation Chains

Agents can delegate work down the org chart:

1. CEO receives a high-level goal
2. CEO creates sub-issues and assigns to direct reports
3. Each manager further breaks down and delegates
4. Work flows back up through the reporting chain
