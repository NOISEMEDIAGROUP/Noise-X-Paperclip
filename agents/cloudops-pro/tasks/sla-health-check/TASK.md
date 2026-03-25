---
name: SLA Health Check
assignee: sre
recurring: true
---

Run the automated SLA health check across all managed client environments. This check fires every 15 minutes and is the primary mechanism for detecting SLA breach risk before it becomes an actual breach.

## Steps

1. Query the observability stack for 30-day rolling availability % per client environment
2. Calculate current error budget burn rate (1-hour and 6-hour windows)
3. Check synthetic monitoring probe results for all client-facing endpoints (last 15 minutes)
4. Check for any active P1/P2 incidents open in Paperclip
5. Evaluate SLA breach risk:
   - **Green**: availability ≥ 99.95%, burn rate normal, no active incidents
   - **Amber**: availability between 99.9–99.95%, or burn rate elevated (> 2x normal), or P3 incident active
   - **Red**: availability < 99.9% (SLA breach in progress), or burn rate critical (> 5x normal), or P1/P2 active
6. For any **Amber** environment: create a task for UptimeGuard to investigate and notify SLAPilot
7. For any **Red** environment: immediately create a P1/P2 incident in Paperclip if none exists, escalate to CloudCTO
8. Update the SLA health status dashboard in Paperclip

## Output

A SLA health check summary posted in Paperclip (or silently logged if all green):
- Per-client environment: availability %, error budget remaining %, burn rate, status (Green/Amber/Red)
- Any newly created incidents with incident ID and assigned owner
- Any environments whose status changed since the last check

## Escalation Rules

| Status | Action |
|--------|--------|
| Green | Log result silently; no notification |
| Amber | Notify SLAPilot; create investigation task for UptimeGuard |
| Red | Create P1/P2 incident immediately; escalate to CloudCTO within 5 minutes; notify SLAPilot |
| Red (confirmed SLA breach) | Escalate to CloudCEO; SLAPilot initiates client notification |
