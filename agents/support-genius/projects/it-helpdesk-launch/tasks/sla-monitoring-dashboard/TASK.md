---
name: Deploy SLA monitoring dashboard and breach alerting
assignee: sla-monitor
project: it-helpdesk-launch
---

## Objective

Build and deploy the SLA monitoring system that gives SLAGuard full queue visibility every 15 minutes, enables proactive breach risk alerts at 80% SLA elapsed, and provides SupportCEO and SupportDirector with real-time queue health dashboards.

## Acceptance Criteria

- [ ] Helpdesk API integration complete: SLAGuard can query all open tickets with their priority, tier, created time, and first-response time
- [ ] SLA elapsed percentage calculated correctly for all four priority tiers (P1/P2/P3/P4) using defined SLA windows
- [ ] Green / Amber / Red status classification implemented and tested against at least 20 sample tickets
- [ ] Breach risk alert fires at exactly 80% SLA elapsed — tested for all four priority tiers
- [ ] Breach confirmation notification fires immediately when SLA is exceeded — tested for all four priority tiers
- [ ] P1 breach notification reaches SupportCEO within 5 minutes of detection
- [ ] Queue health dashboard available: open ticket count by priority, tier, average age, at-risk count, breach count
- [ ] SLA health check runs every 15 minutes via cron — zero missed checks in first 24-hour validation run
- [ ] Weekly SLA breach rate report format defined and first draft approved by SupportCEO
- [ ] All alert channels configured: Slack (via SLACK_WEBHOOK_URL) and/or Teams (via TEAMS_WEBHOOK_URL) if available

## Security Requirements

- SLA dashboards must not expose customer PII — use ticket IDs, not customer names
- Alert messages must include ticket ID, priority, tier, breach time — no customer contact details
- Breach data retained for 12 months — storage mechanism documented and approved
- Queue health check results logged to activity trail — all results must be auditable
- HELPDESK_API_KEY stored in Paperclip secrets — never hardcoded in configuration
