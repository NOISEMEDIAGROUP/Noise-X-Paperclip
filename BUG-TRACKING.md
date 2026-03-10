# Bug Tracking

This file tracks real bugs, migration hazards, and implementation notes worth carrying into future forks or upstream contributions.

## 2026-03-09: Auth bootstrap / local-board migration trap

### Summary

An authenticated instance could get stuck in a false bootstrap state after accepting the first `bootstrap-ceo` invite.

The UI kept showing:

- `Instance setup required`
- `No instance admin exists yet`

even though the invite had already been accepted and business data was still present.

### Impact

- Board login flow looked broken.
- Existing companies, agents, issues, and goals were still in the database.
- Operators could believe the instance was partially reset when it was not.

### Root cause

Paperclip has a legacy internal board user id: `local-board`.

That id originally comes from `local_trusted` mode, where the app can operate without real auth credentials.

The bug was that authenticated-mode bootstrap logic treated `local-board` as a ghost user purely by string id, instead of checking whether that user had real auth state.

In this incident, the user record still had:

- a real email
- a real name
- an active session
- `instance_admin`

but health/bootstrap logic still ignored it because the user id string was `local-board`.

### Broken behavior

1. User runs `pnpm paperclipai auth bootstrap-ceo`.
2. User opens the invite URL and accepts it.
3. Backend promotes `req.actor.userId`.
4. If that id is still `local-board`, health logic ignores it.
5. UI remains stuck in bootstrap/setup screen.

### Correct behavior

Authenticated-mode bootstrap readiness must not depend only on `userId === "local-board"`.

It must distinguish between:

- legacy ghost `local-board` with no usable credentials
- credentialed `local-board` that already represents a real authenticated operator

### Fix applied in this fork

Files:

- [server/src/services/instance-bootstrap.ts](/Users/juandi/Documents/github/paperclip/server/src/services/instance-bootstrap.ts)
- [server/src/routes/health.ts](/Users/juandi/Documents/github/paperclip/server/src/routes/health.ts)
- [server/src/board-claim.ts](/Users/juandi/Documents/github/paperclip/server/src/board-claim.ts)
- [server/src/routes/access.ts](/Users/juandi/Documents/github/paperclip/server/src/routes/access.ts)
- [ui/src/App.tsx](/Users/juandi/Documents/github/paperclip/ui/src/App.tsx)
- [ui/src/api/health.ts](/Users/juandi/Documents/github/paperclip/ui/src/api/health.ts)

Behavior after fix:

- `health` now computes bootstrap state from real credential presence, not only from the `local-board` string.
- New state `board_claim_required` is exposed to the UI when the only admin is a true ghost `local-board`.
- `bootstrap-ceo` invite acceptance is rejected for legacy `local-board` to avoid false success.
- `board-claim` is also rejected for legacy `local-board`; a real signed-in user must claim it.
- If `local-board` already has real auth state, bootstrap is considered `ready`.

### Verification used

- `pnpm typecheck`
- `pnpm test:run`
- `pnpm build`
- Docker rebuild with `docker-compose.quickstart.yml`
- Runtime health check:
  - `GET /api/health` returned `bootstrapStatus: "ready"`

### Recommendation for upstream / future refork

Carry this logic forward if rebuilding the fork from zero.

Do not reintroduce any authenticated bootstrap check that uses only:

- `userId === "local-board"`

without also checking whether that user actually has credentials or active auth records.
