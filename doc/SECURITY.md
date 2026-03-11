---
Owner: Server + Platform
Last Verified: 2026-03-11
Applies To: paperclip monorepo
Links: [SPEC-implementation](SPEC-implementation.md), [ARCHITECTURE](ARCHITECTURE.md)
---

# Security

Auth boundary matrix, company-scoping rules, and mutation audit requirements.

## Auth Model

| Actor | Auth Mechanism | Scope |
|-------|---------------|-------|
| Board operator | Mode-dependent: `local_trusted` (implicit), `authenticated` (session) | Full access to all companies in deployment |
| Agent | Bearer API key (`agent_api_keys`, hashed at rest) | Scoped to own company only |

## Company-Scoping Rules

1. **Every domain entity belongs to a company.** Tables include `company_id` foreign key.
2. **Routes enforce company boundary.** All queries filter by the authenticated company context.
3. **Agent keys cannot access other companies.** API key lookup returns company context; cross-company requests return 403.
4. **Board sees all companies.** Board auth provides multi-company access.

## Mutation Audit Requirements

All mutating API endpoints must:

1. Verify actor identity and authorization level
2. Enforce company-scope check before any data access
3. Emit an activity log entry with: actor, action, target entity, timestamp
4. Return appropriate HTTP error codes (400/401/403/404/409/422/500)

## API Key Security

- Agent API keys are hashed at rest (not stored in plaintext)
- Keys are generated server-side with sufficient entropy
- Key rotation: old key is invalidated when new key is issued

## Sensitive Paths (High-Risk)

These paths require elevated review in PRs:

| Path Pattern | Risk | Reason |
|-------------|------|--------|
| `server/src/routes/auth*` | High | Authentication logic |
| `server/src/services/auth*` | High | Auth service layer |
| `packages/db/src/schema/*` | High | Data model changes |
| `server/src/routes/companies*` | High | Company boundary enforcement |
| `server/src/services/approval*` | High | Governance state machine |
| `server/src/services/budget*` | High | Financial controls |
| `server/src/services/issue*checkout*` | High | Atomic checkout invariant |
| `server/src/routes/agent*` | Medium | Agent API surface |
| `.github/workflows/*` | Medium | CI/CD pipeline |
| `.env*` | High | Secrets and configuration |
