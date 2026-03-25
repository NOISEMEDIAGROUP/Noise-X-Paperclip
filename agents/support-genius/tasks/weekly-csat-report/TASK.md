---
name: Weekly CSAT Report
assignee: csat-analyst
recurring: true
---

Produce and distribute the weekly CSAT trend report every Monday at 08:00 UTC. This report provides SupportCEO and the board with full visibility into customer satisfaction trends, low-CSAT root causes, and actionable improvement recommendations.

## Steps

1. Query the CSAT data store for all survey responses received in the previous 7 days
2. Calculate the following metrics:
   - Overall rolling 7-day CSAT score (target: ≥ 4.8/5.0)
   - CSAT by tier: L1, L2, L3
   - CSAT by ticket category (Hardware, Software, Network, etc.)
   - Survey response rate for the week (target: ≥ 40%)
   - Count of low-CSAT tickets (< 4.0): absolute number and % of total
3. Compare against prior 4 weeks to identify trends:
   - Is the score trending up, flat, or down?
   - Are any specific categories or tiers deteriorating?
4. Analyse all tickets with CSAT < 4.0 from the week:
   - Identify common themes in negative comments
   - Categorise root causes: slow response, poor resolution quality, KB inaccuracy, SLA breach, communication gap
5. Correlate CSAT with SLA compliance:
   - Are low-CSAT tickets correlated with SLA breaches or near-misses?
   - Import SLAGuard's weekly breach data for this correlation
6. Produce actionable recommendations:
   - Top 3 improvements that would most improve CSAT score
   - Specific runbook or KB articles that need updating based on negative feedback
   - Coaching recommendations for SupportDirector (anonymised)
7. Compile the weekly CSAT report and post to Paperclip
8. Distribute report to SupportCEO via email (via EMAIL_SERVICE_KEY)

## Report Structure

- **Executive Summary**: CSAT score, trend arrow, vs. 4.8 target
- **Metrics Table**: Overall / L1 / L2 / L3 CSAT, response rate, low-CSAT count
- **Trend Chart**: 5-week rolling CSAT trend (text table format)
- **Root Cause Analysis**: Top 3 low-CSAT themes with ticket count
- **SLA Correlation**: Low-CSAT tickets that also had SLA issues
- **Recommendations**: 3 specific, actionable improvements with owners

## Output

Weekly CSAT report posted in Paperclip and emailed to SupportCEO. If CSAT is below 4.5 rolling 7-day, include an escalation flag and recommended immediate actions.
