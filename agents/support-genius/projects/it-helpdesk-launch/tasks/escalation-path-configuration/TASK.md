---
name: Configure escalation paths and approval chain
assignee: support-director
project: it-helpdesk-launch
---

## Objective

Document and configure the full ticket escalation path from L1 through L3 to external vendors and engineering teams, including the approval gates required at each escalation boundary. Every agent must know exactly when to escalate, to whom, and with what information.

## Acceptance Criteria

- [ ] L1→L2 escalation criteria documented: conditions that trigger escalation (no KB match, confidence < 70%, P1/P2 ticket, user-reported complexity)
- [ ] L2→L3 escalation criteria documented: conditions that trigger escalation (root cause unknown after runbook exhaustion, systemic issue >3 users, vendor engagement required)
- [ ] L3→Engineering escalation documented: approval gate (SupportDirector sign-off + CEO awareness) and Jira ticket template for engineering requests
- [ ] L3→Vendor escalation documented: approval gate (SupportDirector sign-off), PII redaction requirement, and vendor contact protocol
- [ ] Escalation packet templates defined for each boundary: L1→L2 handover, L2→L3 handover, L3→Engineering ticket, L3→Vendor package
- [ ] Priority bypass rule documented: SupportDirector can assign any ticket directly to any tier without standard escalation path
- [ ] All escalation paths tested with simulated ticket scenarios (one per boundary)
- [ ] SupportCEO has reviewed and approved the escalation policy
- [ ] Escalation policy published to all agents in Paperclip as a reference document
- [ ] Rollback procedure defined: how to de-escalate a ticket if initial tier misclassification is discovered

## Security Requirements

- L3→Vendor escalation packages must have PII redacted before any data leaves the organisation
- No customer data may be shared with engineering teams without SupportDirector approval documented in the ticket
- All external escalations must be logged in the ticket: date, recipient organisation, data shared, purpose
- Escalation policy changes require SupportCEO approval and must be versioned
