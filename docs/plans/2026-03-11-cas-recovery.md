# CAS Recovery Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore the lost `CAS` company state from surviving run logs into a usable local Paperclip instance.

**Architecture:** Build a pure run-log extractor with tests first, then use a thin restore script to upsert the extracted snapshot into embedded PostgreSQL. Keep the recovery flow idempotent so it can be rerun safely while evidence improves.

**Tech Stack:** TypeScript, Vitest, Drizzle, postgres-js, embedded PostgreSQL, Docker quickstart runtime

---

### Task 1: Add the failing extractor tests

**Files:**
- Create: `server/src/__tests__/runlog-recovery.test.ts`
- Create: `server/src/recovery/runlog-recovery.ts`

**Step 1: Write the failing test**

Cover these behaviors:

- extracts an agent from a logged `GET /api/agents/me` response
- extracts an issue from labeled `aggregated_output` that mixes text and JSON
- extracts issue comments from a logged `/comments` response
- extracts approvals and linked agent payloads from logged approval responses
- merges duplicate issue payloads by preferring richer/newer data

**Step 2: Run test to verify it fails**

Run: `pnpm test:run -- --runInBand server/src/__tests__/runlog-recovery.test.ts`

Expected: fail because recovery module does not exist yet.

**Step 3: Write minimal implementation**

Implement pure helpers for:

- decoding ndjson event rows
- parsing JSON payloads from `chunk` and `aggregated_output`
- extracting entities
- merging entity state by ID

**Step 4: Run test to verify it passes**

Run: `pnpm test:run -- --runInBand server/src/__tests__/runlog-recovery.test.ts`

Expected: pass.

### Task 2: Add snapshot builder and restore script

**Files:**
- Modify: `server/src/recovery/runlog-recovery.ts`
- Create: `scripts/recover-company-from-runlogs.ts`

**Step 1: Write the failing test**

Extend tests to cover:

- snapshot output includes company/agents/issues/comments/approvals/link rows
- missing company metadata falls back to deterministic defaults (`name=CAS`, `issuePrefix=CAS`)

**Step 2: Run test to verify it fails**

Run: `pnpm test:run -- --runInBand server/src/__tests__/runlog-recovery.test.ts`

Expected: fail on missing snapshot builder behavior.

**Step 3: Write minimal implementation**

Add:

- snapshot builder from extracted entities
- restore routine with ordered upserts
- CLI script arguments for log root, company id, database URL, and dry-run/apply

**Step 4: Run test to verify it passes**

Run: `pnpm test:run -- --runInBand server/src/__tests__/runlog-recovery.test.ts`

Expected: pass.

### Task 3: Stage recovery artifacts into the mounted Paperclip home

**Files:**
- No repo file changes required

**Step 1: Copy run logs into mounted recovery staging**

Run:

```bash
mkdir -p data/docker-paperclip/instances/default/recovery
rsync -a ~/.paperclip/instances/default/data/run-logs/ed85f5a8-c65e-42f9-b27b-d4177747897e \
  data/docker-paperclip/instances/default/recovery/
```

**Step 2: Verify staging contents**

Run:

```bash
find data/docker-paperclip/instances/default/recovery/ed85f5a8-c65e-42f9-b27b-d4177747897e -type f | wc -l
```

Expected: non-zero file count.

### Task 4: Build and run recovery in dry-run mode

**Files:**
- Modify if needed: `scripts/recover-company-from-runlogs.ts`

**Step 1: Build project**

Run: `pnpm build`

Expected: success.

**Step 2: Run dry-run recovery inside the Paperclip container**

Run:

```bash
BETTER_AUTH_SECRET=dummy-local-secret docker compose -f docker-compose.quickstart.yml exec -T paperclip \
  node --import ./server/node_modules/tsx/dist/loader.mjs \
  scripts/recover-company-from-runlogs.ts \
  --log-root /paperclip/instances/default/recovery/ed85f5a8-c65e-42f9-b27b-d4177747897e \
  --company-id ed85f5a8-c65e-42f9-b27b-d4177747897e \
  --database-url postgres://paperclip:paperclip@127.0.0.1:54329/paperclip \
  --dry-run
```

Expected: printed counts for recoverable entities and no mutation errors.

### Task 5: Apply recovery to the live embedded PostgreSQL database

**Files:**
- Modify if needed: `scripts/recover-company-from-runlogs.ts`

**Step 1: Run live restore**

Run:

```bash
BETTER_AUTH_SECRET=dummy-local-secret docker compose -f docker-compose.quickstart.yml exec -T paperclip \
  node --import ./server/node_modules/tsx/dist/loader.mjs \
  scripts/recover-company-from-runlogs.ts \
  --log-root /paperclip/instances/default/recovery/ed85f5a8-c65e-42f9-b27b-d4177747897e \
  --company-id ed85f5a8-c65e-42f9-b27b-d4177747897e \
  --database-url postgres://paperclip:paperclip@127.0.0.1:54329/paperclip \
  --apply
```

Expected: upsert summary with non-zero restored counts.

**Step 2: Verify API reads**

Run:

```bash
curl -s http://127.0.0.1:3100/api/companies
curl -s http://127.0.0.1:3100/api/companies/ed85f5a8-c65e-42f9-b27b-d4177747897e/issues
curl -s http://127.0.0.1:3100/api/issues/acc16af7-0c17-44ca-a289-a727e4bcc6bb/comments
curl -s http://127.0.0.1:3100/api/issues/acc16af7-0c17-44ca-a289-a727e4bcc6bb/approvals
```

Expected: recovered `CAS` data returned.

### Task 6: Final validation and regression check

**Files:**
- Update docs if restore workflow required clarifications

**Step 1: Run verification suite**

Run:

```bash
pnpm -r typecheck
pnpm test:run
pnpm build
```

Expected: all pass.

**Step 2: Sanity-check UI**

Open recovered company locally and verify:

- agents list shows recovered agents
- issues list shows historical tasks
- comment threads show restored history
- approvals page resolves the known hire approvals

**Step 3: Capture residual gaps**

If some entities remain unrecoverable, record exactly which classes of data were missing from artifacts rather than claiming full restoration.
