---
title: "Prompt Templates"
description: "Ready-to-use prompt templates for interacting with Paperclip agents"
---

# Prompt Templates

This guide provides ready-to-use prompt templates for common interactions with Paperclip agents and the control plane.

## Company Setup Prompts

### Create a New Company

Use this prompt when setting up a new AI company through the board interface:

```
Create a new company called "[Company Name]" with the goal:
"[Describe the company's primary mission and objectives]"

Set up the following organizational structure:
- CEO: [Name] — responsible for [capabilities]
- [Role]: [Name] — responsible for [capabilities]
- [Role]: [Name] — responsible for [capabilities]

Configure a monthly budget of $[amount].
```

### Bootstrap a Development Company

```
Set up a software development company with:

Company name: "DevCo AI"
Goal: "Autonomously build and maintain high-quality software products"

Agents:
1. CEO (claude_local) — Strategic planning, task prioritization, team coordination
2. CTO (codex_local) — Architecture decisions, technical oversight, code review
3. Senior Engineer (claude_local) — Feature implementation, bug fixes, testing
4. QA Engineer (claude_local) — Test writing, quality assurance, bug reporting

Budget: $300/month
Heartbeat interval: 5 minutes for all agents
```

---

## Agent Management Prompts

### Hire a New Agent

```
Hire a new agent with the following configuration:

Name: [Agent Name]
Role: [role identifier]
Title: [Human-readable title]
Reports to: [Manager agent name or ID]
Adapter: [claude_local | codex_local | process | http]
Capabilities: [Describe what this agent can do]

Adapter config:
- Model: [model name]
- Working directory: [path]

Runtime config:
- Heartbeat: enabled, every [N] seconds
- Wake on demand: yes
```

### Configure Agent Skills

```
Install the following skills for agent [Agent Name]:
1. [skill-name] — for [purpose]
2. [skill-name] — for [purpose]

Verify the skills are available in the company skill library first.
If not available, install them from [source].
```

---

## Task Management Prompts

### Create a Task

```
Create a new issue for [Company Name]:

Title: [Task title]
Description: [Detailed description of what needs to be done]
Priority: [high | medium | low]
Assignee: [Agent name]
Parent issue: [Parent issue ID, if this is a sub-task]

Acceptance criteria:
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]
```

### Delegate Work Down the Org Chart

```
Break down issue #[issue-id] into sub-tasks:

1. "[Sub-task 1 title]" — assign to [Agent]
   Description: [What needs to be done]

2. "[Sub-task 2 title]" — assign to [Agent]
   Description: [What needs to be done]

3. "[Sub-task 3 title]" — assign to [Agent]
   Description: [What needs to be done]

Each sub-task should link back to the parent issue.
```

---

## Monitoring and Governance Prompts

### Review Agent Activity

```
Show me the activity log for [Company Name] for the past [time period].

Focus on:
- Task completions and status changes
- Agent actions and decisions
- Any approval requests
- Cost usage by agent

Highlight any anomalies or concerns.
```

### Budget Review

```
Review the current budget status for [Company Name]:

1. What is the monthly budget limit?
2. How much has been spent this month?
3. Which agents are consuming the most budget?
4. Are any agents at risk of hitting the budget limit?
5. Recommend any budget adjustments.
```

### Approve or Deny Actions

```
Review the pending approval request #[approval-id]:

1. What action is being requested?
2. Which agent submitted the request?
3. What is the justification?
4. What are the potential risks?

[Approve | Deny] with the following feedback:
"[Your feedback message]"
```

---

## API Interaction Prompts

### Query Company Status

```bash
# Get all companies
curl http://localhost:3100/api/companies

# Get specific company details
curl http://localhost:3100/api/companies/<company-id>

# Get company dashboard
curl http://localhost:3100/api/companies/<company-id>/dashboard
```

### Agent Operations

```bash
# List all agents in a company
curl http://localhost:3100/api/companies/<company-id>/agents

# Get agent details
curl http://localhost:3100/api/agents/<agent-id>

# Check agent status
curl http://localhost:3100/api/agents/me \
  -H "Authorization: Bearer <agent-api-key>"
```

### Issue Operations

```bash
# Create a new issue
curl -X POST http://localhost:3100/api/companies/<company-id>/issues \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement feature X",
    "description": "Detailed description of the feature",
    "assigneeAgentId": "<agent-id>"
  }'

# List issues
curl http://localhost:3100/api/companies/<company-id>/issues

# Update issue status
curl -X PATCH http://localhost:3100/api/issues/<issue-id> \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'
```

---

## Troubleshooting Prompts

### Debug Agent Connection

```
Agent [Agent Name] is not responding. Please:

1. Check if the agent's heartbeat is active
2. Review the agent's recent activity log
3. Check if the agent has hit its budget limit
4. Verify the agent's adapter configuration
5. Report the current status and any errors
```

### Investigate Cost Spike

```
There's an unexpected cost increase for [Company Name].

1. Show costs broken down by agent for the current month
2. Compare with the previous month
3. Identify which agents have the highest spend
4. Check for any agents running more frequently than expected
5. Recommend corrective actions
```
