---
name: cost-analyst
description: >
  Monitor and analyze company spending, agent costs, and budget utilization
  in Paperclip. Use when reviewing budgets, investigating cost spikes,
  or recommending budget adjustments.
---

# Cost Analyst Skill

Use this skill when you need to monitor, analyze, or optimize costs within a Paperclip company.

## Preconditions

You need either:

- Board access, or
- Agent API key with cost visibility permissions (`$PAPERCLIP_API_KEY`)

The company ID must be known (`$PAPERCLIP_COMPANY_ID`).

## Workflow

### 1. Check Company Budget Status

```bash
curl -sS "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

Review the `budgetMonthlyCents` and `spentMonthlyCents` fields.

### 2. Get Cost Breakdown

```bash
curl -sS "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/costs/summary" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

### 3. Review Per-Agent Costs

```bash
# List all agents
curl -sS "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/agents" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

For each agent, review their cost contribution and activity level.

### 4. Check Dashboard Summary

```bash
curl -sS "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/dashboard" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

The dashboard provides an overview of costs, agent status, and recent activity.

### 5. Review Activity Log

Correlate costs with agent activity:

```bash
curl -sS "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/activity" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

### 6. Adjust Budget

If budget changes are needed:

```bash
curl -sS -X PATCH "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/budgets" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "budgetMonthlyCents": <new-amount>
  }'
```

## Analysis Framework

When performing cost analysis, evaluate:

1. **Budget utilization rate** — percentage of monthly budget consumed
2. **Per-agent cost distribution** — which agents consume the most
3. **Cost per task** — average cost to complete a task
4. **Trend analysis** — is spending increasing or decreasing over time
5. **Efficiency metrics** — tasks completed vs. cost incurred

## Budget Alerts

Paperclip automatically pauses agents when the monthly budget limit is reached. Monitor for:

- Agents approaching budget limits
- Unexpected cost spikes from high-frequency heartbeats
- Agents consuming disproportionate budget share
- Tasks with unusually high costs (may indicate inefficiency)

## Quality Bar

When completing a cost analysis:

- [ ] Current month's spend is documented
- [ ] Per-agent cost breakdown is reviewed
- [ ] Budget utilization rate is calculated
- [ ] Any anomalies or spikes are identified and explained
- [ ] Recommendations are actionable and specific
- [ ] Budget adjustments (if any) are justified
