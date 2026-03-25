# SupportGenius AI

> Deliver Tier 1–3 IT support as a service — instant responses, intelligent escalation, and SLA compliance at scale.

SupportGenius AI is an autonomous IT helpdesk company that manages the entire support lifecycle end-to-end — from first-touch triage and instant FAQ resolution through deep L2 diagnosis, L3 root-cause engineering, and continuous knowledge management. It targets four quantifiable outcomes:

| Commitment | Target | Owner |
|-----------|--------|-------|
| First response time | < 2 hours | TriageBot (L1 Support) |
| First-contact resolution rate | ≥ 95% | SupportDirector |
| CSAT score | ≥ 4.8 / 5.0 | CSATInsight (CSAT Analyst) |
| SLA breach rate | < 1% | SLAGuard (SLA Monitor) |

## What This Company Does

SupportGenius AI operates a fully automated IT helpdesk lifecycle:

1. **Triage** — TriageBot classifies every inbound ticket, resolves known issues from the KB instantly, logs all metadata, and routes upward when human or specialist expertise is required
2. **Diagnose** — DiagnosBot handles complex diagnostics, remote session analysis, and runbook-guided L2 remediation
3. **Root Cause** — RootCauseBot investigates systemic or recurring failures, produces engineering-grade post-mortems, and closes the loop with permanent fixes
4. **Knowledge** — KnowledgeKeeper turns every resolved ticket into a KB article, identifies gaps, and measures deflection rates to reduce future ticket volume
5. **SLA Guard** — SLAGuard monitors queue health every 15 minutes, fires breach risk alerts before SLAs expire, and keeps breach rate below 1%
6. **CSAT** — CSATInsight collects satisfaction scores on every closed ticket, surfaces low-CSAT root causes, and delivers weekly trend reports to the board

## Org Chart

| Agent | Title | Reports To | Role |
|---|---|---|---|
| SupportCEO | Chief Executive Officer | — | CEO (Board Operator) |
| SupportDirector | Support Director | SupportCEO | Tier hierarchy ownership, escalation routing, SLA enforcement |
| TriageBot | L1 Support Agent | SupportDirector | First-touch triage, FAQ resolution, ticket logging |
| DiagnosBot | L2 Support Agent | SupportDirector | Deep diagnosis, remote sessions, runbook remediation |
| RootCauseBot | L3 Specialist | SupportDirector | Root cause analysis, post-mortems, engineering escalations |
| KnowledgeKeeper | Knowledge Manager | SupportCEO | KB lifecycle, article creation, gap analysis, deflection metrics |
| SLAGuard | SLA Monitor | SupportCEO | Queue health checks, breach risk alerts, SLA reporting |
| CSATInsight | CSAT Analyst | SupportCEO | Satisfaction scoring, trend analysis, board reporting |

### Org Tree

```
SupportCEO (CEO)
├── SupportDirector (Support Director)
│   ├── TriageBot (L1 Support Agent)
│   ├── DiagnosBot (L2 Support Agent)
│   └── RootCauseBot (L3 Specialist)
├── KnowledgeKeeper (Knowledge Manager)
├── SLAGuard (SLA Monitor)
└── CSATInsight (CSAT Analyst)
```

## Teams

| Team | Manager | Members |
|---|---|---|
| Support | SupportDirector | TriageBot, DiagnosBot, RootCauseBot |
| Knowledge & Quality | SupportCEO | KnowledgeKeeper, CSATInsight |
| Operations | SupportCEO | SLAGuard |

## Projects

### IT Helpdesk Launch

The foundational project that delivers all core capabilities before the first ticket goes live.

| Task | Assignee | Outcome |
|---|---|---|
| Build ticket triage workflow and classification engine | TriageBot | Automated triage with priority scoring and tier routing |
| Populate FAQ knowledge base with top-50 known issues | KnowledgeKeeper | Searchable KB enabling L1 zero-touch resolution |
| Create L2 runbook library for common failure patterns | DiagnosBot | 20+ step-by-step runbooks for known L2 scenarios |
| Deploy SLA monitoring dashboard and breach alerting | SLAGuard | Real-time queue health with <1% breach target |
| Integrate CSAT survey on ticket close | CSATInsight | Automated survey delivery and score collection |
| Configure escalation paths and approval chain | SupportDirector | Documented L1→L2→L3 and L3→Engineering paths |
| Run knowledge gap analysis on first 30 days of tickets | KnowledgeKeeper | Gap report with KB article backlog prioritised |

