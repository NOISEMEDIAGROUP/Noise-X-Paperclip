---
title: "CloudOps Pro — Company Reference"
description: "Complete reference for the CloudOps Pro managed cloud and DevOps services agent company"
---

# CloudOps Pro

**CloudOps Pro** is a reference `agentcompanies/v1` package for a fully managed cloud infrastructure and DevOps services company. It demonstrates how to model a security-first, multi-cloud operations team with measurable SLA commitments, automated cost governance, and an end-to-end incident-to-resolution loop.

**Package location:** `agents/cloudops-pro/`

## At a Glance

| Metric | Target | Owner |
|--------|--------|-------|
| Uptime SLA | 99.9% | UptimeGuard (SRE) |
| Cloud cost reduction | 30% | CostSage (FinOps Analyst) |
| Manual deployments | Zero | DeployBot (DevOps Engineer) |
| P3/P4 MTTR | Auto-resolve | UptimeGuard (SRE) |
| P1/P2 escalation | ≤ 5 minutes | UptimeGuard → CloudCTO |
| Security posture score | ≥ 85/100 | DriftGuard (Security Ops) |

---

## Org Structure

### Agents (8 total)

```
CloudCEO (CEO)
├── CloudCTO (CTO)
│   ├── ArchBot (Cloud Architect)
│   ├── DeployBot (DevOps Engineer)
│   └── UptimeGuard (SRE)
├── CostSage (FinOps Analyst)
├── DriftGuard (Security Operations Engineer)
└── SLAPilot (Program Manager)
```

### Agent Reference Table

| Slug | Name | Title | Reports To | Primary Mandate |
|------|------|-------|-----------|-----------------|
| `ceo` | CloudCEO | Chief Executive Officer | — (root) | Board operator, client SLA acceptance, budget governance |
| `cto` | CloudCTO | Chief Technology Officer | `ceo` | Engineering roadmap, architecture governance, P1/P2 incident command |
| `cloud-architect` | ArchBot | Cloud Architect | `cto` | IaC design, multi-cloud module library, CIS-compliant landing zones |
| `devops-engineer` | DeployBot | DevOps Engineer | `cto` | Zero-touch CI/CD, automated rollback, DORA metrics, SBOM |
| `sre` | UptimeGuard | Site Reliability Engineer | `cto` | SLO/SLA monitoring, incident runbooks, error budget management |
| `finops-analyst` | CostSage | FinOps Analyst | `ceo` | Cloud cost visibility, rightsizing, 30% cost reduction programme |
| `security-ops` | DriftGuard | Security Operations Engineer | `ceo` | CSPM, drift detection, compliance gating, secrets management |
| `program-manager` | SLAPilot | Program Manager | `ceo` | SLA tracking, client reporting, CAB, OKR governance |

### Teams (3 total)

| Team | Manager | Members | Focus |
|------|---------|---------|-------|
| Engineering | CloudCTO | ArchBot, DeployBot, UptimeGuard | Infrastructure, CI/CD, reliability |
| Governance | CloudCEO | DriftGuard, SLAPilot | Security compliance, SLA accountability |
| FinOps | CloudCEO | CostSage | Cloud cost governance |

---

## Projects

### Cloud Operations Platform (seed project)

The foundational project that delivers all platform capabilities before any client environment goes live.

| Task Slug | Assignee | Outcome |
|-----------|---------|---------|
| `iac-baseline` | ArchBot | CIS-compliant multi-cloud Terraform module library |
| `cicd-zero-touch` | DeployBot | GitHub Actions platform with three-gate approval and auto-rollback |
| `sre-monitoring-setup` | UptimeGuard | Full observability stack + 10+ automated incident runbooks |
| `cost-optimisation-baseline` | CostSage | Cost baseline, tagging governance, rightsizing recommendations |
| `security-drift-detection` | DriftGuard | CSPM integration, IaC security gates, compliance baselines |
| `sla-reporting-dashboard` | SLAPilot | Auto-generated weekly/monthly client reports |
| `incident-response-automation` | UptimeGuard | P3/P4 auto-resolve; P1/P2 escalate in under 5 minutes |

---

## Recurring Tasks

| Task | Cron | Timezone | Assignee | Purpose |
|------|------|----------|---------|---------|
| `daily-ops-standup` | `0 9 * * *` | UTC | SLAPilot | Team sync, SLA/cost/security health check |
| `weekly-cost-report` | `0 8 * * 1` | UTC | CostSage | Cloud cost breakdown, rightsizing, 30% reduction progress |
| `sla-health-check` | `*/15 * * * *` | UTC | UptimeGuard | 15-minute availability check, breach risk detection, auto-escalation |

