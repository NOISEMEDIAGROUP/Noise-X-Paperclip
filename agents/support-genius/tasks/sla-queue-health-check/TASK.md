---
name: SLA Queue Health Check
assignee: sla-monitor
recurring: true
---

Run the automated SLA queue health check across all open tickets. This check fires every 15 minutes and is the primary mechanism for detecting SLA breach risk before it becomes an actual breach.

## Steps

1. Query the helpdesk platform for all open tickets via `HELPDESK_API_KEY`
2. For each open ticket, calculate:
   - SLA elapsed percentage: (current time − ticket created time) / SLA window × 100
   - SLA time remaining: SLA deadline − current time
   - First response status: has first response been sent? If not, is first response SLA at risk?
3. Classify each ticket by breach risk status:
   - **Green**: SLA elapsed < 60%
   - **Amber**: SLA elapsed 60–80%
   - **Red**: SLA elapsed > 80% (breach imminent)
   - **Breach**: SLA deadline exceeded
4. For any **Amber** ticket:
   - Create a breach risk alert notification for SupportDirector
   - Log the ticket ID, priority, tier, elapsed %, and time remaining
5. For any **Red** ticket:
   - Create an immediate escalation notification to SupportDirector and SupportCEO
   - Create a task for the ticket's current assignee to escalate or resolve immediately
6. For any **Breach** ticket:
   - Fire immediate breach notification to SupportCEO with ticket ID, priority, tier, and breach duration
   - Log breach to the SLA audit trail
   - Increment the breach counter for the weekly breach rate metric
7. For P1 tickets specifically:
   - Apply tighter thresholds: alert at 66% elapsed (10 min of 15 min first response SLA)
   - Escalate to SupportCEO directly for any P1 that has not received first response within 10 minutes
8. Log the health check result to the activity trail (silently if all Green)
9. Update the queue health dashboard with current snapshot

## Output

SLA queue health check result posted in Paperclip activity trail:
- Per-ticket: ticket ID, priority, tier, elapsed %, time remaining, status
- Aggregate: total open tickets, at-risk count (Amber + Red), breach count
- Any newly created escalation tasks or breach notifications with ticket IDs
- Any status changes since the previous check (Green→Amber, Amber→Red, etc.)
- Log silently if all tickets are Green — no notification generated

## Escalation Rules

| Status | Action |
|--------|--------|
| Green | Log result silently; no notification |
| Amber | Notify SupportDirector; create investigation note on ticket |
| Red | Alert SupportDirector and SupportCEO; create urgent task for ticket owner |
| Breach | Immediate breach notification to SupportCEO; log to SLA audit trail; trigger post-breach review |
| P1 unresponded > 10 min | Escalate directly to SupportCEO regardless of overall queue status |
