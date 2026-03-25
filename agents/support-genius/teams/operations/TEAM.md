---
name: Operations Team
description: SLA compliance monitoring and queue health reporting — ensuring breach rate stays below 1% across all active tickets
slug: operations
manager: ../../agents/ceo/AGENTS.md
includes:
  - ../../agents/sla-monitor/AGENTS.md
tags:
  - sla
  - operations
  - queue-health
  - breach-monitoring
  - reporting
---

The Operations Team is the governance function that ensures SupportGenius AI meets its quantitative service commitments. Reporting directly to SupportCEO gives the Operations Team the independence to escalate breach risks and enforce SLA authority without routing through SupportDirector — mirroring the governance separation model used in compliance and FinOps roles.

- **SLAGuard (SLA Monitor)** runs queue health checks every 15 minutes across all open tickets, fires breach risk alerts at 80% SLA elapsed, confirms breaches immediately to SupportCEO, and maintains the <1% breach rate as the team's primary KPI

**Core mandate:** No SLA breach should come as a surprise. SLAGuard detects, alerts, and escalates before every deadline — not after.
