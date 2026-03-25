---
title: "SupportGenius AI — Company Reference"
description: "Complete reference for the SupportGenius AI IT helpdesk agent company — Tier 1–3 IT support as a service"
---

# SupportGenius AI

**SupportGenius AI** is a reference `agentcompanies/v1` package for a fully autonomous IT helpdesk company. It demonstrates how to model a security-first, multi-tier support organisation with measurable SLA commitments, intelligent ticket escalation, continuous knowledge management, and real-time CSAT measurement.

**Package location:** `agents/support-genius/`

## At a Glance

| Metric | Target | Owner |
|--------|--------|-------|
| First response time | < 2 hours | TriageBot (L1 Support) |
| First-contact resolution rate | ≥ 95% | SupportDirector |
| CSAT score | ≥ 4.8 / 5.0 | CSATInsight (CSAT Analyst) |
| SLA breach rate | < 1% | SLAGuard (SLA Monitor) |
| KB deflection rate | ≥ 50% | KnowledgeKeeper (Knowledge Manager) |
| P1 first response | ≤ 15 minutes | TriageBot → SupportDirector |
| SLA check frequency | Every 15 minutes | SLAGuard |

---

## Org Structure

### Agents (8 total)

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

### Agent Reference Table

| Slug | Name | Title | Reports To | Primary Mandate |
|------|------|-------|-----------|-----------------|
| `ceo` | SupportCEO | Chief Executive Officer | — (root) | Board operator, SLA acceptance, budget governance, L3 external escalation approval |
| `support-director` | SupportDirector | Support Director | `ceo` | Tier hierarchy ownership, L1→L2→L3 escalation chain, FCR enforcement, SLA compliance |
| `l1-support` | TriageBot | L1 Support Agent | `support-director` | First-touch triage, KB-matched auto-resolution, ticket logging, FAQ detection |
| `l2-support` | DiagnosBot | L2 Support Agent | `support-director` | Deep diagnostics, runbook execution, remote session coordination |
| `l3-specialist` | RootCauseBot | L3 Specialist | `support-director` | Root cause analysis, post-mortems, engineering/vendor escalations |
| `knowledge-manager` | KnowledgeKeeper | Knowledge Manager | `ceo` | KB lifecycle, article creation and quality gate, gap analysis, deflection metrics |
| `sla-monitor` | SLAGuard | SLA Monitor | `ceo` | Queue health checks every 15 min, breach risk alerts, SLA breach rate tracking |
| `csat-analyst` | CSATInsight | CSAT Analyst | `ceo` | CSAT survey delivery, score collection, trend analysis, board reporting |

### Teams (3 total)

| Team | Manager | Members | Focus |
|------|---------|---------|-------|
| Support | SupportDirector | TriageBot, DiagnosBot, RootCauseBot | End-to-end ticket resolution across L1/L2/L3 |
| Knowledge & Quality | SupportCEO | KnowledgeKeeper, CSATInsight | KB lifecycle and customer satisfaction measurement |
| Operations | SupportCEO | SLAGuard | SLA compliance and queue health governance |

---

## Projects

### IT Helpdesk Launch (seed project)

The foundational project that delivers all platform capabilities before the first live ticket.

| Task Slug | Assignee | Outcome |
|-----------|---------|---------|
| `ticket-triage-workflow` | TriageBot | Automated classification with priority scoring and tier routing |
| `faq-knowledge-base` | KnowledgeKeeper | Top-50 KB articles enabling ≥40% L1 zero-touch deflection |
| `l2-runbook-library` | DiagnosBot | 20+ step-by-step runbooks for common L2 failure scenarios |
| `sla-monitoring-dashboard` | SLAGuard | Real-time queue health with 15-minute refresh and breach alerts |
| `csat-survey-integration` | CSATInsight | Automated survey on ticket close with score collection pipeline |
| `escalation-path-configuration` | SupportDirector | L1→L2→L3→Engineering/Vendor paths with approval gates |
| `knowledge-gap-analysis` | KnowledgeKeeper | 30-day retrospective gap report and KB article backlog |

---

## Recurring Tasks

| Task | Cron | Timezone | Assignee | Purpose |
|------|------|----------|---------|---------|
| `daily-support-standup` | `0 9 * * *` | UTC | SupportDirector | Queue review, SLA/CSAT health, blocker surfacing |
| `weekly-csat-report` | `0 8 * * 1` | UTC | CSATInsight | CSAT trends, low-score root causes, board summary |
| `sla-queue-health-check` | `*/15 * * * *` | UTC | SLAGuard | 15-minute queue scan, breach risk detection, auto-escalation |

---

## The Ticket Escalation Chain

Every ticket follows the escalation chain below. Each tier must be genuinely exhausted before escalating upward — no tier skipping without SupportDirector approval.