---

## The Three-Gate Approval Chain

Every production deployment must pass three sequential gates. Gates are automated checks — they do not require human action unless a gate fails and the failure cannot be auto-resolved.

```
┌─────────────────────────────────────────────────────────┐
│                 PRODUCTION DEPLOYMENT                   │
│                                                         │
│  Gate 1: Security (DriftGuard)                         │
│  ├── checkov scan: zero HIGH/CRITICAL IaC findings     │
│  ├── tfsec scan: zero HIGH/CRITICAL findings           │
│  └── Pipeline YAML: no credential exposure             │
│                         ↓ PASS                         │
│  Gate 2: Cost (CostSage)                               │
│  ├── Estimated spend delta ≤ approved threshold        │
│  └── No active cost anomaly for affected environment   │
│                         ↓ PASS                         │
│  Gate 3: SLA (UptimeGuard)                             │
│  ├── No active P1/P2 incidents                         │
│  ├── Error budget not exhausted                        │
│  └── 30-day rolling availability ≥ 99.9%               │
│                         ↓ PASS                         │
│  DEPLOY                                                 │
│  └── Post-deploy health check (5 min window)           │
│      └── FAIL → Auto-rollback + P2 incident created    │
└─────────────────────────────────────────────────────────┘
```

New client environment onboardings additionally require **SLAPilot CAB sign-off**.

---

## Security Architecture

### Defence-in-depth Layers

1. **IaC Layer**: All infrastructure defined in code; `terraform apply` outside CI/CD is a P2 incident
2. **Pipeline Layer**: OIDC-based cloud auth; no long-lived access keys in CI; signed images only
3. **Runtime Layer**: Continuous CSPM every 15 minutes; drift = security incident
4. **Identity Layer**: Least-privilege IAM; quarterly entitlement review; 90-day inactivity flag
5. **Secret Layer**: Vault-backed secrets; automatic rotation every 90 days; detect-secrets pre-commit hook
6. **Network Layer**: No 0.0.0.0/0 ingress on sensitive ports; VPC flow logs enabled by default
7. **Compliance Layer**: CIS Benchmark L2 continuous; SOC 2 daily; NIST CSF weekly

### Compliance Frameworks

| Framework | Environments | Frequency | Owner |
|-----------|-------------|-----------|-------|
| CIS Benchmark Level 2 (AWS/Azure/GCP) | All | 15 min | DriftGuard |
| SOC 2 Type II | Production | Daily | DriftGuard |
| NIST CSF | Enterprise | Weekly | DriftGuard |
| PCI DSS (if applicable) | Card-data | Continuous | DriftGuard |

### Incident Severity & Response SLAs

| Priority | Definition | Auto-Remediate | Escalation SLA |
|----------|-----------|---------------|----------------|
| P1 | Full outage / SLA breach | No | 5 min → CloudCTO, 15 min → CloudCEO |
| P2 | Partial degradation > 50% | No | 15 min → CloudCTO |
| P3 | Minor degradation < 50% | Yes (runbook) | Notify SLAPilot |
| P4 | No user impact | Yes (runbook) | Log only |

---

## FinOps Governance

### 30% Cost Reduction Roadmap

| Quarter | Cumulative Target | Primary Lever |
|---------|------------------|--------------|
| Q1 | 10% | Rightsize oversized instances + eliminate idle resources |
| Q2 | 20% | Reserved Instance / Savings Plan purchases |
| Q3 | 28% | Spot/preemptible for batch + storage lifecycle tiering |
| Q4 | 30%+ | Architectural optimisation (data transfer, caching) |

### Budget Alerting

| Threshold | Action |
|-----------|--------|
| 80% of monthly budget | Soft alert: CostSage notified; low-priority tasks deprioritised |
| 90% of monthly budget | Hard alert: CloudCEO notified |
| 100% of monthly budget | Hard stop: agent auto-paused by Paperclip |
| 20% daily spend spike | Anomaly alert: CostSage investigates within 4 hours |

---

## Required Secrets

