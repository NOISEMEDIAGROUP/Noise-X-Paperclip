---
name: Create L2 runbook library for common failure patterns
assignee: l2-support
project: it-helpdesk-launch
---

## Objective

Build the initial L2 runbook library with at least 20 step-by-step runbooks covering the most common failure patterns that require diagnostic investigation beyond KB self-service. Runbooks must be actionable, accurate, and safe to execute autonomously.

## Acceptance Criteria

- [ ] Minimum 20 runbooks authored covering the most common L2 failure categories
- [ ] Runbook categories covered: network connectivity, VPN access, application login/SSO failures, password reset edge cases, printer/peripheral failures, software installation failures, performance degradation, email delivery failures, cloud service access issues, hardware fault diagnosis
- [ ] Each runbook follows the standard structure: title, trigger condition, prerequisites, step-by-step diagnostic steps, resolution steps, expected outcome, failure handling, escalation criteria to L3
- [ ] All runbooks reviewed and approved by SupportDirector before inclusion in the library
- [ ] Runbooks indexed and searchable by category, affected service, and trigger pattern
- [ ] DiagnosBot tested against 5 runbooks end-to-end with sample tickets
- [ ] Runbook execution protocol documented: step logging, outcome recording, deviation handling
- [ ] Escalation criteria clearly defined in each runbook: when to stop and send to L3
- [ ] Each runbook has an assigned subject matter owner and review date (90 days)

## Security Requirements

- Runbooks must not include hardcoded credentials or system passwords
- Remote session steps must include explicit user consent requirement
- Log collection steps must specify data minimisation: extract only relevant error data, not full logs with PII
- Any runbook step accessing systems requires the principle of least privilege — document required permission scope
- Runbooks containing security diagnostic steps require SupportDirector review before inclusion
