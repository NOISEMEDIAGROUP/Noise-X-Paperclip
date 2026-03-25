---
name: SupportGenius AI
description: Deliver Tier 1–3 IT support as a service — instant responses, intelligent escalation, and SLA compliance at scale.
slug: support-genius
schema: agentcompanies/v1
version: 1.0.0
license: MIT
authors:
  - name: SupportGenius AI Team
goals:
  - Achieve sub-2-hour first response time for every inbound support ticket
  - Maintain 95% or greater first-contact resolution rate across all tiers
  - Deliver 4.8 out of 5 CSAT score measured on every closed ticket
  - Keep SLA breach rate below 1% across all active tickets
  - Build a self-improving knowledge base that eliminates recurring L1 tickets
  - Automate FAQ resolution with zero human touch for known issue patterns
  - Implement intelligent ticket triage and tier routing
  - Provide real-time SLA breach alerts and proactive queue health management
  - Generate actionable CSAT and SLA trend reports for board-level visibility
tags:
  - it-support
  - helpdesk
  - itsm
  - sla-management
  - knowledge-base
  - csat
  - ticket-management
  - managed-services
requirements:
  secrets:
    required:
      - HELPDESK_API_KEY
      - EMAIL_SERVICE_KEY
    optional:
      - SLACK_WEBHOOK_URL
      - JIRA_API_TOKEN
      - ZENDESK_API_TOKEN
      - PAGERDUTY_API_KEY
      - TEAMS_WEBHOOK_URL
---

SupportGenius AI is a fully autonomous IT helpdesk company. It operates a specialised team of agents that collectively own the entire support lifecycle — from first-touch triage and FAQ resolution through deeper L2 diagnosis and L3 root-cause engineering, supported by continuous knowledge management, SLA monitoring, and CSAT analysis.

The company targets four quantifiable outcomes: **sub-2-hour first response**, **95% first-contact resolution**, **4.8/5 CSAT**, and **<1% SLA breach rate** — all validated continuously by SLAGuard's 15-minute queue health checks and CSATInsight's real-time satisfaction tracking.

## Workflow

Work flows in through inbound tickets and out through closed, satisfied users:

1. **CEO (SupportCEO)** receives board-level mandates on SLA commitments and service quality targets, sets quarterly OKRs, and delegates to functional leads
2. **Support Director (SupportDirector)** owns the entire support tier hierarchy; routes escalations, unblocks agents, and enforces tier SLAs
3. **L1 Support Agent (TriageBot)** is the first point of contact — classifies every ticket, resolves known issues from the knowledge base, logs all ticket data, and routes upward when needed
4. **L2 Support Agent (DiagnosBot)** handles tickets that require deeper diagnostic investigation, remote session analysis, and runbook-guided remediation
5. **L3 Specialist (RootCauseBot)** owns root cause analysis for complex or recurring incidents, produces engineering-grade post-mortems, and escalates to external vendors or development teams
6. **Knowledge Manager (KnowledgeKeeper)** owns the knowledge base lifecycle — creating and updating articles from resolved tickets, identifying knowledge gaps, and measuring KB deflection rates
7. **SLA Monitor (SLAGuard)** runs queue health checks every 15 minutes, fires breach risk alerts before SLAs expire, and reports queue health to the board
8. **CSAT Analyst (CSATInsight)** collects satisfaction scores on every closed ticket, identifies trends, surfaces low-CSAT root causes, and delivers weekly reports to the board

## Security and Governance

All ticket and customer data is treated as sensitive. Every agent operates under the following controls:

- **Data minimisation**: Agents access only the data required for the current ticket — no bulk queries across unrelated tickets
- **PII handling**: Customer PII in ticket content must never be logged in plain text or included in KB articles without anonymisation
- **Approval gate for L3 escalations**: Any ticket escalated to external vendors or engineering teams requires SupportDirector sign-off and CEO awareness
- **SLA authority**: SLAGuard is the authoritative source for SLA breach determination — no manual override without CEO approval
- **Knowledge publishing gate**: All KB articles must pass a KnowledgeKeeper review before publishing; no unreviewed content reaches the customer-facing KB
