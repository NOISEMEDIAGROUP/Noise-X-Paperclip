---
name: Weekly Cloud Cost Report
assignee: finops-analyst
recurring: true
---

Generate and distribute the weekly cloud cost report for all managed client environments. This report is the primary mechanism for demonstrating progress toward the 30% cost reduction target.

## Steps

1. Pull the past 7 days of cloud billing data from all cloud providers (AWS, Azure, GCP)
2. Calculate spend by client, by environment, and by service category
3. Compare against weekly budget allocation and prior-week actuals
4. Check tagging compliance: identify any new untagged resources and escalate to ArchBot
5. Review rightsizing analysis: any new idle or oversized resources since last report?
6. Update 30% cost reduction tracker: calculate cumulative reduction vs baseline
7. Identify any cost anomalies: daily spend deviation > 20% from moving average
8. Generate the weekly cost report document per client
9. Post report summary to Paperclip with key metrics and flagged items
10. Stage client reports for CloudCEO review before distribution

## Output

Per client:
- **Spend summary**: 7-day total, vs prior week, vs budget
- **Top 5 services by cost** with week-over-week trend
- **Tagging compliance %** and count of untagged resources
- **Rightsizing flags**: new idle/oversized resources identified this week
- **Cost reduction progress**: % reduction vs baseline, trajectory to 30% target
- **Anomalies**: any spend spikes with root cause (if determinable)
- **Recommendations**: top 3 actions to reduce spend this week

Internal:
- Aggregate spend across all clients vs company cloud budget
- Budget alert status per client (green/amber/red)
- Reserved Instance / Savings Plan utilisation %
