# Agent Memory Store Integration README

This document describes how to add the `agent_memories` feature requested in:

- Issue [#460](https://github.com/paperclipai/paperclip/issues/460)
- PR [#461](https://github.com/paperclipai/paperclip/pull/461)

for this fork of Paperclip.

The goal is to keep the product value of the upstream proposal while adapting the implementation to this fork's current architecture:

- company-scoped DB model
- runtime noise-reduction work
- S3/runtime sync and instance storage config
- board-governed UX
- existing activity logging and heartbeat orchestration

## Decision

We should implement the feature.

We should not cherry-pick PR `#461` as-is.

Reason:

- the idea is solid
- the raw PR appears incomplete against the full issue scope
- the raw PR does not account for this fork's current runtime/storage/auth architecture
- the raw PR had review findings on API semantics, UI behavior, and FK behavior

This fork should implement a fork-native memory system with DB as the source of truth.

## Product Goal

Agents should be able to remember durable operational facts so they stop relearning the same context and wasting tokens on repeated discovery.

The memory system should support:

- agent-written memories
- board visibility and governance
- heartbeat-time recall into the prompt
- expiration and pruning
- auditability

This is not meant to replace:

- agent runtime state in `AGENT_HOME`
- S3 runtime sync
- DB backups
- large binary artifacts

## Non-Goals

- building a vector database
- building semantic search in V1
- storing large blobs directly in memory rows
- replacing issue comments or company docs
- coupling memory persistence to `/ops` or filesystem-only profiles

## Architecture Decision

### Source of truth

Use a DB table `agent_memories` as the primary store.

Why:

- company-scoped governance is already DB-centric
- board review/edit/delete belongs in the control plane
- DB backups already preserve this data
- memory should survive runtime resets and agent-home churn

### What should not be primary

Do not make the memory system primarily file-based.

The `/ops` directory in this repo is operator scaffolding and persona material, not the product's memory subsystem.

### Future large-artifact support

If memory entries later need attachments or files:

- keep structured metadata in DB
- store the large artifact in the existing storage subsystem
- optionally reference the asset id/path from the memory row

That keeps one storage architecture instead of inventing a second one.

## End-to-End Feature Shape

The feature should have 6 integrated layers:

1. DB schema and migration
2. Shared types and validators
3. Backend services and routes
4. Agent skill and agent-facing write path
5. Heartbeat prompt injection
6. Board UX for review and control

## Data Model

Create `agent_memories`.

Suggested columns:

- `id`
- `company_id`
- `agent_id`
- `key`
- `title`
- `content`
- `category`
- `importance`
- `source`
- `source_issue_id`
- `source_comment_id`
- `source_run_id`
- `metadata_json`
- `expires_at`
- `last_accessed_at`
- `created_at`
- `updated_at`
- `archived_at`

### Field semantics

- `key`
  - stable logical identifier for upsert behavior
  - examples: `calendar_provider`, `deploy_repo`, `brand_voice`
- `title`
  - short human-readable label
- `content`
  - the actual memory text injected or shown in UI
- `category`
  - enum-like string
  - examples: `preference`, `environment`, `customer_context`, `workflow`, `project_fact`
- `importance`
  - integer score, suggested range `1..100`
- `source`
  - who/what created it
  - examples: `agent`, `board`, `system`, `import`
- `metadata_json`
  - reserved for future fields without schema churn
- `expires_at`
  - nullable TTL for temporary memories
- `archived_at`
  - soft-delete/archive instead of destructive delete by default

### Constraints

- unique index on `(company_id, agent_id, category, key)` for V1 upsert semantics
- foreign keys should use `ON DELETE CASCADE` for `company_id` and `agent_id`
- source links can use nullable FKs where appropriate

### Recommended indexes

- `(company_id, agent_id, archived_at)`
- `(company_id, agent_id, category, archived_at)`
- `(company_id, agent_id, expires_at)`
- `(company_id, agent_id, importance desc, updated_at desc)`

## Backend Service Design

Add a dedicated service:

- `server/src/services/agent-memories.ts`

Core methods:

- `listForAgent(companyId, agentId, filters)`
- `topForAgent(companyId, agentId, options)`
- `upsertForAgent(input)`
- `updateMemory(id, companyId, patch)`
- `archiveMemory(id, companyId, actor)`
- `touchAccessed(memories)`
- `pruneExpired(now)`

### Retrieval policy for heartbeat use

Add one explicit server-side function:

- `resolveMemoriesForHeartbeat(agent, wakeContext)`

This should not just sort by importance blindly.

Recommended V1 heuristic:

1. exclude archived memories
2. exclude expired memories
3. prefer memories linked to:
   - current issue
   - current project
   - recent source run
4. then sort by:
   - importance desc
   - updatedAt desc
5. cap at a small number, for example `5`
6. cap total injected bytes/chars to avoid prompt bloat

This is the main token-savings behavior. Without it, the feature is mostly storage/governance, not actual memory recall.

## API Surface

Add company-scoped routes under `/api`.

### Board routes

- `GET /api/agents/:id/memories?companyId=...`
- `POST /api/agents/:id/memories?companyId=...`
- `PATCH /api/agents/:id/memories/:memoryId?companyId=...`
- `DELETE /api/agents/:id/memories/:memoryId?companyId=...`

Optional board-wide query:

- `GET /api/companies/:companyId/memories`

Use this only if the UI really needs cross-agent filtering. It is not required for V1.

### Agent-auth routes

If agents should write memory directly through API keys, add:

- `POST /api/agent/memories`

or reuse agent-scoped auth against:

- `POST /api/agents/:id/memories`

with agent-key auth restricted to the calling agent and company.

### API behavior

- `POST`
  - may upsert by `(companyId, agentId, category, key)`
  - response should indicate whether the row was created or updated
- `PATCH`
  - board edits existing memory
- `DELETE`
  - prefer archive semantics in service layer even if the route says delete

### Validation

Shared validators should enforce:

- non-empty `key`
- bounded `title`
- bounded `content`
- bounded `category`
- integer `importance`
- optional `expiresAt`

## Activity Logging

Every mutating action should create activity entries:

- `agent_memory.created`
- `agent_memory.updated`
- `agent_memory.archived`
- `agent_memory.restored` if restore is supported

Activity details should include:

- `agentId`
- `category`
- `key`
- `importance`
- source linkage when present

## Agent Skill

Add a new skill:

- `skills/memory/SKILL.md`

Purpose:

- teach agents when to remember
- teach agents what should not be stored
- standardize the write format

The skill should instruct agents to remember:

- stable environment facts
- durable customer preferences
- workflow conventions
- project-specific facts likely to matter again

The skill should instruct agents not to remember:

- secrets in plaintext
- volatile run logs
- one-off noise
- giant copied documents

### Recommended write contract

The skill should encourage a concise payload:

- `key`
- `title`
- `content`
- `category`
- `importance`
- optional `expiresAt`

## Heartbeat Integration

This is the part that actually makes the feature matter.

Add memory injection during heartbeat assembly in:

- `server/src/services/heartbeat.ts`

### Injection shape

Add a small section in the system/bootstrap prompt, for example:

`Persistent context for this agent`

Then inject selected memories as a compact list:

- `[category] title`
- `content`

### Guardrails

- inject only if at least one memory is selected
- cap count
- cap bytes/chars
- strip expired memories
- avoid duplicate injection if the same memory was already included in resumed session context metadata

### Usage tracking

When memories are injected:

- update `last_accessed_at`
- optionally record the selected memory ids in `heartbeat_runs.context_snapshot`

That gives observability without adding another table in V1.

## UX Changes

Yes, UX changes are needed.

### Agent detail

Add a new tab in agent detail:

- `Memory`

Show:

- list of current memories
- category
- importance
- source
- expiry
- created/updated timestamps

Actions:

- create
- edit
- archive
- filter by category
- show expired / archived toggle only if needed

### Memory form

Fields:

- `Key`
- `Title`
- `Category`
- `Content`
- `Importance`
- `Expires at`

Keep it simple. No rich editor needed in V1.

### Explainability UI

The memory tab should explain:

- memories are durable context for the agent
- they may be injected into future runs
- this is separate from runtime files and separate from S3 storage

### Optional run visibility

If low effort:

- show on each run whether memory context was injected
- maybe count how many memories were included

This can be a later enhancement if the heartbeat context snapshot already stores ids.

## Integration with Existing Fork Features

### Runtime homes and S3 sync

Do not store memory primarily in runtime folders.

Reason:

- runtime folders are operational state
- memory is product data
- DB + existing backup pipeline already handles product persistence better

### DB backups

This feature naturally benefits from the DB backup system already in the fork.

No extra backup mechanism is needed for V1.

### Storage system

No direct dependency for V1.

Only use storage later if memory entries gain optional attachments.

### Cost/noise work

Memory should reduce repeated rediscovery and therefore reduce wasted prompt tokens.

This complements:

- idle wake suppression
- circuit breaker
- session hardening

## Rollout Plan

### Phase 1: Persistence + board UI

Ship:

- table
- CRUD API
- agent detail memory tab
- activity log

This gives governance and manual value fast.

### Phase 2: agent write path + skill

Ship:

- memory skill
- agent-authenticated write endpoint
- upsert semantics

This gives self-maintained memory.

### Phase 3: heartbeat recall

Ship:

- memory selection heuristic
- prompt injection
- last-accessed updates
- context snapshot instrumentation

This is the true token-savings phase.

### Phase 4: observability and refinement

Ship:

- metrics on memory usage
- count of runs with injected memories
- UX improvements for filters and provenance

## Testing Plan

### DB/service tests

- create memory
- upsert same `(category, key)` updates row
- expired memory excluded from `topForAgent`
- archived memory excluded from active list
- delete/archive behavior respects company scope

### API tests

- board can CRUD within company
- board cannot cross company boundary
- agent key can only write for itself if enabled
- validation rejects oversized or malformed payloads

### Heartbeat tests

- top memories injected into prompt when available
- expired/archived memories not injected
- injection capped by count and size
- selected memory ids recorded in run context when enabled

### UI tests

- memory tab lists rows
- create/edit/archive works
- category filter works
- stale caches invalidate correctly after mutation

## Risks

### Prompt bloat

Too many memories can create a new token waste problem.

Mitigation:

- hard cap count
- hard cap size
- deterministic ranking

### Low-quality memories

Agents may write noisy or redundant memory.

Mitigation:

- importance field
- board review UI
- archive control
- skill guidance

### Semantic recall quality

Importance-only ranking may miss what matters for a specific issue.

Mitigation:

- V1 use issue/project/source linkage bias
- revisit semantic search only later if needed

### Scope creep

It is easy to turn this into a knowledge graph project.

Mitigation:

- keep V1 text-first
- no vector DB
- no embeddings requirement

## What to Borrow from PR #461

Borrow conceptually:

- DB-backed persistent memory
- board CRUD
- agent skill
- activity logging
- memory tab idea

Do not copy blindly:

- route semantics without reviewing cache invalidation
- FK behavior
- raw UI behavior
- any missing heartbeat integration

## Recommendation

Implement this feature in this fork.

Implementation stance:

- yes to `agent_memories`
- yes to board UI and agent write path
- yes to heartbeat recall
- no to raw cherry-pick of `#461`
- no to filesystem-first memory

If we do this, the minimum bar for "done" is not just CRUD.

The minimum meaningful release should include:

- DB persistence
- board review/edit
- agent write path
- heartbeat injection

Otherwise we ship storage without the main benefit described in issue `#460`.
