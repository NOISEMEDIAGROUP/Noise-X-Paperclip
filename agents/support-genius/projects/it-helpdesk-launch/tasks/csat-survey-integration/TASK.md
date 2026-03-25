---
name: Integrate CSAT survey on ticket close
assignee: csat-analyst
project: it-helpdesk-launch
---

## Objective

Implement the full CSAT survey pipeline — automated survey delivery within 10 minutes of every ticket close, response collection, score recording, and the alerting pipeline that fires when scores drop below threshold.

## Acceptance Criteria

- [ ] CSAT survey email template created: 1–5 star rating, optional comment field, plain language question
- [ ] Survey delivery configured: sent within 10 minutes of ticket close via EMAIL_SERVICE_KEY
- [ ] 48-hour reminder configured: one follow-up email sent if no response received
- [ ] Survey auto-expires at 7 days: no response recorded as null (not counted in averages)
- [ ] Response collection working: scores stored with ticket ID, tier, category, close time, resolution time
- [ ] Per-ticket CSAT score calculated and accessible via HELPDESK_API_KEY
- [ ] Rolling 30-day CSAT dashboard functioning: overall score, by tier, by category
- [ ] Low-CSAT alert configured: fires when any ticket scores < 4.0 and when rolling 7-day drops below 4.5
- [ ] Weekly CSAT report template defined and first draft approved by SupportCEO
- [ ] Survey delivery tested end-to-end: 5 test tickets closed, surveys sent, responses recorded, scores calculated correctly

## Security Requirements

- Survey emails must not expose internal agent names, system architecture, or ticket routing details
- CSAT records stored with ticket ID only — customer name/email not included in score data or trend reports
- EMAIL_SERVICE_KEY stored in Paperclip secrets — never in email templates or configuration files
- Agent-level CSAT breakdowns anonymised before sharing outside SupportGenius AI management
- Survey response data retained for 24 months — storage mechanism documented
