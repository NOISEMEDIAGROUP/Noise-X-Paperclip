---
name: Daily Support Standup
assignee: support-director
recurring: true
---

Run the daily support team standup. This check fires every day at 09:00 UTC and is the primary mechanism for surfacing blockers, reviewing queue health, and ensuring all tiers are aligned on priorities and SLA status.

## Steps

1. Query the helpdesk platform for all open tickets across L1, L2, and L3
2. Review queue health from SLAGuard's most recent queue health check:
   - Open ticket count by priority and tier
   - At-risk tickets (> 60% SLA elapsed)
   - Any Amber or Red tickets requiring immediate action
3. Review current CSAT rolling score from CSATInsight:
   - 7-day rolling CSAT vs. 4.8 target
   - Any tickets closed yesterday with CSAT < 4.0
4. Surface blockers across all tiers:
   - L1: any tickets stalled waiting for KB match or user response
   - L2: any tickets requiring remote session coordination
   - L3: any escalations awaiting SupportDirector sign-off
5. Identify and assign any unassigned or orphaned tickets
6. Confirm agent availability and capacity for the day
7. Review any new KB articles published by KnowledgeKeeper — share with L1 agents
8. Post standup summary in Paperclip with:
   - Queue snapshot (open counts by tier and priority)
   - SLA health status (Green / Amber / Red)
   - CSAT status (on-target / warning / critical)
   - Top 3 priorities for the day
   - Any unresolved blockers requiring CEO attention

## Output

A standup summary comment posted in Paperclip:
- Queue snapshot: open counts by tier and priority
- SLA health: Green / Amber / Red overall status
- CSAT health: current score vs. 4.8 target
- Blockers: any items requiring SupportCEO decision
- Priorities: top 3 actions for the day

## Escalation

- If any P1/P2 ticket is open and unresponded: escalate to SupportCEO immediately, do not wait for standup
- If SLA health is Red: include immediate escalation plan in standup summary
- If CSAT rolling 7-day < 4.5: flag to SupportCEO in standup summary
