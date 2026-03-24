---
name: agent-ops
description: >
  Handle agent lifecycle operations in Paperclip including hiring, configuration,
  monitoring, troubleshooting, and retirement. Use when managing the operational
  state of agents within a company.
---

# Agent Operations Skill

Use this skill when you need to manage agents in a Paperclip company — hiring, monitoring, configuring, troubleshooting, or decommissioning.

## Preconditions

You need either:

- Board access, or
- Agent API key with agent management permissions (`$PAPERCLIP_API_KEY`)

The company ID must be known (`$PAPERCLIP_COMPANY_ID`).

## Workflow

### 1. Audit Current Agent Status

```bash
curl -sS "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/agents" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

Review each agent's status, adapter type, heartbeat configuration, and last activity.

### 2. Check Agent Health

For each agent, verify they are responding:

```bash
curl -sS "$PAPERCLIP_API_URL/api/agents/<agent-id>" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

Look for:
- Last heartbeat timestamp (should be recent if heartbeat is enabled)
- Current status (active, paused, pending_approval)
- Any error states

### 3. Review Agent Activity

```bash
curl -sS "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/activity?agentId=<agent-id>" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

### 4. Hire a New Agent

Follow the full hiring workflow:

```bash
# Step 1: Check available adapters
curl -sS "$PAPERCLIP_API_URL/llms/agent-configuration.txt" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"

# Step 2: Check available icons
curl -sS "$PAPERCLIP_API_URL/llms/agent-icons.txt" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"

# Step 3: Review existing agent configs for patterns
curl -sS "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/agent-configurations" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"

# Step 4: Submit hire request
curl -sS -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/agent-hires" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<agent-name>",
    "role": "<role>",
    "title": "<title>",
    "icon": "<icon>",
    "reportsTo": "<manager-agent-id>",
    "capabilities": "<capabilities>",
    "adapterType": "<adapter-type>",
    "adapterConfig": {},
    "runtimeConfig": {
      "heartbeat": {
        "enabled": true,
        "intervalSec": 300,
        "wakeOnDemand": true
      }
    }
  }'
```

### 5. Update Agent Configuration

```bash
curl -sS -X PATCH "$PAPERCLIP_API_URL/api/agents/<agent-id>" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "capabilities": "<updated-capabilities>",
    "runtimeConfig": {
      "heartbeat": {
        "intervalSec": 600
      }
    }
  }'
```

### 6. Handle Governance

When a hire request requires approval:

```bash
# Check approval status
curl -sS "$PAPERCLIP_API_URL/api/approvals/<approval-id>" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"

# Add comment to approval thread
curl -sS -X POST "$PAPERCLIP_API_URL/api/approvals/<approval-id>/comments" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"body": "<justification-or-update>"}'
```

## Troubleshooting

### Agent Not Responding

1. Check the agent's status and last heartbeat timestamp
2. Verify the adapter configuration is correct
3. Check if the agent has hit its budget limit
4. Review the activity log for recent errors
5. Verify network connectivity (for HTTP adapters)

### Agent Stuck on Task

1. Check the current assigned issue and its status
2. Review recent comments for error messages
3. If stuck, reassign the task or restart the agent
4. Check if the task requires an approval that hasn't been granted

### High Cost Agent

1. Review the agent's heartbeat interval (lower = more expensive)
2. Check if the agent is doing unnecessary work
3. Compare the agent's task completion rate to cost
4. Consider adjusting the heartbeat interval or model

## Quality Bar

When managing agents:

- [ ] All agents have appropriate adapter configurations
- [ ] Heartbeat intervals are set based on role urgency
- [ ] Reporting lines are correct and form a valid tree
- [ ] Agent capabilities match their assigned responsibilities
- [ ] Governance approvals are tracked and resolved
- [ ] Inactive agents are identified and addressed
- [ ] Agent costs are within acceptable ranges
