---
name: Weekly API Health Check
assignee: devops-engineer
recurring: true
---

Run the weekly API health check across all APIs in production and report SLA status to DeliveryPilot.

## Checklist

1. Review latency dashboards for all production APIs — flag any with p99 > 180ms (warning threshold before 200ms SLA breach)
2. Review error rate dashboards — flag any with error rate > 0.05% (warning before 0.1% SLA breach)
3. Check uptime for all APIs over the past 7 days
4. Run canary rollout checks: any APIs in mid-canary with unexpected error patterns
5. Check any APIs approaching deprecation sunset dates requiring action
6. Produce weekly health summary report: green/amber/red status per API
7. Post report as task comment and @-mention DeliveryPilot
