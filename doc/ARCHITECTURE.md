---
Owner: Server + Platform
Last Verified: 2026-03-11
Applies To: paperclip monorepo
Links: [SPEC-implementation](SPEC-implementation.md), [GOAL](GOAL.md), [PRODUCT](PRODUCT.md)
---

# Architecture

Paperclip is a control plane for autonomous AI companies. This document defines the bounded contexts, layer boundaries, and allowed dependency directions.

## Bounded Contexts

### 1. Company Management
Lifecycle for companies (create, list, update, archive). All domain entities are company-scoped.

### 2. Agent Management
Agent lifecycle, org tree (strict `reports_to` tree), adapter configuration (process/http), and heartbeat invocation.

### 3. Task Management
Hierarchical task model tracing to company goals. Single-assignee with atomic checkout. Status transitions enforced by guard logic.

### 4. Governance
Board approvals for hires and strategy proposals. Budget settings, hard-stop enforcement, and cost event rollups.

### 5. Activity & Audit
Activity log for all mutating actions. Cost event ingestion per agent/task/project/company.

## Layer Boundaries

```
┌─────────────────────────────────────────┐
│                  ui/                    │  React + Vite board UI
│  Consumes: /api/* endpoints only        │
│  Must not import: server/, packages/db/ │
├─────────────────────────────────────────┤
│               server/                   │  Express REST API
│  Routes → Services → DB access          │
│  Imports: packages/shared, packages/db  │
├─────────────────────────────────────────┤
│            packages/shared/             │  Types, constants, validators
│  Must not import: server/, ui/,         │
│                    packages/db/         │
├─────────────────────────────────────────┤
│             packages/db/                │  Drizzle schema, migrations
│  Must not import: server/, ui/,         │
│                    packages/shared/     │
├─────────────────────────────────────────┤
│          packages/adapters/             │  Agent execution adapters
│  Imports: packages/shared               │
│  Must not import: server/, ui/          │
└─────────────────────────────────────────┘
```

## Allowed Dependency Directions

| Source | May Import | Must Not Import |
|--------|-----------|-----------------|
| `ui/` | `packages/shared` (types only) | `server/`, `packages/db/` |
| `server/` | `packages/shared`, `packages/db`, `packages/adapters` | `ui/` |
| `packages/shared/` | (none, leaf package) | `server/`, `ui/`, `packages/db/` |
| `packages/db/` | (none, leaf package) | `server/`, `ui/`, `packages/shared/` |
| `packages/adapters/*` | `packages/shared`, `packages/adapter-utils` | `server/`, `ui/`, `packages/db/` |

## Server Internal Structure

Within `server/`:
- **Routes** (`src/routes/`): HTTP handlers. Must validate input, enforce auth/company-scope, call services.
- **Services** (`src/services/`): Business logic. Enforce invariants, emit activity logs, coordinate DB operations.
- **DB access**: Via `packages/db` Drizzle client.

Mutation paths must flow through services (not direct DB writes in routes) when activity logging or invariant enforcement is required.

## Key Invariants

1. **Company scoping**: Every domain entity belongs to a company. Routes enforce company boundary checks.
2. **Single-assignee task model**: Tasks have exactly one assignee; checkout is atomic.
3. **Activity logging**: All mutating API endpoints emit activity log entries through services.
4. **Budget hard-stop**: Cost exceeding budget triggers auto-pause.
5. **Agent auth boundary**: Agent API keys cannot access other companies' data.