```
Inbound Ticket
  └── L1: TriageBot
      ├── KB match (confidence ≥90%) → Auto-close → CSAT survey
      ├── KB match (confidence 70–89%) → Suggest fix → 24h auto-close
      └── No KB match / confidence <70% → Escalate to L2
          └── L2: DiagnosBot
              ├── Runbook resolves → Close → KB article proposal → CSAT survey
              └── Root cause unknown / systemic / vendor → Escalate to L3
                  └── L3: RootCauseBot
                      ├── RCA + fix applied → Post-mortem → KB article → CSAT survey
                      └── Engineering/vendor required → SupportDirector sign-off + CEO awareness
```

### Escalation Priority SLAs

| Priority | First Response | Resolution | Breach Risk Alert | Alert Threshold |
|----------|---------------|------------|------------------|-----------------|
| P1 | 15 minutes | 4 hours | 10 min / 3 hr elapsed | SupportDirector + SupportCEO |
| P2 | 30 minutes | 8 hours | 24 min / 6.4 hr elapsed | SupportDirector |
| P3 | 2 hours | 24 hours | 96 min / 19.2 hr elapsed | SupportDirector |
| P4 | 4 hours | 72 hours | 3.2 hr / 57.6 hr elapsed | SupportDirector |

---

## Security Architecture

### Defence-in-Depth Layers

1. **Data Layer**: PII in tickets anonymised before inclusion in KB articles, trend reports, or CSAT data
2. **Access Layer**: Each agent accesses only the minimum ticket scope required (least privilege via API scoping)
3. **Escalation Gate**: L3-to-Engineering and L3-to-Vendor escalations require SupportDirector sign-off and CEO awareness
4. **Knowledge Gate**: No KB article published without KnowledgeKeeper review — zero exceptions
5. **SLA Authority**: SLAGuard is the sole authoritative source for breach determination; no manual override without CEO approval
6. **Audit Layer**: Every agent action (triage decision, escalation, KB publish, CSAT score) logged to the Paperclip activity trail
7. **Secret Layer**: All API keys and tokens stored in Paperclip secrets manager; never in agent output, KB articles, or runbook content

### Governance Controls

| Control | Owner | Frequency |
|---------|-------|-----------|
| SLA breach rate | SLAGuard | Every 15 minutes |
| CSAT trend analysis | CSATInsight | Weekly |
| KB article quality review | KnowledgeKeeper | Per-publish |
| L3 external escalation audit | SupportDirector | Per-escalation |
| PII gate enforcement | KnowledgeKeeper, CSATInsight | Per-publish / per-report |
| Budget governance | SupportCEO | Per-alert |

### Why KnowledgeKeeper and SLAGuard and CSATInsight report to CEO

All three are governance functions. KnowledgeKeeper controls what goes into the customer-facing KB (quality gate authority). SLAGuard is the authoritative breach arbiter (independence from the tier it monitors is essential). CSATInsight measures the quality of SupportDirector's team (must report independently). All three functions require CEO-level authority to escalate findings without routing through SupportDirector.

---

## Knowledge Base Architecture

### KB Deflection Rate Target

| Metric | Target | Warning | Critical |
|--------|--------|---------|---------|
| L1 deflection rate | ≥ 50% | < 40% | < 30% |
| Article accuracy score | ≥ 4.5/5.0 | < 4.0 | < 3.5 |
| Stale articles (>90 days) | 0 | > 5 | > 10 |
| Category coverage | 100% of top-20 | < 80% | < 60% |

### KB Article Quality Gate

Every article must pass before publishing:
- Technical accuracy verified
- PII-clean (no names, emails, ticket IDs, system credentials)
- Plain language (non-expert readable)
- Correctly tagged (category, product, affected system, keywords)
- Review date set (≤ 90 days)
- Source ticket(s) linked

---

## CSAT Architecture

### CSAT Health Thresholds

| Metric | Target | Warning | Critical |
|--------|--------|---------|---------|
| Rolling 30-day CSAT | ≥ 4.8 / 5.0 | < 4.5 | < 4.0 |
| Survey response rate | ≥ 40% | < 30% | < 20% |
| Low-CSAT tickets (< 4.0) | < 5% of closed | > 10% | > 20% |
| L1 CSAT (KB resolutions) | ≥ 4.9 | < 4.6 | < 4.3 |
| L2 CSAT | ≥ 4.7 | < 4.4 | < 4.0 |
| L3 CSAT | ≥ 4.6 | < 4.3 | < 3.8 |

### Survey Lifecycle

1. Ticket closed (any tier)
2. CSAT survey email sent within 10 minutes (via `EMAIL_SERVICE_KEY`)
3. 48-hour reminder if no response
4. Auto-expire at 7 days (null response — excluded from averages)
5. Score recorded with ticket ID, tier, category, resolution time
6. Low-CSAT alert fires if score < 4.0

---

## Required Secrets

| Secret | Required For | Requirement |
|--------|-------------|-------------|
| `HELPDESK_API_KEY` | TriageBot, DiagnosBot, RootCauseBot, KnowledgeKeeper, SLAGuard, CSATInsight | Required — helpdesk platform API access |
| `EMAIL_SERVICE_KEY` | TriageBot, CSATInsight | Required — acknowledgement emails and CSAT survey delivery |
| `SLACK_WEBHOOK_URL` | SupportDirector, SLAGuard, CSATInsight | Optional — breach alerts and escalation notifications |
| `TEAMS_WEBHOOK_URL` | SupportDirector, SLAGuard | Optional — Microsoft Teams notifications |
| `JIRA_API_TOKEN` | TriageBot, DiagnosBot | Optional — Jira Service Management ticket sync |
| `ZENDESK_API_TOKEN` | TriageBot, DiagnosBot | Optional — Zendesk-specific API access |
| `PAGERDUTY_API_KEY` | RootCauseBot, SLAGuard | Optional — P1 incident paging and on-call escalation |

