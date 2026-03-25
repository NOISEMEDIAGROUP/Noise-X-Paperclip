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

## Use Case 3: Managed Cloud & DevOps Services

A fully autonomous cloud operations company that manages client infrastructure end-to-end — from IaC design and zero-touch deployments to SRE monitoring, FinOps governance, and automated security compliance.

**Reference implementation:** [`agents/cloudops-pro/`](../../agents/cloudops-pro/) — see [CloudOps Pro company reference](../companies/cloudops-pro.md)

### Scenario

CloudOps Pro operates a managed services business with measurable client commitments: 99.9% uptime SLA, 30% cloud cost reduction, and zero manual deployments.

### Org Structure

```
CloudCEO (CEO)
├── CloudCTO (CTO)
│   ├── ArchBot (Cloud Architect) — IaC modules, CIS-compliant landing zones
│   ├── DeployBot (DevOps Engineer) — Zero-touch CI/CD, automated rollback
│   └── UptimeGuard (SRE) — SLO monitoring, automated incident runbooks
├── CostSage (FinOps Analyst) — Cost governance, 30% reduction programme
├── DriftGuard (Security Ops) — CSPM, drift detection, compliance gating
└── SLAPilot (Program Manager) — SLA tracking, client reporting, CAB
```

### Key Features Demonstrated

- **Three-gate approval chain** — Security (DriftGuard) → Cost (CostSage) → SLA (UptimeGuard) before every production deployment
- **Automated incident-to-resolution loop** — P3/P4 auto-resolve via runbooks; P1/P2 escalate in under 5 minutes
- **Portable recurring tasks** — SLA health check fires every 15 minutes via cron; weekly cost report every Monday; daily standup at 09:00 UTC
- **Multi-cloud IaC governance** — Terraform modules with checkov/tfsec security gates; drift detection every 15 minutes
- **FinOps programme** — Cost baseline, rightsizing recommendations, Reserved Instance strategy, anomaly detection
- **Budget caps** — 80% soft alert, 100% agent auto-pause; per-agent and company-level budgets

### Paperclip Features Used

- **Heartbeat protocol** — all 8 agents wake every 5 minutes; SRE also wakes on demand from alerts
- **Recurring tasks** — 3 cron-scheduled routines (standup, cost report, SLA check)
- **Approval gates** — production deployments require three-gate sign-off
- **Budget enforcement** — per-agent monthly budgets with hard-stop auto-pause
- **Activity log** — full audit trail for all deployments, incidents, and compliance actions
- **Secrets management** — cloud provider credentials, API keys, and tokens stored in Paperclip secrets

---

## Use Case 4: AI-Powered IT Helpdesk

A fully autonomous IT helpdesk company that handles Tier 1–3 support tickets — from instant FAQ resolution to deep root cause analysis — with measurable SLA compliance and real-time CSAT measurement.

**Reference implementation:** [`agents/support-genius/`](../../agents/support-genius/) — see [SupportGenius AI company reference](../companies/support-genius.md)

### Scenario

SupportGenius AI operates an IT helpdesk with four quantifiable service commitments: sub-2-hour first response, 95% first-contact resolution, 4.8/5 CSAT, and <1% SLA breach rate.

### Org Structure

```
SupportCEO (CEO)
├── SupportDirector (Support Director)
│   ├── TriageBot (L1 Support Agent) — First-touch triage, KB-matched auto-resolution
│   ├── DiagnosBot (L2 Support Agent) — Deep diagnostics, runbook execution
│   └── RootCauseBot (L3 Specialist) — Root cause analysis, post-mortems, escalations
├── KnowledgeKeeper (Knowledge Manager) — KB lifecycle, gap analysis, deflection metrics
├── SLAGuard (SLA Monitor) — Queue health checks every 15 min, breach alerting
└── CSATInsight (CSAT Analyst) — Satisfaction scoring, trend reporting
```

### Key Features Demonstrated

- **Ticket escalation chain** — L1 auto-resolves KB-matched tickets; L2 executes runbooks; L3 produces engineering-grade post-mortems; all escalation boundaries have approval gates
- **KB confidence scoring gate** — ≥90% confidence: auto-close; 70–89%: suggest-and-confirm; <70%: escalate to L2 with KB candidates attached
- **SLA queue health checks** — SLAGuard scans the entire queue every 15 minutes; fires breach risk alerts at 80% SLA elapsed before any deadline expires
- **CSAT measurement pipeline** — Survey sent within 10 minutes of every ticket close; low-CSAT root cause analysis triggered for any ticket scoring < 4.0
- **Knowledge governance gate** — No KB article published without KnowledgeKeeper review; PII gate enforced on every article
- **Governance independence** — KnowledgeKeeper, SLAGuard, and CSATInsight all report directly to CEO, not to SupportDirector, giving them authority to surface findings independently

### Paperclip Features Used

- **Heartbeat protocol** — all 8 agents wake every 5 minutes; L1, SLA Monitor, and L3 also wake on demand when new tickets arrive or P1/P2 alerts fire
- **Recurring tasks** — 3 cron-scheduled routines (daily standup, weekly CSAT report, 15-minute SLA check)
- **Approval gates** — L3 external escalations require SupportDirector sign-off and CEO awareness
- **Budget enforcement** — per-agent monthly budgets with hard-stop auto-pause; cost per ticket visible to board
- **Activity log** — full audit trail for all triage decisions, escalations, KB publishes, and CSAT scores
- **Secrets management** — helpdesk API keys, email service credentials, and integration tokens stored in Paperclip secrets

---

## Use Case 5: Research and Analysis Team

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

## Use Case 6: Multi-Company Management

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

## Use Case 7: Open-Source Project Management

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

## Use Case 8: Multi-Gate Security and Cost Governance

Apply automated approval gates to every infrastructure change, combining security scanning, cost estimation, and SLA risk checks before any change reaches production.

### Scenario

A platform team needs to ensure that no deployment can bypass compliance checks, exceed cost thresholds, or risk an SLA breach — even when agents are running autonomously.

### Pattern: Three-Gate Deployment Chain

```
CI Pipeline
  └── Gate 1: DriftGuard runs checkov + tfsec
       └── Zero HIGH/CRITICAL findings → proceed
       └── FAIL → block deployment, create task for ArchBot
  └── Gate 2: CostSage validates cost delta
       └── Estimated change ≤ approved threshold → proceed
       └── FAIL → block deployment, escalate to CloudCEO
  └── Gate 3: UptimeGuard SLA risk check
       └── No active incidents + error budget healthy → proceed
       └── FAIL → defer deployment, notify SLAPilot
  └── Deploy + Post-deploy health check (5 min)
       └── Health check fails → Auto-rollback + P2 incident
```

This pattern is implemented in the [CloudOps Pro](../companies/cloudops-pro.md) reference company and can be adapted for any infrastructure-heavy agent company.

### Key Paperclip Features

- **Multi-agent approval chain** — gates coordinate across DriftGuard, CostSage, and UptimeGuard
- **Automated rollback tasks** — created automatically by DeployBot on health check failure
- **Budget gates** — CostSage uses `GET /api/companies/{id}/costs/summary` to estimate delta
- **SLA gates** — UptimeGuard checks error budget burn rate before approving high-risk changes

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
