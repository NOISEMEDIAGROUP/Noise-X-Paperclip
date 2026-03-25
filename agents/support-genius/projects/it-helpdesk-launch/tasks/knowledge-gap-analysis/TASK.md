---
name: Run knowledge gap analysis on first 30 days of tickets
assignee: knowledge-manager
project: it-helpdesk-launch
---

## Objective

After the first 30 days of live operation, conduct a comprehensive knowledge gap analysis against actual ticket data to identify which issues are generating the most L2 escalations due to missing KB coverage — and produce a prioritised KB article backlog to close those gaps.

## Acceptance Criteria

- [ ] All tickets from the first 30 days of operation extracted and categorised by type, resolution tier, and resolution method
- [ ] KB deflection rate calculated for the 30-day period (target: ≥ 40%)
- [ ] Top-20 L2 escalation categories identified — issues that reached L2 but had no KB article
- [ ] Top-10 L3 escalation root causes identified — systemic issues with no KB coverage
- [ ] Gap analysis report produced: for each gap, include ticket count, user impact, estimated KB article effort, and recommended priority
- [ ] KB article backlog created in Paperclip with tasks assigned to KnowledgeKeeper, prioritised by ticket volume and user impact
- [ ] Recurring issue patterns (5+ tickets in 30 days with same root cause) flagged to RootCauseBot for systemic investigation
- [ ] CSAT correlation performed: are low-CSAT tickets correlated with KB gaps?
- [ ] Gap analysis report reviewed and approved by SupportDirector and SupportCEO
- [ ] Action plan with KB article creation milestones presented to SupportCEO

## Security Requirements

- Gap analysis report must use ticket IDs only — no customer names or identifying details in the report
- KB article backlog tasks must not include PII from source tickets
- Report distribution limited to SupportGenius AI management team — not shared externally without SupportCEO approval
