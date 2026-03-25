---
name: Build ticket triage workflow and classification engine
assignee: l1-support
project: it-helpdesk-launch
---

## Objective

Design and implement the automated ticket triage workflow that classifies every inbound ticket within 5 minutes, assigns the correct priority and category, and routes to the appropriate tier or KB resolution path.

## Acceptance Criteria

- [ ] Ticket classification taxonomy defined and approved: priority (P1/P2/P3/P4), category (Hardware / Software / Network / Access & Identity / Application / Data / Security / Other), affected service
- [ ] Triage logic implemented: keyword extraction, priority scoring rules, and category matching
- [ ] KB confidence scoring gate implemented (≥90% auto-close, 70–89% suggest-and-confirm, <70% escalate to L2)
- [ ] Acknowledgement email template created and tested: confirms receipt, states priority, provides estimated resolution time
- [ ] Ticket logging schema defined: all required fields captured on every ticket (submitter, description, system, error codes, steps tried, environment, attachments)
- [ ] Tier routing logic implemented: auto-resolve / L2 escalation / L1-hold paths all functional
- [ ] FAQ detection rule implemented: flag to KnowledgeKeeper when 3+ identical issues in 24 hours
- [ ] End-to-end triage workflow tested with 10+ sample tickets across all priority levels
- [ ] SupportDirector has reviewed and approved the triage logic and routing rules
- [ ] CSAT survey trigger configured: fires within 10 minutes of every ticket close at L1

## Security Requirements

- No raw PII (passwords, national IDs, financial data) logged in ticket records
- Acknowledgement email must not expose internal system names, agent identifiers, or infrastructure details
- All helpdesk API calls authenticated via `HELPDESK_API_KEY` — credential never hardcoded
- Ticket classification logic and routing rules documented for audit purposes
