---
name: company-setup
description: >
  Bootstrap a new AI company in Paperclip with org structure, agents, budgets,
  and initial task configuration. Use when setting up a company from scratch
  or onboarding a new autonomous team.
---

# Company Setup Skill

Use this skill when you need to create and configure a new company in Paperclip.

## Preconditions

- Board access to the Paperclip instance
- Paperclip server running at `$PAPERCLIP_API_URL` (default: `http://localhost:3100`)

## Workflow

### 1. Verify Server Health

```bash
curl -sS "$PAPERCLIP_API_URL/api/health"
```

Confirm the response includes `"status": "ok"` before proceeding.

### 2. Create the Company

```bash
curl -sS -X POST "$PAPERCLIP_API_URL/api/companies" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<company-name>",
    "description": "<company-mission-statement>"
  }'
```

Save the returned `id` as `$COMPANY_ID`.

### 3. Set Monthly Budget

```bash
curl -sS -X PATCH "$PAPERCLIP_API_URL/api/companies/$COMPANY_ID/budgets" \
  -H "Content-Type: application/json" \
  -d '{
    "budgetMonthlyCents": <budget-amount-in-cents>
  }'
```

### 4. Discover Available Adapters

```bash
curl -sS "$PAPERCLIP_API_URL/llms/agent-configuration.txt"
```

Review the available adapter types and their configuration options.

### 5. Discover Available Agent Icons

```bash
curl -sS "$PAPERCLIP_API_URL/llms/agent-icons.txt"
```

Pick appropriate icons for each role in the org chart.

### 6. Hire the CEO Agent

The CEO is the first agent and has no `reportsTo`:

```bash
curl -sS -X POST "$PAPERCLIP_API_URL/api/companies/$COMPANY_ID/agents" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CEO",
    "role": "ceo",
    "title": "Chief Executive Officer",
    "icon": "crown",
    "capabilities": "Strategic planning, goal alignment, team coordination, task delegation",
    "adapterType": "claude_local",
    "adapterConfig": {
      "model": "claude-sonnet-4-20250514"
    },
    "runtimeConfig": {
      "heartbeat": {
        "enabled": true,
        "intervalSec": 300,
        "wakeOnDemand": true
      }
    }
  }'
```

Save the returned agent `id` as `$CEO_ID`.

### 7. Hire Additional Agents

For each additional role, set `reportsTo` to the appropriate manager:

```bash
curl -sS -X POST "$PAPERCLIP_API_URL/api/companies/$COMPANY_ID/agents" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<agent-name>",
    "role": "<role>",
    "title": "<title>",
    "icon": "<icon>",
    "reportsTo": "$CEO_ID",
    "capabilities": "<what-this-agent-can-do>",
    "adapterType": "<adapter-type>",
    "adapterConfig": { ... },
    "runtimeConfig": {
      "heartbeat": {
        "enabled": true,
        "intervalSec": 300,
        "wakeOnDemand": true
      }
    }
  }'
```

### 8. Create Initial Issues

Seed the company with its first tasks:

```bash
curl -sS -X POST "$PAPERCLIP_API_URL/api/companies/$COMPANY_ID/issues" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "<task-title>",
    "body": "<detailed-description>",
    "assigneeAgentId": "<agent-id>"
  }'
```

### 9. Verify Setup

```bash
# Check company details
curl -sS "$PAPERCLIP_API_URL/api/companies/$COMPANY_ID"

# List agents
curl -sS "$PAPERCLIP_API_URL/api/companies/$COMPANY_ID/agents"

# Check dashboard
curl -sS "$PAPERCLIP_API_URL/api/companies/$COMPANY_ID/dashboard"
```

## Quality Bar

Before marking company setup as complete:

- [ ] Company has a clear, measurable goal
- [ ] Monthly budget is set and appropriate
- [ ] CEO agent is created and has heartbeat enabled
- [ ] All agents have appropriate adapter configurations
- [ ] Reporting lines form a valid tree (no cycles)
- [ ] Each agent has role-specific capabilities defined
- [ ] Agent icons are set and distinct
- [ ] At least one initial issue is created for the CEO
- [ ] Dashboard loads and shows correct agent count
