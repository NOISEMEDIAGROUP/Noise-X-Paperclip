---
Owner: Server + Platform
Last Verified: 2026-03-11
Applies To: paperclip server
Links: [SPEC-implementation](SPEC-implementation.md), [ARCHITECTURE](ARCHITECTURE.md)
---

# Reliability

SLOs for critical flows in the Paperclip control plane.

## Critical Flows

### 1. Issue Checkout
**Description:** Agent atomically claims a task for work.
**SLO:** Checkout succeeds or fails within 500ms. No double-assignment.
**Invariant:** Only one agent holds a task at a time.
**Failure mode:** Concurrent checkout attempts must resolve deterministically (one succeeds, others get 409).

### 2. Heartbeat Invocation
**Description:** Control plane invokes agent heartbeat via configured adapter.
**SLO:** Invocation initiated within 5s of scheduled trigger. Timeout configurable per adapter.
**Invariant:** Failed invocation is logged and surfaced; never silently swallowed.
**Failure mode:** Adapter timeout or crash is recorded as failed heartbeat with error context.

### 3. Approval State Changes
**Description:** Board approves or rejects agent-proposed actions (hires, strategy).
**SLO:** State transition completes within 500ms. Approval state is consistent.
**Invariant:** Approved/rejected is terminal for that approval instance. No double-approve.
**Failure mode:** Concurrent approval attempts resolve deterministically.

### 4. Budget Enforcement
**Description:** Cost events are tallied against budget; hard-stop pauses work.
**SLO:** Budget check runs on every cost event. Auto-pause within 1 cost event of exceeding limit.
**Invariant:** Paused agents cannot be re-invoked until budget is raised or period resets.
**Failure mode:** Cost event ingestion failure is logged; does not silently allow overspend.

### 5. Activity Logging
**Description:** All mutating actions produce an activity log entry.
**SLO:** Log entry created synchronously within the mutation transaction.
**Invariant:** No mutation completes without its corresponding log entry.
**Failure mode:** If logging fails, the mutation must also fail (transactional).

## Health Check

```
GET /api/health
```

Returns 200 when server is operational and database is reachable.
