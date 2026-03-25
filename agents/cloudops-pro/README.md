# CloudOps Pro

> Deliver fully managed cloud infrastructure operations and cost optimisation as a service.

CloudOps Pro is an autonomous AI company that manages cloud infrastructure end-to-end — from IaC design and zero-touch deployments to real-time SRE monitoring, FinOps cost governance, and automated security compliance. It targets three quantifiable outcomes:

| Commitment | Target | Owner |
|-----------|--------|-------|
| Uptime SLA | 99.9% | UptimeGuard (SRE) |
| Cloud cost reduction | 30% | CostSage (FinOps) |
| Manual deployments | Zero | DeployBot (DevOps) |

## What This Company Does

CloudOps Pro operates a fully automated cloud operations lifecycle:

1. **Design** — ArchBot designs CIS-compliant IaC templates across AWS, Azure, and GCP
2. **Deploy** — DeployBot runs zero-touch CI/CD pipelines with automated rollback and SBOM signing
3. **Monitor** — UptimeGuard tracks SLOs, fires automated runbooks for P3/P4 incidents, and escalates P1/P2 in under 5 minutes
4. **Optimise** — CostSage analyses cloud spend, rightsizes resources, and drives toward the 30% reduction target
5. **Secure** — DriftGuard runs continuous CSPM, gates every change through security scanning, and enforces compliance baselines
6. **Report** — SLAPilot generates automated weekly SLA and cost reports for every client

## Org Chart

| Agent | Title | Reports To | Role |
|---|---|---|---|
| CloudCEO | Chief Executive Officer | — | CEO (Board Operator) |
| CloudCTO | Chief Technology Officer | CloudCEO | Engineering lead |
| ArchBot | Cloud Architect | CloudCTO | IaC design and multi-cloud templates |
| DeployBot | DevOps Engineer | CloudCTO | CI/CD and zero-touch deployments |
| UptimeGuard | Site Reliability Engineer | CloudCTO | Uptime monitoring and incident response |
| CostSage | FinOps Analyst | CloudCEO | Cloud cost governance and reduction |
| DriftGuard | Security Operations Engineer | CloudCEO | Drift detection and compliance |
| SLAPilot | Program Manager | CloudCEO | SLA tracking and client reporting |

### Org Tree

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

## Teams

| Team | Manager | Members |
|---|---|---|
| Engineering | CloudCTO | ArchBot, DeployBot, UptimeGuard |
| Governance | CloudCEO | DriftGuard, SLAPilot |
| FinOps | CloudCEO | CostSage |

## Projects

### Cloud Operations Platform

The foundational project that delivers all core capabilities before the first client environment goes live.

| Task | Assignee | Outcome |
|---|---|---|
| Build multi-cloud IaC baseline module library | ArchBot | CIS-compliant Terraform modules for AWS, Azure, GCP |
| Implement zero-touch CI/CD deployment platform | DeployBot | GitHub Actions platform with automated rollback |
| Deploy SRE observability stack and incident runbooks | UptimeGuard | Full observability + 10+ automated runbooks |
| Establish cloud cost visibility and 30% reduction baseline | CostSage | Cost baseline, tagging governance, rightsizing recommendations |
| Implement continuous security drift detection and compliance pipeline | DriftGuard | CSPM integration, IaC security gates, compliance baselines |
| Build automated SLA reporting and client dashboard | SLAPilot | Auto-generated weekly/monthly client reports |
| Build automated incident-to-resolution loop | UptimeGuard | P3/P4 auto-resolve; P1/P2 escalate in <5 min |

## Recurring Tasks

| Task | Schedule | Assignee | Purpose |
|---|---|---|---|
| Daily Ops Standup | Daily at 09:00 UTC | SLAPilot | Team sync, blocker surfacing, SLA/cost/security health |
| Weekly Cloud Cost Report | Mondays at 08:00 UTC | CostSage | Cost breakdown, rightsizing flags, 30% reduction progress |
| SLA Health Check | Every 15 minutes | UptimeGuard | Availability monitoring, breach risk detection, auto-escalation |

## Three-Gate Approval Chain

Every production deployment must clear three gates in order:

```
1. Security Gate (DriftGuard)
   └── IaC checkov/tfsec: zero HIGH/CRITICAL findings
   └── Pipeline YAML reviewed for credential exposure

2. Cost Gate (CostSage)
   └── Estimated spend delta within approved budget threshold

3. SLA Gate (UptimeGuard)
   └── No active P1/P2 incidents
   └── Error budget healthy (not exhausted)
```

Production deployments for new client environments additionally require **SLAPilot CAB sign-off**.

## Getting Started

Import this company into your Paperclip instance:

```bash
paperclipai company import --from agents/cloudops-pro
```

Or from GitHub:

```bash
paperclipai company import --from https://github.com/paperclipai/paperclip/tree/main/agents/cloudops-pro
```

### Environment Secrets

Configure secrets after import:

| Secret | Agents | Requirement |
|---|---|---|
| `GH_TOKEN` | DeployBot | Required — GitHub Actions access for CI/CD pipelines |
| `AWS_ACCESS_KEY_ID` | ArchBot, DeployBot, CostSage, DriftGuard | Required — AWS infrastructure access |
| `AWS_SECRET_ACCESS_KEY` | ArchBot, DeployBot, CostSage, DriftGuard | Required — AWS infrastructure access |
| `AZURE_SUBSCRIPTION_ID` | ArchBot, DeployBot, CostSage, DriftGuard | Optional — Azure environments |
| `AZURE_CLIENT_ID` | ArchBot, DriftGuard | Optional — Azure service principal |
| `AZURE_CLIENT_SECRET` | ArchBot, DriftGuard | Optional — Azure service principal |
| `GCP_PROJECT_ID` | ArchBot, DeployBot, CostSage, DriftGuard | Optional — GCP environments |
| `GCP_SERVICE_ACCOUNT_KEY` | ArchBot, DriftGuard | Optional — GCP service account |
| `PAGERDUTY_API_KEY` | UptimeGuard | Optional — P1/P2 incident escalation |
| `SLACK_WEBHOOK_URL` | UptimeGuard, SLAPilot | Optional — Slack notifications |
| `DATADOG_API_KEY` | UptimeGuard | Optional — Datadog observability platform |

## References

- [Agent Companies Specification](https://agentcompanies.io/specification)
- [Paperclip](https://github.com/paperclipai/paperclip)
