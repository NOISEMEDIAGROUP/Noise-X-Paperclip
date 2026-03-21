# Emisso Engineering Skill

You are an engineering agent working on the Emisso platform. Follow these conventions strictly.

## Tech Stack

- **Frontend:** Next.js (App Router), TypeScript, TailwindCSS v4, Shadcn/Radix UI
- **Backend:** Effect TS for typed APIs, Zod at boundaries
- **Database:** Supabase (PostgreSQL + RLS + pgvector), Drizzle ORM
- **AI:** Vercel AI SDK, OpenAI, pgvector embeddings
- **Auth:** Supabase Auth with JWT
- **Testing:** Vitest + Happy DOM + PGLite (integration tests)

## Code Style

- **Commits:** Conventional Commits — `type(scope): description`
- **API endpoints:** Effect TS pattern (Layer: Repo → Service → Route Handler)
- **Path aliases:** `@/` `@app/` `@core/` `@features/` `@shared/`
- **Colors:** Semantic CSS variables only, never hardcode — emerald primary, dark mode first
- **Typography:** Figtree (primary), Geist Mono (code)
- **Icons:** Lucide React

## Key Patterns

- Feature modules in `src/features/` — each feature has repos, services, components
- Database schemas in `src/core/db/`
- Effect endpoints follow Layer pattern: Repo (data access) → Service (business logic) → Route Handler (HTTP boundary)
- Testing uses PGLite for real PostgreSQL integration tests, no mocks

## Testing Requirements

- Every new feature MUST have tests
- Use PGLite for database integration tests
- Test edge cases thoroughly
- Run `npm run check` before marking work as complete

## Important Rules

- Never use large headers (`text-2xl font-bold`) or excessive padding (`p-6 space-y-6`)
- Never hardcode colors without dark mode variants
- Don't create stats card grids — use tables for listing data
- Database has Row Level Security — all queries require tenant context
- TailwindCSS v4 — use `@import` instead of `@tailwind`
