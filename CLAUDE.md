# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Paperclip

Paperclip is an open-source Node.js server and React UI that orchestrates teams of AI agents to run a business. It provides org charts, budgets, governance, goal alignment, and agent coordination — acting as a control plane for AI-agent companies.

## Commands

```sh
pnpm install               # Install all dependencies
pnpm dev                   # Full dev (API + UI on localhost:3100)
pnpm dev:server            # Server only
pnpm build                 # Build all packages
pnpm typecheck             # Typecheck all packages (pnpm -r typecheck)
pnpm test:run              # Run all tests (vitest)
pnpm test                  # Run tests in watch mode

# Run a single test file:
pnpm vitest run server/src/__tests__/health.test.ts

# Database:
pnpm db:generate           # Generate migration (compiles packages/db first)
pnpm db:migrate            # Apply migrations

# Verification before claiming done:
pnpm -r typecheck && pnpm test:run && pnpm build
```

## Architecture

**pnpm monorepo** with these workspace packages:

| Package | Purpose |
|---------|---------|
| `server/` | Express 5 REST API + orchestration services (`@paperclipai/server`) |
| `ui/` | React 19 + Vite + Tailwind 4 board UI (`@paperclipai/ui`) |
| `cli/` | CLI tool (`paperclipai` commands for onboard, configure, doctor, run) |
| `packages/db/` | Drizzle ORM schema, migrations, DB client (`@paperclipai/db`) |
| `packages/shared/` | Shared types, constants, validators, API path constants (`@paperclipai/shared`) |
| `packages/adapter-utils/` | Shared adapter interfaces (`AdapterExecutionContext`, `AdapterSessionCodec`, etc.) |
| `packages/adapters/` | 5 adapter implementations: `claude-local`, `cursor-local`, `codex-local`, `opencode-local`, `openclaw` |

### Server (`server/src/`)

- **Routes** (`routes/`) — 18 route files organized by domain (agents, issues, projects, companies, goals, approvals, costs, etc.), mounted under `/api`
- **Services** (`services/`) — Business logic layer. Key files: `heartbeat.ts` (agent scheduling), `issues.ts` (task management), `agents.ts`, `company-portability.ts`
- **Middleware chain** in `app.ts`: JSON parsing → pino-http logging → private hostname guard → actor middleware (auth) → board mutation guard → API routes → UI serving → error handler
- **Adapters** (`adapters/`) — Registry that maps adapter types to execution implementations
- **Storage** (`storage/`) — Abstraction over S3 and local disk
- **Secrets** (`secrets/`) — Secret management with local encryption provider
- **Realtime** (`realtime/`) — WebSocket live events
- **Auth** (`auth/`) — BetterAuth integration for authenticated deployments

### UI (`ui/src/`)

- **Pages** (`pages/`) — ~25 routed pages (Dashboard, AgentDetail, IssueDetail, etc.)
- **Components** (`components/`) — Domain components + `ui/` subdir for shadcn-style primitives (Radix UI)
- **API client** (`api/client.ts`) — Fetch-based with `api.get/post/patch/delete/postForm`; domain modules in `api/`
- **State** — React Context providers (CompanyContext, LiveUpdatesProvider for WebSocket, DialogContext, ToastContext), no Redux/Zustand
- **Data fetching** — TanStack React Query with query keys in `lib/queryKeys.ts`
- **Routing** — react-router-dom v7
- **Adapters** (`adapters/`) — UI-side adapter registry for transcript parsing and config rendering

### Adapter Pattern

Each adapter in `packages/adapters/` exports three entry points:
- `.` — Config docs, model definitions
- `./server` — `execute()`, `testEnvironment()`, `sessionCodec`
- `./ui` — Build config, parse stdout

The server adapter registry (`server/src/adapters/registry.ts`) imports all adapters. There are also two generic adapters defined in the CLI: `process` (subprocess) and `http` (webhook).

### Database

- PostgreSQL via Drizzle ORM with ~36 tables in `packages/db/src/schema/`
- **Embedded mode** (default): leave `DATABASE_URL` unset; uses PGlite, data at `~/.paperclip/instances/default/db/`
- **External mode**: set `DATABASE_URL` to a Postgres connection string
- Schema changes: edit `packages/db/src/schema/*.ts` → export from `schema/index.ts` → `pnpm db:generate` → `pnpm -r typecheck`

## Key Engineering Rules

1. **Company-scoped entities** — Every domain entity is scoped to a company. Enforce company boundaries in routes/services.

2. **Keep contracts synchronized** — Schema/API changes must update all layers: `packages/db` → `packages/shared` → `server` → `ui`.

3. **Control-plane invariants** — Preserve: single-assignee task model, atomic issue checkout, approval gates for governed actions, budget hard-stop auto-pause, activity logging for mutations.

4. **API conventions** — Base path `/api`. Board = full-control operator. Agent access via bearer API keys (hashed at rest). Return consistent HTTP errors (400/401/403/404/409/422/500). Write activity log entries for mutations.

5. **Tests** — Vitest 3, supertest for HTTP assertions. Config at root `vitest.config.ts` with per-package projects (packages/db, server, ui, cli, packages/adapters/opencode-local).

## Reference Docs

Read these before making significant changes:
- `doc/GOAL.md` — Project goals
- `doc/PRODUCT.md` — Product definition
- `doc/SPEC-implementation.md` — V1 build contract (concrete implementation target)
- `doc/DEVELOPING.md` — Full development guide
- `doc/DATABASE.md` — Database modes and setup
- `doc/DEPLOYMENT-MODES.md` — Deployment mode definitions