All secrets are stored in Paperclip's secrets manager and injected at runtime. No secret should ever appear in KB article content, runbook steps, or agent output.

---

## Heartbeat Configuration

All 8 agents use a 300-second (5-minute) heartbeat with `wakeOnDemand: true`. The SLA queue health check fires every 15 minutes via the cron routine — this keeps heartbeat costs low while meeting the 15-minute SLA monitoring requirement.

```yaml
# .paperclip.yaml excerpt
agents:
  sla-monitor:
    runtime:
      heartbeat:
        enabled: true
        intervalSec: 300    # agent heartbeat: 5 minutes
        wakeOnDemand: true  # wakes immediately on new P1/P2 ticket

routines:
  sla-queue-health-check:
    task: tasks/sla-queue-health-check/TASK.md
    schedule:
      timezone: UTC
      cron: "*/15 * * * *"  # scan queue every 15 minutes
```

---

## Getting Started

### 1. Import the company

```bash
paperclipai company import --from agents/support-genius
```

Or from GitHub:

```bash
paperclipai company import --from https://github.com/paperclipai/paperclip/tree/main/agents/support-genius
```

### 2. Configure required secrets

```bash
paperclipai secrets set HELPDESK_API_KEY <your-helpdesk-api-key>
paperclipai secrets set EMAIL_SERVICE_KEY <your-email-service-key>
```

### 3. Configure optional secrets

```bash
paperclipai secrets set SLACK_WEBHOOK_URL <your-slack-webhook>
paperclipai secrets set JIRA_API_TOKEN <your-jira-token>
paperclipai secrets set PAGERDUTY_API_KEY <your-pagerduty-key>
```

### 4. Start the IT Helpdesk Launch project

Once imported, the seven seed tasks in the `it-helpdesk-launch` project are assigned and ready. Start with `ticket-triage-workflow` (TriageBot) and `faq-knowledge-base` (KnowledgeKeeper) in parallel — these are the critical path to L1 deflection. The `sla-monitoring-dashboard` and `csat-survey-integration` tasks can run concurrently.

### 5. Run schema tests

```bash
vitest run tests/support-genius/schema.test.ts
```

---

## Design Decisions

### Why does the L3 Specialist report to Support Director, not CEO?

L3 (RootCauseBot) is an operational engineering function — it works most effectively with tight coupling to L2 (DiagnosBot) and L1 (TriageBot). The escalation chain from L1→L2→L3 is SupportDirector's domain to manage. The independence constraint is satisfied by the separate approval gate: L3 cannot escalate externally without SupportDirector sign-off and CEO awareness.

### Why do Knowledge Manager, SLA Monitor, and CSAT Analyst report to CEO?

All three are governance functions that must have independence from the team they oversee. KnowledgeKeeper controls what enters the customer-facing KB. SLAGuard is the authoritative breach arbiter. CSATInsight measures SupportDirector's team quality. Reporting to CEO gives them authority to surface findings without routing through SupportDirector, preserving governance independence.

### Why is the KB confidence gate at 70% and 90%?

- **≥ 90%**: High confidence the KB article solves this exact issue — safe to auto-close
- **70–89%**: Likely relevant but not certain — send the article as a suggestion, let the user confirm, auto-close after 24h if no objection
- **< 70%**: Risk of false resolution is too high — better to send to L2 with the KB candidates attached than close incorrectly and damage CSAT

### Why three recurring tasks instead of one?

The daily standup (SupportDirector), weekly CSAT report (CSATInsight), and SLA health check (SLAGuard) run on different cadences, are owned by different agents with different authority, and measure different things. Combining them would create coupling across governance domains and obscure which agent is accountable for which measurement.

---

## Testing

Run the full schema validation suite (no server required):

```bash
vitest run tests/support-genius/schema.test.ts
```

The test suite covers:
- Top-level package file existence
- COMPANY.md frontmatter validation (slug, schema, required secrets)
- All 8 AGENTS.md files (name, title, reportsTo, paperclip skill)
- Org tree integrity (no cycles, exactly one root, correct reporting lines)
- All 3 TEAM.md files (name, manager, correct structure)
- IT Helpdesk Launch project + 7 seed tasks (name, assignee, project reference)
- 3 recurring tasks (portable: `recurring: true`, no `startsAt`, no inline `schedule:`)
- `.paperclip.yaml` (heartbeat config × 8 agents, 3 routines, secret declarations)
- README.md structure (Org Chart, Getting Started, SLA commitments, escalation chain)
- Agent-specific content checks (triage, KB, runbooks, root cause, CSAT, SLA tiers, PII gate)
