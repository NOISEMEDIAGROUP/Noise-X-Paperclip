# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Is This

Paperclip is a control plane for AI-agent companies. The current target is V1, defined in `doc/SPEC-implementation.md`. Read `AGENTS.md` first for contribution rules.

This is a fork of [paperclipai/paperclip](https://github.com/paperclipai/paperclip). The upstream repo is the canonical source.

## Common Commands

```sh
pnpm install              # Install dependencies
pnpm dev                  # Start API + UI in watch mode (localhost:3100)
pnpm dev:once             # Start without file watching
pnpm dev:server           # Server only
pnpm dev:ui               # UI only (needs separate server)

pnpm typecheck            # Typecheck all packages (alias: pnpm -r typecheck)
pnpm test                 # Run tests in watch mode (vitest)
pnpm test:run             # Run tests once
pnpm build                # Build all packages

pnpm db:generate          # Generate DB migration after schema changes
pnpm db:migrate           # Apply pending migrations

pnpm test:e2e             # Playwright E2E tests
pnpm test:e2e:headed      # E2E tests with browser visible
```

Run a single test file: `pnpm vitest run path/to/test.ts`

### Verification Before Claiming Done

```sh
pnpm -r typecheck && pnpm test:run && pnpm build
```

## Architecture

**Monorepo** using pnpm workspaces. TypeScript (strict, ESM-only). Node 20+.

### Package Layout

- `server/` — Express 5 REST API, orchestration services, WebSocket server
- `ui/` — React 19 + Vite + Tailwind CSS 4 board dashboard
- `cli/` — CLI tool (`pnpm paperclipai <command>`)
- `packages/db/` — Drizzle ORM schema, migrations, DB client (PostgreSQL)
- `packages/shared/` — Shared types, constants, validators, API path constants
- `packages/adapter-utils/` — Utilities for agent adapters
- `packages/adapters/` — Agent adapter implementations (claude-local, codex-local, cursor-local, gemini-local, opencode-local, pi-local, openclaw-gateway)
- `packages/plugins/` — Plugin system and SDK
- `doc/` — Product docs, specs, and timestamped plans (`doc/plans/YYYY-MM-DD-slug.md`)

### Server Structure

Routes are factory functions returning `Router`. Services encapsulate business logic. Base API path: `/api`.

Key patterns:
- Company-scoped multi-tenancy — all domain entities belong to a company
- Actor middleware extracts auth context (board session vs agent API key)
- Activity logging for all mutations
- Pino logger with automatic redaction of sensitive fields

### UI Structure

React functional components with hooks. TanStack React Query for data fetching. Radix UI for headless components. Routes and nav align with API surface. Company selection context scopes all pages.

### Database

Drizzle ORM with PostgreSQL. In dev, leave `DATABASE_URL` unset to use embedded PGlite (data at `~/.paperclip/instances/default/db/`).

**Schema change workflow:**
1. Edit `packages/db/src/schema/*.ts`
2. Export from `packages/db/src/schema/index.ts`
3. Run `pnpm db:generate` (compiles first, then generates migration)
4. Run `pnpm -r typecheck` to verify

Note: `drizzle.config.ts` reads compiled schema from `dist/schema/*.js`.

## Core Engineering Rules

1. **Company-scoped** — All entities scoped to a company; enforce boundaries in routes/services
2. **Keep contracts synchronized** — Schema/API changes must update all layers: `packages/db` → `packages/shared` → `server` → `ui`
3. **Preserve control-plane invariants** — Single-assignee tasks, atomic issue checkout, approval gates, budget hard-stop, activity logging
4. **Don't replace strategic docs wholesale** — Prefer additive updates; keep SPEC.md and SPEC-implementation.md aligned
5. **Plan docs go in `doc/plans/`** — Use `YYYY-MM-DD-slug.md` filenames

## Lockfile Policy

Do not commit `pnpm-lock.yaml` in PRs. GitHub Actions owns and regenerates it on pushes to master.

## Key References

- `AGENTS.md` — Contribution rules and definition of done
- `doc/SPEC-implementation.md` — V1 build contract (canonical)
- `doc/DEVELOPING.md` — Full dev setup guide
- `doc/DATABASE.md` — Database setup options
- `doc/DEPLOYMENT-MODES.md` — `local_trusted` vs `authenticated` modes
