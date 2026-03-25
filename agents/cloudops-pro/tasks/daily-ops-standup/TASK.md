---
name: Daily Ops Standup
assignee: program-manager
recurring: true
---

Run the daily operations standup for CloudOps Pro. This is the synchronisation point for all eight agents — surface blockers, review active incidents, check SLA health, and ensure every team knows what everyone else is doing.

## Agenda

1. **Incident Status** — Any active P1/P2/P3 incidents? Who owns them? What is the ETA to resolve?
2. **Yesterday** — What did each agent complete? Any deployments, runbooks executed, compliance fixes?
3. **Today** — What is each agent working on? Any planned deployments or maintenance windows?
4. **Blockers** — Anything preventing progress? Inter-agent dependencies unresolved?
5. **SLA Health** — Current 30-day rolling uptime %. Error budget status. Any breach risk?
6. **Cost Status** — Spend vs budget. Any anomalies detected by CostSage?
7. **Security** — Any open HIGH/CRITICAL findings? Any drift events since last standup?

## Steps

1. Pull the latest status of all open issues and incidents from Paperclip
2. Check 30-day rolling uptime % from UptimeGuard's SLO dashboard
3. Check current spend vs monthly budget from CostSage
4. Check open security findings from DriftGuard's posture score
5. Check pending deployment queue from DeployBot's pipeline status
6. Identify any overdue tasks or unresolved blockers
7. Post standup summary as a comment in Paperclip with Red/Yellow/Green status per team
8. Create escalation tasks for any Red items that need CEO or CTO action

## Output

A standup summary posted in Paperclip containing:
- **Red/Yellow/Green** status for each team (Engineering, Governance, FinOps)
- **SLA health**: current uptime %, error budget remaining, breach risk
- **Cost health**: spend vs budget %, any anomaly flags
- **Security health**: posture score, open critical findings count
- **Active incidents**: list with owner, severity, and ETA
- **Blockers**: list with owner and resolution plan
- **Deployments today**: planned changes and maintenance windows