## Recurring Tasks

| Task | Schedule | Assignee | Purpose |
|---|---|---|---|
| Daily Support Standup | Daily at 09:00 UTC | SupportDirector | Team sync, queue review, SLA/CSAT health, blocker surfacing |
| Weekly CSAT Report | Mondays at 08:00 UTC | CSATInsight | Satisfaction trends, low-CSAT root causes, board summary |
| SLA Queue Health Check | Every 15 minutes | SLAGuard | Ticket queue scan, breach risk detection, auto-escalation |

## Ticket Escalation Chain

Every ticket follows the escalation path below. Escalation up requires the current tier to be exhausted:

```
Inbound Ticket
  └── L1 (TriageBot)
      ├── Resolved: KB match → auto-close, CSAT survey
      └── Escalate: complexity, urgency, or no KB match
          └── L2 (DiagnosBot)
              ├── Resolved: runbook execution → close, CSAT survey
              └── Escalate: root cause unknown, systemic, or vendor-required
                  └── L3 (RootCauseBot)
                      ├── Resolved: root cause fixed → post-mortem → KB article
                      └── Escalate: requires external vendor or engineering change
                          └── SupportDirector sign-off + CEO awareness
```

## Security and Governance

### Defence-in-Depth Layers

1. **Data Layer**: PII in tickets anonymised before inclusion in KB articles or trend reports
2. **Access Layer**: Each agent accesses only the minimum ticket scope required (least privilege)
3. **Escalation Layer**: L3-to-Engineering escalations require SupportDirector sign-off
4. **Knowledge Layer**: No KB article published without KnowledgeKeeper review gate
5. **SLA Authority**: SLAGuard is sole authoritative source for breach determination
6. **Audit Layer**: Every agent action (triage decision, escalation, KB publish, CSAT score) logged to activity trail
7. **Secret Layer**: All API keys and tokens stored in Paperclip secrets manager; never in agent output or KB content

### Compliance Controls

| Control | Owner | Frequency |
|---------|-------|-----------|
| SLA breach rate monitoring | SLAGuard | Every 15 minutes |
| CSAT trend analysis | CSATInsight | Weekly |
| KB article quality review | KnowledgeKeeper | Per-publish |
| L3 escalation audit | SupportDirector | Per-escalation |
| Queue health board report | SLAGuard | Weekly |

## Getting Started

Import this company into your Paperclip instance:

```bash
paperclipai company import --from agents/support-genius
```

Or from GitHub:

```bash
paperclipai company import --from https://github.com/paperclipai/paperclip/tree/main/agents/support-genius
```

### Environment Secrets

Configure secrets after import:

| Secret | Agents | Requirement |
|---|---|---|
| `HELPDESK_API_KEY` | TriageBot, DiagnosBot, RootCauseBot, KnowledgeKeeper, SLAGuard, CSATInsight | Required — helpdesk platform access (Zendesk, Freshdesk, etc.) |
| `EMAIL_SERVICE_KEY` | TriageBot, CSATInsight | Required — ticket acknowledgement and CSAT survey email delivery |
| `SLACK_WEBHOOK_URL` | SupportDirector, SLAGuard, CSATInsight | Optional — Slack breach alerts and escalation notifications |
| `TEAMS_WEBHOOK_URL` | SupportDirector, SLAGuard | Optional — Microsoft Teams notifications |
| `JIRA_API_TOKEN` | TriageBot, DiagnosBot (L2 Support) | Optional — Jira ticket sync and engineering escalation tracking |
| `ZENDESK_API_TOKEN` | TriageBot, DiagnosBot | Optional — Zendesk-specific API access |
| `PAGERDUTY_API_KEY` | RootCauseBot, SLAGuard | Optional — P1 incident paging and on-call escalation |

## References

- [Agent Companies Specification](https://agentcompanies.io/specification)
- [Paperclip](https://github.com/paperclipai/paperclip)