| Secret | Required For | Requirement |
|--------|-------------|-------------|
| `GH_TOKEN` | DeployBot | Required — GitHub Actions CI/CD access |
| `AWS_ACCESS_KEY_ID` | ArchBot, DeployBot, CostSage, DriftGuard | Required — AWS infrastructure |
| `AWS_SECRET_ACCESS_KEY` | ArchBot, DeployBot, CostSage, DriftGuard | Required — AWS infrastructure |
| `AZURE_SUBSCRIPTION_ID` | ArchBot, DeployBot, CostSage, DriftGuard | Optional — Azure environments |
| `AZURE_CLIENT_ID` | ArchBot, DriftGuard | Optional — Azure service principal |
| `AZURE_CLIENT_SECRET` | ArchBot, DriftGuard | Optional — Azure service principal |
| `GCP_PROJECT_ID` | ArchBot, DeployBot, CostSage, DriftGuard | Optional — GCP environments |
| `GCP_SERVICE_ACCOUNT_KEY` | ArchBot, DriftGuard | Optional — GCP service account |
| `PAGERDUTY_API_KEY` | UptimeGuard | Optional — P1/P2 incident escalation |
| `SLACK_WEBHOOK_URL` | UptimeGuard, SLAPilot | Optional — Notifications |
| `DATADOG_API_KEY` | UptimeGuard | Optional — Datadog observability |

All secrets are stored in Paperclip's secrets manager and injected at runtime. No secret should ever appear in IaC code, pipeline YAML, or agent output.

---

## Heartbeat Configuration

All 8 agents use a 300-second (5-minute) heartbeat with `wakeOnDemand: true`. The SLA health check fires every 15 minutes via the cron routine rather than using a shorter heartbeat interval — this pattern keeps heartbeat costs low while still meeting the 15-minute SLA monitoring SLA.

```yaml
# .paperclip.yaml excerpt
agents:
  sre:
    runtime:
      heartbeat:
        enabled: true
        intervalSec: 300    # agent heartbeat: 5 minutes
        wakeOnDemand: true  # wakes immediately on alert

routines:
  sla-health-check:
    task: tasks/sla-health-check/TASK.md
    schedule:
      timezone: UTC
      cron: "*/15 * * * *"  # check every 15 minutes
```

---

## Getting Started

### 1. Import the company

```bash
paperclipai company import --from agents/cloudops-pro
```

Or from GitHub:

```bash
paperclipai company import --from https://github.com/paperclipai/paperclip/tree/main/agents/cloudops-pro
```

### 2. Configure required secrets

```bash
paperclipai secrets set GH_TOKEN <your-github-token>
paperclipai secrets set AWS_ACCESS_KEY_ID <your-key-id>
paperclipai secrets set AWS_SECRET_ACCESS_KEY <your-secret-key>
```

### 3. Start the Cloud Operations Platform project

Once imported, the seven seed tasks in the `cloud-operations-platform` project are assigned and ready. Start with ArchBot's `iac-baseline` task — all other tasks have implicit dependencies on the IaC module library.

### 4. Run schema tests

```bash
vitest run tests/cloudops-pro/schema.test.ts
```

---

## Design Decisions

### Why is FinOps Analyst and Security Ops reporting to CEO?

Both CostSage and DriftGuard are governance functions that must have independence from the Engineering team they oversee. Reporting to CEO gives them authority to gate Engineering changes (via the three-gate approval chain) and escalate directly without going through CloudCTO.

### Why does SRE report to CTO?

UptimeGuard needs tight coordination with ArchBot (infrastructure changes) and DeployBot (deployments). The SRE function is operational engineering — close coupling with Engineering is correct. The independence constraint is satisfied by UptimeGuard's SLA gate authority (independent of CloudCTO's deployment authority).

### Why three recurring tasks instead of one?

The daily standup (SLAPilot), weekly cost report (CostSage), and SLA health check (UptimeGuard) run on different cadences and are owned by different agents with different concerns. Combining them would create coupling across governance domains and make it harder to reason about which agent is responsible for which check.

### Why OIDC instead of long-lived credentials?

OIDC eliminates the credential rotation burden and the risk of long-lived keys being leaked. The pipeline authenticates with a short-lived token issued by the cloud provider's OIDC endpoint, scoped to the specific repository and workflow. No secret needs to be stored in GitHub Secrets for cloud provider access.

---

## Testing

Run the full schema validation suite (no server required):

```bash
vitest run tests/cloudops-pro/schema.test.ts
```

The test suite covers:
- Top-level package file existence
- COMPANY.md frontmatter validation
- All 8 AGENTS.md files (name, title, reportsTo, paperclip skill)
- Org tree integrity (no cycles, all trace to CEO, correct reporting lines)
- All 3 TEAM.md files (name, manager)
- Cloud Operations Platform project + 7 seed tasks
- 3 recurring tasks (portable: `recurring: true`, no `startsAt`, no inline `schedule:`)
- `.paperclip.yaml` (heartbeat config × 8 agents, 3 routines, OIDC/secret declarations)
- README.md structure (Org Chart, Getting Started, SLA commitments, three-gate chain)
- Agent-specific content checks (IaC, zero-touch, SLA tiers, 30% reduction, drift, compliance)
