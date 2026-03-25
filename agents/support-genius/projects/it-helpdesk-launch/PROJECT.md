---
name: IT Helpdesk Launch
description: Deliver all core capabilities required to take the first inbound support ticket — triage workflow, knowledge base, runbook library, SLA monitoring, CSAT integration, and escalation paths
slug: it-helpdesk-launch
owner: support-director
---

The IT Helpdesk Launch project delivers every foundational capability required before SupportGenius AI takes its first live ticket. All seven tasks must be complete before the helpdesk goes live — partial capability means broken SLAs and poor CSAT from day one.

## Deliverables

1. **Ticket Triage Workflow** — Automated classification engine with priority scoring, category taxonomy, and tier routing rules
2. **FAQ Knowledge Base** — Top-50 known issues documented as searchable KB articles, enabling L1 zero-touch resolution
3. **L2 Runbook Library** — 20+ step-by-step runbooks for the most common L2 diagnostic and remediation scenarios
4. **SLA Monitoring Dashboard** — Real-time queue health view with 15-minute refresh and breach risk alerting
5. **CSAT Survey Integration** — Automated survey delivery on ticket close and score collection pipeline
6. **Escalation Path Configuration** — Documented and configured L1→L2→L3 and L3→Engineering/Vendor escalation paths with approval gates
7. **Knowledge Gap Analysis** — First 30-day retrospective analysis identifying KB coverage gaps from real ticket data

## Success Criteria

- Every inbound ticket classified within 5 minutes of receipt
- ≥ 40% of L1 tickets resolved by KB match without L2 escalation
- 20+ runbooks available in the L2 runbook library before go-live
- SLA health check runs every 15 minutes with zero missed checks
- CSAT survey sent within 10 minutes of every ticket close
- L1→L2→L3 escalation path fully documented and tested end-to-end
- Knowledge gap analysis completed and KB article backlog created from first 30 days of tickets

## Dependencies

- `HELPDESK_API_KEY` configured for TriageBot, DiagnosBot, RootCauseBot, KnowledgeKeeper, SLAGuard, and CSATInsight
- `EMAIL_SERVICE_KEY` configured for TriageBot (acknowledgements) and CSATInsight (CSAT surveys)
- Helpdesk platform (Zendesk / Freshdesk / Jira Service Management) provisioned and accessible
- Ticket taxonomy (priority definitions, category list, affected services) approved by SupportCEO before triage workflow build
