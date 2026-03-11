# CAS Recovery Design

> Approved in-session before implementation.

## Goal

Restore the lost `CAS` Paperclip company state from surviving `run-logs` into a usable local instance, with the old agents, issues, comments, and approvals visible again.

## Constraints

- The original database is gone.
- Surviving artifacts are limited to `~/.paperclip/instances/default/data/run-logs/...`.
- Built-in Paperclip portability does not restore issues/comments/approvals/history.
- Recovery must preserve old UUIDs and relationships where evidence exists.
- Recovery must be repeatable and safe to rerun.

## Chosen Direction

Use a two-phase recovery flow:

1. Extract a normalized recovery snapshot from run logs.
2. Restore that snapshot directly into the embedded PostgreSQL database with idempotent upserts.

Target runtime mode for the recovered local environment: `local_trusted`.

## Rejected Alternatives

### 1. Built-in company portability import

Rejected because it restores only company metadata and agents, not the historical task graph and discussion state.

### 2. Manual API recreation

Rejected because it would generate new IDs, lose historical timestamps/status lineage, and cannot faithfully recreate internal links.

### 3. Ad-hoc SQL row patching without extraction phase

Rejected because it couples parsing and mutation too tightly, makes verification harder, and is unsafe to rerun.

## Recovery Model

The recovery snapshot will contain:

- company
- agents
- issues
- issue comments
- approvals
- issue-approval links
- minimal heartbeat runs when they are referenced by recovered issues/comments

The snapshot will not invent data. Missing fields remain null/default unless provably recoverable from artifacts.

## Extraction Rules

- Parse every surviving `.ndjson` run log.
- Decode structured Paperclip event envelopes in `chunk`.
- Recover JSON payloads from `aggregated_output`.
- Recover issue creation/update intent from logged commands when the response is insufficient.
- Merge duplicates by entity ID, preferring:
  - richer payloads over sparse payloads
  - newer `updatedAt`
  - explicit fields over inferred defaults

## Restore Rules

- Upsert by primary key for all restored entities.
- Insert parent entities before dependents:
  - company
  - agents
  - heartbeat runs
  - issues
  - comments
  - approvals
  - issue-approval links
- Preserve old UUIDs, issue identifiers, timestamps, statuses, and text bodies.
- Do not delete existing rows during recovery.

## Verification

Recovery is accepted only if all are true:

- `/api/companies` returns `CAS`
- `/api/companies/:id/issues` returns the recovered task graph
- sampled `/api/issues/:id/comments` return the expected historical comments
- sampled `/api/issues/:id/approvals` return the expected hire approvals
- the local UI can open the recovered company and display restored agents/issues

## Risk Notes

- Some comments or internal run metadata may be unrecoverable if they were never echoed back into logs.
- Asset binaries, secrets material, and any never-logged DB rows are out of scope unless separate artifacts are found.
