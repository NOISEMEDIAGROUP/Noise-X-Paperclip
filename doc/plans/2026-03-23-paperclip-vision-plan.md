# Paperclip Vision Enhancement — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
>
> **For OpenCode / Codex / any non-Claude agent:**
> 1. Read `doc/plans/2026-03-23-paperclip-vision-design.md` in full before writing a single line of code.
> 2. Execute phases in strict order: **A → B → C → D → E → F → G → H**
> 3. Within each phase, follow numbered tasks sequentially — do not skip or reorder.
> 4. Run the **Verify** command at the end of every phase. Do not begin the next phase until it passes.
> 5. Commit after every task (git commit message is specified in each task).
> 6. If a gate fails, fix the failure before retrying — never skip gates with `--no-verify`.
>
> **Recommended model assignment (Alibaba Cloud Studio):**
>
> | Role | Model | Why |
> |------|-------|-----|
> | **Plan review + execution decision** | `kimi-k2-instruct` (Kimi K2) | Longest context (128K+), best for ingesting the full 700-line plan + design doc in one pass and deciding phase order |
> | **Code execution (Phases A–H)** | `qwen3-coder-plus` | Purpose-built for coding, strongest on TypeScript/SQL/TDD tasks — use this for every implementation task |
> | **Phase orchestration / coordination** | `MiniMax-M2.5` | Already the Paperclip heartbeat brain; handles multi-step reasoning and handoffs between phases |
> | **Architecture decisions / risk review** | `glm-4-plus` (GLM-5 series) | Strong structured reasoning for evaluating trade-offs before Phase C (approvals) and Phase E (crypto) |
> | **Fallback / general reasoning** | `qwen-plus` (qwen3.5-plus) | Use when qwen3-coder-plus is unavailable; good general-purpose fallback |
>
> **Do not use MiniMax-M2.5 for code writing** — it is an orchestrator, not a coder. Use `qwen3-coder-plus` for all implementation tasks.

**Goal:** Transform Paperclip into a world-class AI company OS where users set a mission, agents build/ship/market autonomously, and users approve key decisions from their phone — ultimately making money in cash or crypto.

**Architecture:** 8 sequential phases building on the existing monorepo (pnpm + Turborepo). New capabilities layer on top of existing DB, auth, adapters, and integration catalog — nothing is rebuilt. Each phase is independently deployable and verifiable before the next begins.

**Tech Stack:** TypeScript monorepo · Express · Drizzle ORM + Postgres · React 19 + Vite · TanStack Query · Radix UI · WebSocket · XState v5 · BullMQ + Redis · node-telegram-bot-api · web-push · resend · vite-plugin-pwa · @use-gesture/react · Activepieces (self-hosted)

**Design doc:** `doc/plans/2026-03-23-paperclip-vision-design.md` — read this first. It contains the full data models, UX wireframes, risk tier table, and the list of files NOT to touch.

**Critical:** Before any task, verify `PHASE_STATE.md` at repo root. Files listed under Phase5-6-Complete must not be modified.

---

## Pre-flight Checklist

Before starting Phase A, verify the environment is healthy:

```bash
# 1. Start the server
cd "/Users/jonathannugroho/Documents/Personal Projects/Paperclip/server"
PAPERCLIP_MIGRATION_PROMPT=never npx tsx src/index.ts &

# 2. Verify health
curl -s http://localhost:3100/api/health | python3 -m json.tool

# 3. Typecheck passes clean
cd ..
pnpm --filter @paperclipai/server typecheck
pnpm --filter @paperclipai/ui typecheck

# 4. Existing tests pass
pnpm test
```

Expected: health returns `{ "status": "ok" }`. Zero typecheck errors. Tests pass.

---

## Phase A — Mission Foundation

**What this builds:** The mission entity, state machine, and API. No UI yet.

**New packages needed:** `xstate@^5` (server only)

```bash
cd server && pnpm add xstate
```

---

### Task A1: Add xstate and create mission DB schema

**Files:**
- Create: `packages/db/src/schema/missions.ts`
- Create: `packages/db/src/schema/mission_approval_rules.ts`
- Create: `packages/db/src/schema/mission_notification_channels.ts`
- Modify: `packages/db/src/schema/index.ts`
- Modify: `packages/db/src/schema/approvals.ts`

**Step 1: Create missions.ts**

```typescript
// packages/db/src/schema/missions.ts
import { pgTable, uuid, text, timestamp, decimal, uniqueIndex } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const missions = pgTable(
  "missions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    objectives: text("objectives").array().notNull().default([]),
    status: text("status").notNull().default("draft"),
    autonomyLevel: text("autonomy_level").notNull().default("copilot"),
    budgetCapUsd: decimal("budget_cap_usd", { precision: 10, scale: 4 }),
    digestSchedule: text("digest_schedule").notNull().default("daily"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    oneActiveMission: uniqueIndex("missions_one_active_per_company")
      .on(table.companyId)
      .where(/* sql */ `status = 'active'`),
  }),
);
```

**Step 2: Create mission_approval_rules.ts**

```typescript
// packages/db/src/schema/mission_approval_rules.ts
import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";
import { missions } from "./missions.js";

export const missionApprovalRules = pgTable("mission_approval_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  missionId: uuid("mission_id").notNull().references(() => missions.id, { onDelete: "cascade" }),
  actionType: text("action_type").notNull(),
  riskTier: text("risk_tier").notNull().default("yellow"),
  autoApproveAfterMin: integer("auto_approve_after_min"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

**Step 3: Create mission_notification_channels.ts**

```typescript
// packages/db/src/schema/mission_notification_channels.ts
import { pgTable, uuid, text, boolean, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { missions } from "./missions.js";

export const missionNotificationChannels = pgTable("mission_notification_channels", {
  id: uuid("id").primaryKey().defaultRandom(),
  missionId: uuid("mission_id").notNull().references(() => missions.id, { onDelete: "cascade" }),
  channelType: text("channel_type").notNull(),
  config: jsonb("config").$type<Record<string, string>>().notNull().default({}),
  triggers: text("triggers").array().notNull().default([]),
  enabled: boolean("enabled").notNull().default(true),
  priority: integer("priority").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

**Step 4: Export from schema index**

Add to `packages/db/src/schema/index.ts`:
```typescript
export * from "./missions.js";
export * from "./mission_approval_rules.js";
export * from "./mission_notification_channels.js";
```

**Step 5: Extend approvals table**

Add a new migration file. Do NOT edit the existing schema file directly — add columns via migration:

```bash
# Generate migration after adding columns to approvals.ts
```

Add to `packages/db/src/schema/approvals.ts` (append to the columns object):
```typescript
missionId: uuid("mission_id").references(() => missions.id),
actionType: text("action_type"),
riskTier: text("risk_tier"),
autoApproveAt: timestamp("auto_approve_at", { withTimezone: true }),
resolvedVia: text("resolved_via"),
bullJobId: text("bull_job_id"),
```

Import missions at top: `import { missions } from "./missions.js";`

**Step 6: Generate and apply migration**

```bash
cd "/Users/jonathannugroho/Documents/Personal Projects/Paperclip"
pnpm db:generate
pnpm db:migrate
```

Expected: Migration applied, no errors.

**Step 7: Commit**

```bash
git add packages/db/src/schema/missions.ts \
        packages/db/src/schema/mission_approval_rules.ts \
        packages/db/src/schema/mission_notification_channels.ts \
        packages/db/src/schema/index.ts \
        packages/db/src/schema/approvals.ts \
        packages/db/src/migrations/
git commit -m "feat(db): add missions, mission_approval_rules, mission_notification_channels tables"
```

---

### Task A2: Shared types for missions

**Files:**
- Create: `packages/shared/src/types/mission.ts`
- Modify: `packages/shared/src/types/index.ts`

**Step 1: Create mission types**

```typescript
// packages/shared/src/types/mission.ts
import { z } from "zod";

export const missionStatusSchema = z.enum(["draft", "active", "paused", "completed", "failed"]);
export const autonomyLevelSchema = z.enum(["assisted", "copilot", "autopilot"]);
export const riskTierSchema = z.enum(["green", "yellow", "red"]);
export const digestScheduleSchema = z.enum(["realtime", "hourly", "daily", "weekly"]);

export const createMissionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  objectives: z.array(z.string().min(1)).min(1).max(10),
  autonomyLevel: autonomyLevelSchema.default("copilot"),
  budgetCapUsd: z.number().positive().optional(),
  digestSchedule: digestScheduleSchema.default("daily"),
  expiresAt: z.string().datetime().optional(),
});

export const updateMissionSchema = createMissionSchema.partial().extend({
  status: missionStatusSchema.optional(),
});

export const createApprovalRuleSchema = z.object({
  actionType: z.string().min(1),
  riskTier: riskTierSchema,
  autoApproveAfterMin: z.number().int().positive().optional(),
});

export const createNotificationChannelSchema = z.object({
  channelType: z.enum(["telegram", "slack", "email", "webpush", "webhook"]),
  config: z.record(z.string()),
  triggers: z.array(z.string()).default(["approval_required", "digest"]),
  enabled: z.boolean().default(true),
  priority: z.number().int().default(1),
});

export type CreateMission = z.infer<typeof createMissionSchema>;
export type UpdateMission = z.infer<typeof updateMissionSchema>;
export type MissionStatus = z.infer<typeof missionStatusSchema>;
export type AutonomyLevel = z.infer<typeof autonomyLevelSchema>;
export type RiskTier = z.infer<typeof riskTierSchema>;
```

**Step 2: Export from shared index**

Add to `packages/shared/src/types/index.ts`:
```typescript
export * from "./mission.js";
```

**Step 3: Typecheck**

```bash
pnpm --filter @paperclipai/shared typecheck
```

Expected: 0 errors.

**Step 4: Commit**

```bash
git add packages/shared/src/types/mission.ts packages/shared/src/types/index.ts
git commit -m "feat(shared): add mission types and validators"
```

---

### Task A3: Mission service with XState machine

**Files:**
- Create: `server/src/services/mission-engine.ts`

**Step 1: Write the failing test first**

```typescript
// server/src/__tests__/mission-engine.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createMissionMachine } from "../services/mission-engine.js";
import { createActor } from "xstate";

describe("MissionMachine", () => {
  it("starts in draft state", () => {
    const actor = createActor(createMissionMachine()).start();
    expect(actor.getSnapshot().value).toBe("draft");
  });

  it("transitions draft → active on LAUNCH", () => {
    const actor = createActor(createMissionMachine()).start();
    actor.send({ type: "LAUNCH" });
    expect(actor.getSnapshot().value).toBe("active");
  });

  it("transitions active → paused on PAUSE", () => {
    const actor = createActor(createMissionMachine()).start();
    actor.send({ type: "LAUNCH" });
    actor.send({ type: "PAUSE" });
    expect(actor.getSnapshot().value).toBe("paused");
  });

  it("transitions paused → active on RESUME", () => {
    const actor = createActor(createMissionMachine()).start();
    actor.send({ type: "LAUNCH" });
    actor.send({ type: "PAUSE" });
    actor.send({ type: "RESUME" });
    expect(actor.getSnapshot().value).toBe("active");
  });

  it("transitions active → completed on COMPLETE", () => {
    const actor = createActor(createMissionMachine()).start();
    actor.send({ type: "LAUNCH" });
    actor.send({ type: "COMPLETE" });
    expect(actor.getSnapshot().value).toBe("completed");
  });

  it("cannot transition from completed", () => {
    const actor = createActor(createMissionMachine()).start();
    actor.send({ type: "LAUNCH" });
    actor.send({ type: "COMPLETE" });
    actor.send({ type: "LAUNCH" }); // invalid — should be ignored
    expect(actor.getSnapshot().value).toBe("completed");
  });
});
```

**Step 2: Run test — expect FAIL**

```bash
cd "/Users/jonathannugroho/Documents/Personal Projects/Paperclip"
pnpm --filter @paperclipai/server test server/src/__tests__/mission-engine.test.ts
```

Expected: FAIL — "Cannot find module mission-engine"

**Step 3: Implement mission-engine.ts**

```typescript
// server/src/services/mission-engine.ts
import { setup } from "xstate";
import { eq, and, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { missions, missionApprovalRules } from "@paperclipai/db";
import type { CreateMission, UpdateMission } from "@paperclipai/shared";

// ─── State Machine ────────────────────────────────────────────────────────────

export function createMissionMachine() {
  return setup({
    types: {} as { events: MissionEvent },
  }).createMachine({
    id: "mission",
    initial: "draft",
    states: {
      draft:      { on: { LAUNCH: "active" } },
      active:     { on: { PAUSE: "paused", COMPLETE: "completed", FAIL: "failed" } },
      paused:     { on: { RESUME: "active", FAIL: "failed" } },
      completed:  { type: "final" },
      failed:     { type: "final" },
    },
  });
}

type MissionEvent =
  | { type: "LAUNCH" } | { type: "PAUSE" } | { type: "RESUME" }
  | { type: "COMPLETE" } | { type: "FAIL" };

// Valid transitions map (used for DB-only updates without running actor)
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft:    ["active"],
  active:   ["paused", "completed", "failed"],
  paused:   ["active", "failed"],
  completed: [],
  failed:   [],
};

// ─── Default approval rules seeded on mission creation ───────────────────────

export const DEFAULT_APPROVAL_RULES = [
  { actionType: "code_fix",            riskTier: "green",  autoApproveAfterMin: null },
  { actionType: "write_test",          riskTier: "green",  autoApproveAfterMin: null },
  { actionType: "write_doc",           riskTier: "green",  autoApproveAfterMin: null },
  { actionType: "read_analytics",      riskTier: "green",  autoApproveAfterMin: null },
  { actionType: "read_revenue",        riskTier: "green",  autoApproveAfterMin: null },
  { actionType: "staging_deploy",      riskTier: "yellow", autoApproveAfterMin: 60  },
  { actionType: "dependency_update",   riskTier: "yellow", autoApproveAfterMin: 60  },
  { actionType: "social_post_draft",   riskTier: "yellow", autoApproveAfterMin: 30  },
  { actionType: "social_post_publish", riskTier: "yellow", autoApproveAfterMin: 30  },
  { actionType: "email_campaign",      riskTier: "yellow", autoApproveAfterMin: 120 },
  { actionType: "production_deploy",   riskTier: "red",    autoApproveAfterMin: null },
  { actionType: "user_data_change",    riskTier: "red",    autoApproveAfterMin: null },
  { actionType: "paid_integration",    riskTier: "red",    autoApproveAfterMin: null },
  { actionType: "pricing_change",      riskTier: "red",    autoApproveAfterMin: null },
  { actionType: "crypto_payout",       riskTier: "red",    autoApproveAfterMin: null },
  { actionType: "delete_data",         riskTier: "red",    autoApproveAfterMin: null },
];

// ─── Service ──────────────────────────────────────────────────────────────────

export function missionEngine(db: Db) {
  return {
    async create(companyId: string, createdBy: string, data: CreateMission) {
      const [mission] = await db.insert(missions).values({
        companyId, createdBy, ...data,
        objectives: data.objectives,
      }).returning();

      await db.insert(missionApprovalRules).values(
        DEFAULT_APPROVAL_RULES.map(r => ({ ...r, missionId: mission.id }))
      );

      return mission;
    },

    async list(companyId: string) {
      return db.select().from(missions).where(eq(missions.companyId, companyId));
    },

    async get(missionId: string) {
      const [mission] = await db.select().from(missions).where(eq(missions.id, missionId));
      return mission ?? null;
    },

    async transition(missionId: string, event: "LAUNCH" | "PAUSE" | "RESUME" | "COMPLETE" | "FAIL") {
      const mission = await this.get(missionId);
      if (!mission) throw new Error(`Mission ${missionId} not found`);

      const statusMap: Record<string, string> = {
        LAUNCH: "active", PAUSE: "paused", RESUME: "active",
        COMPLETE: "completed", FAIL: "failed",
      };
      const nextStatus = statusMap[event];

      if (!VALID_TRANSITIONS[mission.status]?.includes(nextStatus)) {
        throw new Error(`Cannot transition from ${mission.status} to ${nextStatus}`);
      }

      const updates: Record<string, unknown> = { status: nextStatus, updatedAt: new Date() };
      if (event === "LAUNCH") updates.startedAt = new Date();
      if (event === "COMPLETE" || event === "FAIL") updates.completedAt = new Date();

      const [updated] = await db.update(missions).set(updates)
        .where(eq(missions.id, missionId)).returning();
      return updated;
    },

    async update(missionId: string, data: UpdateMission) {
      const [updated] = await db.update(missions)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(missions.id, missionId)).returning();
      return updated;
    },

    async delete(missionId: string) {
      await db.delete(missions).where(eq(missions.id, missionId));
    },

    async getBudgetSpent(missionId: string): Promise<number> {
      // Aggregate cost_events linked to this mission's date range
      const mission = await this.get(missionId);
      if (!mission?.startedAt) return 0;
      const result = await db.execute(sql`
        SELECT COALESCE(SUM(total_cost_usd), 0) as spent
        FROM cost_events
        WHERE company_id = ${mission.companyId}
          AND created_at >= ${mission.startedAt}
      `);
      return Number((result.rows[0] as Record<string, unknown>)?.spent ?? 0);
    },

    async evaluateRiskTier(missionId: string, actionType: string): Promise<{
      riskTier: string; autoApproveAfterMin: number | null;
    }> {
      const [rule] = await db.select().from(missionApprovalRules)
        .where(and(
          eq(missionApprovalRules.missionId, missionId),
          eq(missionApprovalRules.actionType, actionType)
        ));
      return rule
        ? { riskTier: rule.riskTier, autoApproveAfterMin: rule.autoApproveAfterMin }
        : { riskTier: "yellow", autoApproveAfterMin: 60 }; // safe default
    },
  };
}
```

**Step 4: Run test — expect PASS**

```bash
pnpm --filter @paperclipai/server test server/src/__tests__/mission-engine.test.ts
```

Expected: 6 passing.

**Step 5: Commit**

```bash
git add server/src/services/mission-engine.ts server/src/__tests__/mission-engine.test.ts
git commit -m "feat(server): add XState mission engine with default approval rules"
```

---

### Task A4: Mission API routes

**Files:**
- Create: `server/src/routes/missions.ts`
- Modify: `server/src/routes/index.ts`

**Step 1: Write failing API test**

```typescript
// server/src/__tests__/missions.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { buildApp } from "../app.js";

const app = buildApp();

describe("Missions API", () => {
  const companyId = "test-company-id"; // use a seeded test company

  it("GET /api/companies/:id/missions returns empty array", async () => {
    const res = await request(app).get(`/api/companies/${companyId}/missions`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.missions)).toBe(true);
  });

  it("POST /api/companies/:id/missions creates a mission", async () => {
    const res = await request(app)
      .post(`/api/companies/${companyId}/missions`)
      .send({ title: "Test Mission", objectives: ["Reach 100 users"], autonomyLevel: "copilot" });
    expect(res.status).toBe(201);
    expect(res.body.mission.status).toBe("draft");
    expect(res.body.mission.title).toBe("Test Mission");
  });

  it("PATCH /api/companies/:id/missions/:mId/launch activates mission", async () => {
    const create = await request(app)
      .post(`/api/companies/${companyId}/missions`)
      .send({ title: "Launch Me", objectives: ["Ship v1"], autonomyLevel: "copilot" });
    const missionId = create.body.mission.id;

    const res = await request(app)
      .patch(`/api/companies/${companyId}/missions/${missionId}/launch`);
    expect(res.status).toBe(200);
    expect(res.body.mission.status).toBe("active");
  });
});
```

**Step 2: Run test — expect FAIL**

```bash
pnpm --filter @paperclipai/server test server/src/__tests__/missions.test.ts
```

Expected: FAIL — 404 on all routes.

**Step 3: Create missions route**

```typescript
// server/src/routes/missions.ts
import { Router } from "express";
import { missionEngine } from "../services/mission-engine.js";
import { createMissionSchema, updateMissionSchema } from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { assertBoard, assertCompanyAccess } from "./authz.js";
import { logActivity } from "../services/index.js";
import type { Db } from "@paperclipai/db";

export function missionRoutes(db: Db) {
  const router = Router();
  const engine = missionEngine(db);

  router.get("/companies/:companyId/missions", async (req, res) => {
    assertCompanyAccess(req, req.params.companyId);
    const missions = await engine.list(req.params.companyId);
    res.json({ missions });
  });

  router.post("/companies/:companyId/missions", validate(createMissionSchema), async (req, res) => {
    assertBoard(req);
    assertCompanyAccess(req, req.params.companyId);
    const mission = await engine.create(
      req.params.companyId,
      req.actor.userId ?? "board",
      req.body,
    );
    await logActivity(db, {
      companyId: req.params.companyId,
      actorType: "user", actorId: req.actor.userId ?? "board",
      action: "mission.created", entityType: "mission", entityId: mission.id,
      details: { title: mission.title },
    });
    res.status(201).json({ mission });
  });

  router.get("/companies/:companyId/missions/:missionId", async (req, res) => {
    assertCompanyAccess(req, req.params.companyId);
    const mission = await engine.get(req.params.missionId);
    if (!mission) { res.status(404).json({ error: "Mission not found" }); return; }
    const spent = await engine.getBudgetSpent(req.params.missionId);
    res.json({ mission: { ...mission, budgetSpentUsd: spent } });
  });

  router.patch("/companies/:companyId/missions/:missionId", validate(updateMissionSchema), async (req, res) => {
    assertBoard(req);
    assertCompanyAccess(req, req.params.companyId);
    const mission = await engine.update(req.params.missionId, req.body);
    res.json({ mission });
  });

  // State transitions
  for (const event of ["launch", "pause", "resume", "complete"] as const) {
    router.patch(`/companies/:companyId/missions/:missionId/${event}`, async (req, res) => {
      assertBoard(req);
      assertCompanyAccess(req, req.params.companyId);
      const eventMap = { launch: "LAUNCH", pause: "PAUSE", resume: "RESUME", complete: "COMPLETE" } as const;
      try {
        const mission = await engine.transition(req.params.missionId, eventMap[event]);
        await logActivity(db, {
          companyId: req.params.companyId,
          actorType: "user", actorId: req.actor.userId ?? "board",
          action: `mission.${event}d`, entityType: "mission", entityId: mission.id,
          details: { status: mission.status },
        });
        res.json({ mission });
      } catch (e) {
        res.status(400).json({ error: (e as Error).message });
      }
    });
  }

  router.delete("/companies/:companyId/missions/:missionId", async (req, res) => {
    assertBoard(req);
    assertCompanyAccess(req, req.params.companyId);
    await engine.delete(req.params.missionId);
    res.status(204).send();
  });

  return router;
}
```

**Step 4: Mount in routes/index.ts**

Add to `server/src/routes/index.ts`:
```typescript
import { missionRoutes } from "./missions.js";
// Inside mountRoutes function:
app.use("/api", missionRoutes(db));
```

**Step 5: Run test — expect PASS**

```bash
pnpm --filter @paperclipai/server test server/src/__tests__/missions.test.ts
pnpm --filter @paperclipai/server typecheck
```

Expected: 3 passing, 0 type errors.

**Step 6: Commit**

```bash
git add server/src/routes/missions.ts server/src/routes/index.ts server/src/__tests__/missions.test.ts
git commit -m "feat(server): add mission CRUD and state transition API routes"
```

---

## Phase B — BullMQ Job Queue

**What this builds:** Redis + job queue for auto-approve timers, daily digests, budget watching.

**New packages needed:**
```bash
# Add Redis to docker-compose, install packages
cd server && pnpm add bullmq ioredis
```

**Add Redis to docker-compose.yml:**
```yaml
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/var/lib/redis/data

volumes:
  pgdata:
  redisdata:   # add this
```

Start Redis: `docker-compose up redis -d`

---

### Task B1: Queue infrastructure

**Files:**
- Create: `server/src/services/queue.ts`

**Step 1: Write failing test**

```typescript
// server/src/__tests__/queue.test.ts
import { describe, it, expect } from "vitest";
import { getQueue, QUEUE_NAMES } from "../services/queue.js";

describe("Queue setup", () => {
  it("returns a BullMQ queue for approve-timer", () => {
    const q = getQueue(QUEUE_NAMES.APPROVE_TIMER);
    expect(q.name).toBe(QUEUE_NAMES.APPROVE_TIMER);
    await q.close();
  });
});
```

**Step 2: Run — expect FAIL**

```bash
pnpm --filter @paperclipai/server test server/src/__tests__/queue.test.ts
```

**Step 3: Implement queue.ts**

```typescript
// server/src/services/queue.ts
import { Queue, Worker, type Processor } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

export const QUEUE_NAMES = {
  APPROVE_TIMER: "approve-timer",
  DIGEST:        "digest",
  BUDGET_WATCH:  "budget-watch",
} as const;

let connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
  }
  return connection;
}

const queues = new Map<string, Queue>();

export function getQueue(name: string): Queue {
  if (!queues.has(name)) {
    queues.set(name, new Queue(name, { connection: getRedisConnection() }));
  }
  return queues.get(name)!;
}

export function createWorker(name: string, processor: Processor): Worker {
  return new Worker(name, processor, { connection: getRedisConnection() });
}

export async function closeAllQueues(): Promise<void> {
  await Promise.all([...queues.values()].map(q => q.close()));
  await connection?.quit();
}
```

**Step 4: Run test — expect PASS**

```bash
pnpm --filter @paperclipai/server test server/src/__tests__/queue.test.ts
```

**Step 5: Commit**

```bash
git add server/src/services/queue.ts server/src/__tests__/queue.test.ts
git commit -m "feat(server): add BullMQ + Redis queue infrastructure"
```

---

### Task B2: Auto-approve timer job

**Files:**
- Create: `server/src/services/jobs/approve-timer.ts`
- Modify: `server/src/routes/missions.ts` (enqueue timer when yellow approval created)
- Modify: `server/src/index.ts` (start worker on boot)

**Step 1: Implement approve-timer job**

```typescript
// server/src/services/jobs/approve-timer.ts
import { createWorker, getQueue, QUEUE_NAMES } from "../queue.js";
import type { Db } from "@paperclipai/db";
import { approvals } from "@paperclipai/db";
import { eq, and } from "drizzle-orm";

export interface ApproveTimerJobData {
  approvalId: string;
  companyId: string;
}

export function enqueueApproveTimer(approvalId: string, companyId: string, delayMinutes: number) {
  return getQueue(QUEUE_NAMES.APPROVE_TIMER).add(
    "auto-approve",
    { approvalId, companyId } satisfies ApproveTimerJobData,
    {
      delay: delayMinutes * 60 * 1000,
      jobId: `auto-approve-${approvalId}`,   // idempotent key
      removeOnComplete: true,
      removeOnFail: 5,
    },
  );
}

export function cancelApproveTimer(approvalId: string) {
  return getQueue(QUEUE_NAMES.APPROVE_TIMER).remove(`auto-approve-${approvalId}`);
}

export function startApproveTimerWorker(db: Db) {
  return createWorker(QUEUE_NAMES.APPROVE_TIMER, async (job) => {
    const { approvalId } = job.data as ApproveTimerJobData;

    // Atomic: only update if still pending
    const result = await db.update(approvals)
      .set({ status: "approved", resolvedVia: "auto", decidedAt: new Date() })
      .where(and(eq(approvals.id, approvalId), eq(approvals.status, "pending")))
      .returning();

    if (result.length > 0) {
      // Approval auto-approved — notification will be sent by notification router
      console.info(`[approve-timer] Auto-approved approval ${approvalId}`);
    }
    // If 0 rows: already resolved manually — no-op
  });
}
```

**Step 2: Start worker in server boot**

Add to `server/src/index.ts` (after DB init, before listen):
```typescript
import { startApproveTimerWorker } from "./services/jobs/approve-timer.js";
// ...
const approveTimerWorker = startApproveTimerWorker(db);
// On graceful shutdown:
process.on("SIGTERM", async () => {
  await approveTimerWorker.close();
  process.exit(0);
});
```

**Step 3: Integration test for timer**

```typescript
// server/src/__tests__/approve-timer.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { enqueueApproveTimer, cancelApproveTimer } from "../services/jobs/approve-timer.js";
import { getQueue, QUEUE_NAMES } from "../services/queue.js";

describe("ApproveTimer", () => {
  it("enqueues a delayed job with correct jobId", async () => {
    const fakeId = "test-approval-abc";
    await enqueueApproveTimer(fakeId, "company-1", 60);
    const job = await getQueue(QUEUE_NAMES.APPROVE_TIMER).getJob(`auto-approve-${fakeId}`);
    expect(job).toBeTruthy();
    expect(job?.data.approvalId).toBe(fakeId);
    await cancelApproveTimer(fakeId);
  });

  it("cancelling removes the job", async () => {
    const fakeId = "test-approval-xyz";
    await enqueueApproveTimer(fakeId, "company-1", 60);
    await cancelApproveTimer(fakeId);
    const job = await getQueue(QUEUE_NAMES.APPROVE_TIMER).getJob(`auto-approve-${fakeId}`);
    expect(job).toBeNull();
  });
});
```

**Step 4: Run test — expect PASS** (requires Redis running)

```bash
docker-compose up redis -d
pnpm --filter @paperclipai/server test server/src/__tests__/approve-timer.test.ts
```

**Step 5: Commit**

```bash
git add server/src/services/jobs/ server/src/index.ts server/src/__tests__/approve-timer.test.ts
git commit -m "feat(server): add auto-approve BullMQ timer job with cancel support"
```

---

## Phase C — Notification Delivery

**What this builds:** Telegram inline approval buttons. Email via Resend. Web Push. Generic webhook. Idempotent approval resolve endpoint.

**New packages:**
```bash
cd server && pnpm add node-telegram-bot-api web-push resend @react-email/components
pnpm add -D @types/node-telegram-bot-api @types/web-push
```

---

### Task C1: Idempotent approval resolve endpoint

**Files:**
- Create: `server/src/routes/approvals.ts`
- Modify: `server/src/routes/index.ts`

**Step 1: Write failing test**

```typescript
// server/src/__tests__/approvals-resolve.test.ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import { buildApp } from "../app.js";

describe("PATCH /api/approvals/:id", () => {
  it("resolves a pending approval", async () => {
    // Pre-create a pending approval in DB via test helper
    const approvalId = await createTestApproval("pending");
    const res = await request(buildApp())
      .patch(`/api/approvals/${approvalId}`)
      .send({ decision: "approved", resolvedVia: "web" });
    expect(res.status).toBe(200);
    expect(res.body.approval.status).toBe("approved");
    expect(res.body.approval.resolvedVia).toBe("web");
  });

  it("returns 200 idempotently if already resolved", async () => {
    const approvalId = await createTestApproval("approved");
    const res = await request(buildApp())
      .patch(`/api/approvals/${approvalId}`)
      .send({ decision: "rejected", resolvedVia: "telegram" });
    expect(res.status).toBe(200);
    expect(res.body.approval.status).toBe("approved"); // unchanged
  });
});
```

**Step 2: Implement approvals route**

```typescript
// server/src/routes/approvals.ts
import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { approvals } from "@paperclipai/db";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { cancelApproveTimer } from "../services/jobs/approve-timer.js";
import type { Db } from "@paperclipai/db";

const resolveSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  resolvedVia: z.string().default("web"),
  decisionNote: z.string().optional(),
});

export function approvalRoutes(db: Db) {
  const router = Router();

  router.patch("/approvals/:approvalId", validate(resolveSchema), async (req, res) => {
    const { approvalId } = req.params;
    const { decision, resolvedVia, decisionNote } = req.body;

    // Atomic: only update if still pending
    const result = await db.update(approvals)
      .set({
        status: decision,
        resolvedVia,
        decisionNote: decisionNote ?? null,
        decidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(approvals.id, approvalId), eq(approvals.status, "pending")))
      .returning();

    if (result.length > 0) {
      // Cancel BullMQ auto-approve timer (idempotent if not set)
      await cancelApproveTimer(approvalId).catch(() => null);
    }

    // Always return current state (idempotent)
    const [current] = await db.select().from(approvals).where(eq(approvals.id, approvalId));
    if (!current) { res.status(404).json({ error: "Approval not found" }); return; }

    res.json({ approval: current });
  });

  router.get("/companies/:companyId/approvals", async (req, res) => {
    const { companyId } = req.params;
    const status = req.query.status as string | undefined;
    const query = db.select().from(approvals)
      .where(status
        ? and(eq(approvals.companyId, companyId), eq(approvals.status, status))
        : eq(approvals.companyId, companyId));
    res.json({ approvals: await query });
  });

  return router;
}
```

**Step 3: Run test — expect PASS**

```bash
pnpm --filter @paperclipai/server test server/src/__tests__/approvals-resolve.test.ts
```

**Step 4: Commit**

```bash
git add server/src/routes/approvals.ts server/src/__tests__/approvals-resolve.test.ts
git commit -m "feat(server): add idempotent approval resolve endpoint with BullMQ timer cancel"
```

---

### Task C2: Telegram inline approval buttons

**Files:**
- Modify: `server/src/services/telegram-notifier.ts`
- Create: `server/src/routes/telegram-callback.ts`

**Step 1: Extend telegram-notifier.ts**

Find the existing `send` function. Add a new `sendApprovalRequest` method:

```typescript
// Add to existing telegram-notifier.ts service object:
async sendApprovalRequest(companyId: string, opts: {
  approvalId: string;
  description: string;
  impactSummary: string;
  riskTier: "yellow" | "red";
  autoApproveAt?: Date | null;
}) {
  const config = await getCompanyTelegramConfig(db, companyId);
  if (!config) return;

  const tierEmoji = opts.riskTier === "red" ? "🔴" : "🟡";
  const autoText = opts.autoApproveAt
    ? `\nAuto-approves: ${opts.autoApproveAt.toISOString()}`
    : "";

  const text = `${tierEmoji} *Action Required*\n\n${opts.description}\n\n_${opts.impactSummary}_${autoText}`;

  await bot.sendMessage(config.chatId, text, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[
        { text: "✓ Approve", callback_data: `approve:${opts.approvalId}` },
        { text: "✗ Reject",  callback_data: `reject:${opts.approvalId}`  },
      ]],
    },
  });
}
```

**Step 2: Create telegram-callback route**

```typescript
// server/src/routes/telegram-callback.ts
import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { approvals } from "@paperclipai/db";
import { cancelApproveTimer } from "../services/jobs/approve-timer.js";
import type { Db } from "@paperclipai/db";

export function telegramCallbackRoutes(db: Db) {
  const router = Router();

  // Telegram sends callback_query when user taps inline keyboard button
  router.post("/telegram/callback", async (req, res) => {
    // Immediately acknowledge Telegram (required within 3s)
    res.sendStatus(200);

    const callbackQuery = req.body?.callback_query;
    if (!callbackQuery?.data) return;

    const [decision, approvalId] = callbackQuery.data.split(":");
    if (!["approve", "reject"].includes(decision) || !approvalId) return;

    const status = decision === "approve" ? "approved" : "rejected";

    // Atomic update — idempotent
    const result = await db.update(approvals)
      .set({ status, resolvedVia: "telegram", decidedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(approvals.id, approvalId), eq(approvals.status, "pending")))
      .returning();

    if (result.length > 0) {
      await cancelApproveTimer(approvalId).catch(() => null);
    }
  });

  return router;
}
```

**Step 3: Mount in routes/index.ts**

```typescript
import { telegramCallbackRoutes } from "./telegram-callback.js";
app.use("/api", telegramCallbackRoutes(db));
```

**Step 4: Manual verification**

```bash
# Configure Telegram bot webhook to point at your server:
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=https://your-server/api/telegram/callback"

# Create a test approval and call sendApprovalRequest
# Verify Telegram message has [✓ Approve][✗ Reject] buttons
# Tap Approve → verify approval.status = 'approved' in DB
# Tap Reject on a second message → verify idempotent (status unchanged)
```

**Step 5: Commit**

```bash
git add server/src/services/telegram-notifier.ts server/src/routes/telegram-callback.ts
git commit -m "feat(server): add Telegram inline approval buttons with idempotent callback handler"
```

---

### Task C3: Email and Web Push adapters

**Files:**
- Create: `server/src/services/notification-router.ts`
- Create: `server/src/services/adapters/email-adapter.ts`
- Create: `server/src/services/adapters/webpush-adapter.ts`
- Create: `server/src/services/adapters/webhook-adapter.ts`

**Step 1: Notification router interface + dispatcher**

```typescript
// server/src/services/notification-router.ts
export interface NotificationAdapter {
  readonly type: string;
  sendApprovalRequest(opts: ApprovalNotificationOpts): Promise<void>;
  sendMessage(message: string, opts?: Record<string, unknown>): Promise<void>;
}

export interface ApprovalNotificationOpts {
  approvalId: string;
  description: string;
  impactSummary: string;
  riskTier: "yellow" | "red";
  autoApproveAt?: Date | null;
  approveUrl: string;   // https://app.paperclip.ai/approvals/{id}
  rejectUrl: string;
}

export class NotificationRouter {
  private adapters: Map<string, NotificationAdapter> = new Map();

  register(adapter: NotificationAdapter) {
    this.adapters.set(adapter.type, adapter);
  }

  async fanOut(channels: string[], method: keyof NotificationAdapter, payload: unknown) {
    await Promise.allSettled(
      channels
        .map(type => this.adapters.get(type))
        .filter(Boolean)
        .map(adapter => (adapter as Record<string, unknown>)[method]?.(payload))
    );
  }
}
```

**Step 2: Email adapter (Resend)**

```typescript
// server/src/services/adapters/email-adapter.ts
import { Resend } from "resend";
import type { NotificationAdapter, ApprovalNotificationOpts } from "../notification-router.js";

export class EmailAdapter implements NotificationAdapter {
  readonly type = "email";
  private client: Resend;

  constructor(private apiKey: string, private fromEmail: string, private toEmail: string) {
    this.client = new Resend(apiKey);
  }

  async sendApprovalRequest(opts: ApprovalNotificationOpts) {
    const tierLabel = opts.riskTier === "red" ? "RED — Requires Your Approval" : "YELLOW — Requires Your Approval";
    await this.client.emails.send({
      from: this.fromEmail,
      to: this.toEmail,
      subject: `[Paperclip] ${tierLabel}`,
      html: `
        <h2>${opts.description}</h2>
        <p>${opts.impactSummary}</p>
        ${opts.autoApproveAt ? `<p><em>Auto-approves at ${opts.autoApproveAt.toUTCString()}</em></p>` : ""}
        <p>
          <a href="${opts.approveUrl}" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin-right:12px">Approve</a>
          <a href="${opts.rejectUrl}" style="background:#dc2626;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">Reject</a>
        </p>
      `,
    });
  }

  async sendMessage(message: string) {
    await this.client.emails.send({
      from: this.fromEmail, to: this.toEmail,
      subject: "[Paperclip] Update", text: message,
    });
  }
}
```

**Step 3: Web Push adapter**

```typescript
// server/src/services/adapters/webpush-adapter.ts
import webpush from "web-push";
import type { NotificationAdapter, ApprovalNotificationOpts } from "../notification-router.js";

export class WebPushAdapter implements NotificationAdapter {
  readonly type = "webpush";

  constructor(private subscription: webpush.PushSubscription) {
    webpush.setVapidDetails(
      "mailto:hello@paperclip.ai",
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
  }

  async sendApprovalRequest(opts: ApprovalNotificationOpts) {
    await webpush.sendNotification(this.subscription, JSON.stringify({
      title: "Action Required",
      body: opts.description,
      data: { approvalId: opts.approvalId, approveUrl: opts.approveUrl },
    }));
  }

  async sendMessage(message: string) {
    await webpush.sendNotification(this.subscription, JSON.stringify({
      title: "Paperclip Update", body: message,
    }));
  }
}
```

**Step 4: Webhook adapter (covers Activepieces, n8n, Zapier)**

```typescript
// server/src/services/adapters/webhook-adapter.ts
import type { NotificationAdapter, ApprovalNotificationOpts } from "../notification-router.js";

export class WebhookAdapter implements NotificationAdapter {
  readonly type = "webhook";

  constructor(private webhookUrl: string) {}

  async sendApprovalRequest(opts: ApprovalNotificationOpts) {
    await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "approval_required", ...opts }),
    });
  }

  async sendMessage(message: string) {
    await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "message", message }),
    });
  }
}
```

**Step 5: Typecheck**

```bash
pnpm --filter @paperclipai/server typecheck
```

Expected: 0 errors.

**Step 6: Commit**

```bash
git add server/src/services/notification-router.ts \
        server/src/services/adapters/
git commit -m "feat(server): add notification router with email, web-push, and webhook adapters"
```

---

## Phase D — Agent Metrics Tools

**What this builds:** 5 new tools in multi_model_worker.py. CEO mission-coordinator skill. Knowledge doc injection in heartbeat.

---

### Task D1: Agent metrics API endpoints

**Files:**
- Create: `server/src/routes/agent-tools.ts`
- Create: `server/src/services/agent-metrics.ts`
- Modify: `server/src/routes/index.ts`

**Step 1: Write failing test**

```typescript
// server/src/__tests__/agent-metrics.test.ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import { buildApp } from "../app.js";

describe("Agent metrics endpoints", () => {
  it("GET /api/companies/:id/agent-tools/metrics returns metrics object", async () => {
    const res = await request(buildApp())
      .get("/api/companies/test-company/agent-tools/metrics")
      .set("Authorization", "Bearer test-agent-jwt");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("mrrUsd");
    expect(res.body).toHaveProperty("userCount");
    expect(res.body).toHaveProperty("openBugs");
  });

  it("GET /api/companies/:id/agent-tools/active-mission returns mission or null", async () => {
    const res = await request(buildApp())
      .get("/api/companies/test-company/agent-tools/active-mission")
      .set("Authorization", "Bearer test-agent-jwt");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("active");
  });
});
```

**Step 2: Create agent-metrics service**

```typescript
// server/src/services/agent-metrics.ts
import { eq, and, sql, count } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { revenueEvents, userMetricsSnapshots, issues, missions } from "@paperclipai/db";

export function agentMetricsService(db: Db) {
  return {
    async getMetrics(companyId: string) {
      // MRR: sum of last 30 days recurring revenue
      const mrrResult = await db.execute(sql`
        SELECT COALESCE(SUM(amount_usd), 0) as mrr
        FROM revenue_events
        WHERE company_id = ${companyId}
          AND type = 'subscription'
          AND created_at >= NOW() - INTERVAL '30 days'
      `);

      // User count: latest snapshot
      const [latestSnapshot] = await db.select()
        .from(userMetricsSnapshots)
        .where(eq(userMetricsSnapshots.companyId, companyId))
        .orderBy(sql`created_at DESC`)
        .limit(1);

      // Open bugs
      const [bugCount] = await db.select({ count: count() })
        .from(issues)
        .where(and(
          eq(issues.companyId, companyId),
          eq(issues.status, "open"),
          sql`labels @> '["bug"]'`
        ));

      return {
        mrrUsd: Number((mrrResult.rows[0] as Record<string, unknown>)?.mrr ?? 0),
        userCount: latestSnapshot?.totalUsers ?? 0,
        openBugs: bugCount?.count ?? 0,
      };
    },

    async getActiveMission(companyId: string) {
      const [mission] = await db.select()
        .from(missions)
        .where(and(eq(missions.companyId, companyId), eq(missions.status, "active")));

      if (!mission) return { active: false };

      return {
        active: true,
        missionId: mission.id,
        title: mission.title,
        objectives: mission.objectives,
        autonomyLevel: mission.autonomyLevel,
        budgetCapUsd: mission.budgetCapUsd ? Number(mission.budgetCapUsd) : null,
        startedAt: mission.startedAt,
      };
    },

    async proposeAction(companyId: string, missionId: string, opts: {
      actionType: string; description: string; impactSummary: string;
    }) {
      const { missionEngine } = await import("./mission-engine.js");
      const engine = missionEngine(db);
      const { riskTier, autoApproveAfterMin } = await engine.evaluateRiskTier(missionId, opts.actionType);

      if (riskTier === "green") {
        return { approved: true, riskTier };
      }

      // Create approval request
      const autoApproveAt = autoApproveAfterMin
        ? new Date(Date.now() + autoApproveAfterMin * 60 * 1000)
        : null;

      const { approvals } = await import("@paperclipai/db");
      const [approval] = await db.insert(approvals).values({
        companyId,
        type: opts.actionType,
        status: "pending",
        payload: { description: opts.description, impactSummary: opts.impactSummary, missionId },
        actionType: opts.actionType,
        riskTier,
        autoApproveAt,
        missionId,
      }).returning();

      if (autoApproveAt && autoApproveAfterMin) {
        const { enqueueApproveTimer } = await import("./jobs/approve-timer.js");
        await enqueueApproveTimer(approval.id, companyId, autoApproveAfterMin);
      }

      return {
        approved: false,
        riskTier,
        pendingId: approval.id,
        autoApproveAt,
      };
    },
  };
}
```

**Step 3: Create agent-tools routes**

```typescript
// server/src/routes/agent-tools.ts
import { Router } from "express";
import { agentMetricsService } from "../services/agent-metrics.js";
import type { Db } from "@paperclipai/db";

export function agentToolRoutes(db: Db) {
  const router = Router();
  const metrics = agentMetricsService(db);

  router.get("/companies/:companyId/agent-tools/metrics", async (req, res) => {
    res.json(await metrics.getMetrics(req.params.companyId));
  });

  router.get("/companies/:companyId/agent-tools/active-mission", async (req, res) => {
    res.json(await metrics.getActiveMission(req.params.companyId));
  });

  router.post("/companies/:companyId/agent-tools/propose-action", async (req, res) => {
    const { actionType, description, impactSummary, missionId } = req.body;
    const result = await metrics.proposeAction(req.params.companyId, missionId, {
      actionType, description, impactSummary,
    });
    res.json(result);
  });

  return router;
}
```

**Step 4: Run test — expect PASS**

```bash
pnpm --filter @paperclipai/server test server/src/__tests__/agent-metrics.test.ts
pnpm --filter @paperclipai/server typecheck
```

**Step 5: Commit**

```bash
git add server/src/services/agent-metrics.ts server/src/routes/agent-tools.ts \
        server/src/__tests__/agent-metrics.test.ts
git commit -m "feat(server): add agent metrics API (MRR, users, bugs, active mission, propose-action)"
```

---

### Task D2: Add 5 new tools to multi_model_worker.py

**File:** `~/.paperclip/workers/multi_model_worker.py`

**Step 1: Add tool definitions** (append to the existing TOOLS list)

```python
# Add to TOOLS list in multi_model_worker.py

{
    "name": "paperclip_get_active_mission",
    "description": "Get the currently active mission for this company. Always call this first on each heartbeat. Returns active: false if no mission is running — if so, post a message and stop.",
    "input_schema": {"type": "object", "properties": {}, "required": []}
},
{
    "name": "paperclip_propose_action",
    "description": "Propose an action before executing it. For GREEN tier actions, returns approved: true immediately. For YELLOW/RED, creates an approval request and returns approved: false — you MUST wait for approval before acting.",
    "input_schema": {
        "type": "object",
        "properties": {
            "action_type": {"type": "string", "description": "e.g. 'production_deploy', 'social_post_publish', 'code_fix'"},
            "description": {"type": "string", "description": "What you want to do"},
            "impact_summary": {"type": "string", "description": "Who is affected and how"},
            "mission_id": {"type": "string", "description": "The active mission ID from get_active_mission"}
        },
        "required": ["action_type", "description", "impact_summary", "mission_id"]
    }
},
{
    "name": "paperclip_get_company_metrics",
    "description": "Get current company metrics: MRR, user count, open bugs, budget usage.",
    "input_schema": {"type": "object", "properties": {}, "required": []}
},
{
    "name": "paperclip_get_revenue_trend",
    "description": "Get revenue events from the last 30 days with totals and growth rate.",
    "input_schema": {"type": "object", "properties": {}, "required": []}
},
{
    "name": "paperclip_get_integration_status",
    "description": "Get list of connected integrations and their health status.",
    "input_schema": {"type": "object", "properties": {}, "required": []}
}
```

**Step 2: Add tool execution handlers** (in the tool dispatch section)

```python
elif tool_name == "paperclip_get_active_mission":
    result = call_paperclip_api(
        "GET", f"/companies/{COMPANY_ID}/agent-tools/active-mission"
    )

elif tool_name == "paperclip_propose_action":
    result = call_paperclip_api(
        "POST", f"/companies/{COMPANY_ID}/agent-tools/propose-action",
        data={
            "actionType": tool_input["action_type"],
            "description": tool_input["description"],
            "impactSummary": tool_input["impact_summary"],
            "missionId": tool_input["mission_id"],
        }
    )

elif tool_name == "paperclip_get_company_metrics":
    result = call_paperclip_api(
        "GET", f"/companies/{COMPANY_ID}/agent-tools/metrics"
    )

elif tool_name == "paperclip_get_revenue_trend":
    result = call_paperclip_api(
        "GET", f"/companies/{COMPANY_ID}/agent-tools/revenue-trend"
    )

elif tool_name == "paperclip_get_integration_status":
    result = call_paperclip_api(
        "GET", f"/companies/{COMPANY_ID}/agent-tools/integration-status"
    )
```

**Step 3: Create mission-coordinator skill**

```bash
mkdir -p "/Users/jonathannugroho/Documents/Personal Projects/Paperclip/skills/mission-coordinator"
```

Create `skills/mission-coordinator/SKILL.md`:

```markdown
# Mission Coordinator Skill

You are operating within an active Mission. Follow this protocol on every heartbeat:

## Step 1 — Check Mission Status (ALWAYS FIRST)
Call `paperclip_get_active_mission`.
- If `active: false`: Post comment "No active mission. Awaiting Board direction." STOP.
- If `active: true`: Continue with the mission objectives below.

## Step 2 — Read Company Metrics
Call `paperclip_get_company_metrics`.
Assess: Is MRR growing? Are there open bugs blocking growth? Is budget usage healthy (<80%)?

## Step 3 — Plan Today's Work
Based on the mission objectives and current metrics, identify the top 3 priorities for this heartbeat.
Assign work to team members via `paperclip_create_issue`. Always link issues to mission objectives.

## Step 4 — Propose Before Acting
For ANY action that affects external systems, call `paperclip_propose_action` first.
- If `approved: true` → proceed immediately.
- If `approved: false` → post a comment noting the action is pending approval. Do NOT execute.
- Never execute a yellow or red tier action without explicit approval.

## Step 5 — End of Heartbeat Report
Call `paperclip_get_company_metrics` again.
Post a structured comment:
```
## Mission Progress
**Objectives:** [status per objective]
**Metrics:** MRR $X | Users Y | Open Bugs Z
**Today's work:** [what was done]
**Pending approvals:** [count]
**Budget used:** X%
```

## Budget Warning
If budget is <20% remaining: switch to conservative mode.
Conservative mode: only green-tier actions (code fixes, docs, tests). No deploys. No social posts.

## Auto-Improve Loop
After posting the progress report, call `paperclip_get_company_metrics` and compare to last heartbeat.
If any metric has regressed (MRR down, bugs up, users down): create a new issue labeled `proposed-improvement`
with a specific recommendation. The Board will review it.
```

**Step 4: Verify agent reads mission on next heartbeat**

```bash
# Trigger a CEO heartbeat manually
# Verify in heartbeat run log that get_active_mission is the first tool call
# Verify mission context appears in the run output
```

**Step 5: Commit**

```bash
git add skills/mission-coordinator/ ~/.paperclip/workers/multi_model_worker.py
git commit -m "feat(agent): add 5 metrics tools to worker and mission-coordinator skill"
```

---

## Phase E — Social + Deploy + Crypto Integrations

**What this builds:** Twitter/X, LinkedIn, Vercel, Railway in the integration catalog. Coinbase Commerce, Crossmint, MoonPay crypto webhooks → revenue_events.

---

### Task E1: Add social and deploy integrations to catalog

**File:** `ui/src/components/settings/integrationConfigs.ts`

Add these entries to the `INTEGRATION_CONFIGS` object (follow the exact same pattern as existing entries like Stripe):

```typescript
// Social media (via Activepieces webhook)
activepieces_twitter: {
  id: "activepieces_twitter",
  name: "Twitter / X",
  description: "Post tweets and threads via Activepieces automation. Agents call a webhook trigger.",
  icon: MessageSquare,
  category: "social",
  setupTime: "5 min",
  fields: [
    { key: "webhookUrl", label: "Activepieces Webhook URL", type: "url", required: true,
      hint: "Create an Activepieces workflow with an HTTP trigger, connect Twitter, paste URL here.",
      docsUrl: "https://www.activepieces.com", docsLabel: "Open Activepieces" },
  ],
  secretNames: { primary: "integration-twitter-webhook-{companyId}" },
  configFields: ["twitterWebhookUrl"],
  supportsTest: true,
  testEndpoint: "/integrations/verify/webhook",
},

activepieces_linkedin: {
  id: "activepieces_linkedin",
  name: "LinkedIn",
  description: "Post to LinkedIn company pages via Activepieces automation.",
  icon: Briefcase,
  category: "social",
  setupTime: "5 min",
  fields: [
    { key: "webhookUrl", label: "Activepieces Webhook URL", type: "url", required: true,
      hint: "Create an Activepieces workflow with an HTTP trigger and LinkedIn piece." },
  ],
  secretNames: { primary: "integration-linkedin-webhook-{companyId}" },
  configFields: ["linkedinWebhookUrl"],
  supportsTest: true,
  testEndpoint: "/integrations/verify/webhook",
},

vercel_deploy: {
  id: "vercel_deploy",
  name: "Vercel",
  description: "Trigger Vercel deployments. ReleaseOps uses this to ship your app.",
  icon: Rocket,
  category: "deploy",
  setupTime: "2 min",
  fields: [
    { key: "deployHookUrl", label: "Vercel Deploy Hook URL", type: "url", required: true,
      hint: "In Vercel: Project → Settings → Git → Deploy Hooks → Create Hook. Paste the URL here.",
      docsUrl: "https://vercel.com/docs/deployments/deploy-hooks", docsLabel: "Vercel docs" },
  ],
  secretNames: { primary: "integration-vercel-deploy-hook-{companyId}" },
  configFields: ["vercelDeployHookUrl"],
  supportsTest: true,
  testEndpoint: "/integrations/verify/webhook",
},
```

Add to `IntegrationCategory` type: `"social" | "deploy" | "crypto"`.

**Step 2: Add crypto integrations**

```typescript
coinbase_commerce: {
  id: "coinbase_commerce",
  name: "Coinbase Commerce",
  description: "Accept crypto payments (BTC, ETH, USDC). Revenue tracked automatically.",
  icon: CreditCard,
  category: "crypto",
  setupTime: "5 min",
  fields: [
    { key: "apiKey", label: "API Key", type: "password", required: true,
      hint: "From Coinbase Commerce dashboard → Settings → API keys." },
    { key: "webhookSecret", label: "Webhook Secret", type: "password", required: true,
      hint: "From Coinbase Commerce → Webhook → Copy shared secret." },
  ],
  secretNames: { primary: "integration-coinbase-commerce-{companyId}" },
  configFields: [],
  supportsTest: true,
  testEndpoint: "/integrations/verify/coinbase-commerce",
},

crossmint: {
  id: "crossmint",
  name: "Crossmint",
  description: "Web3 payments, NFTs, and AI agent virtual cards across 40+ blockchains.",
  icon: Sparkles,
  category: "crypto",
  setupTime: "5 min",
  fields: [
    { key: "apiKey", label: "API Key", type: "password", required: true,
      hint: "From Crossmint developer console → API Keys." },
    { key: "projectId", label: "Project ID", type: "text", required: true, hint: "" },
  ],
  secretNames: { primary: "integration-crossmint-{companyId}" },
  configFields: [],
  supportsTest: true,
  testEndpoint: "/integrations/verify/crossmint",
},
```

**Step 3: Add crypto webhook handlers**

Add to `server/src/routes/webhooks.ts`:

```typescript
// Coinbase Commerce webhook
router.post("/companies/:companyId/webhooks/crypto-coinbase", async (req, res) => {
  const companyId = req.params.companyId;
  const event = req.body;
  if (event.event?.type === "charge:confirmed") {
    await revenue.ingestCryptoPayment(companyId, {
      provider: "coinbase_commerce",
      amountUsd: Number(event.event.data.pricing?.local?.amount ?? 0),
      currency: event.event.data.pricing?.local?.currency ?? "USD",
      externalId: event.event.data.id,
      description: event.event.data.name,
    });
  }
  res.sendStatus(200);
});

// Crossmint webhook
router.post("/companies/:companyId/webhooks/crypto-crossmint", async (req, res) => {
  const event = req.body;
  if (event.type === "payment.succeeded") {
    await revenue.ingestCryptoPayment(req.params.companyId, {
      provider: "crossmint",
      amountUsd: Number(event.data?.totalPrice?.amount ?? 0),
      currency: event.data?.totalPrice?.currency ?? "USD",
      externalId: event.data?.orderId,
    });
  }
  res.sendStatus(200);
});
```

Add `ingestCryptoPayment` to `server/src/services/revenue.ts` (mirrors `ingestStripeWebhook` pattern).

**Step 4: Typecheck and commit**

```bash
pnpm --filter @paperclipai/ui typecheck
pnpm --filter @paperclipai/server typecheck
git add ui/src/components/settings/integrationConfigs.ts \
        server/src/routes/webhooks.ts server/src/services/revenue.ts
git commit -m "feat: add social (Twitter/LinkedIn), deploy (Vercel), and crypto (Coinbase/Crossmint) integrations"
```

---

## Phase F — Company Brain (Knowledge Base)

**What this builds:** CRUD for knowledge docs. Injection into agent system prompts via heartbeat.

### Task F1: DB schema + API

Follow the same pattern as Task A1–A4 but for `company_knowledge_docs`:

- Schema: `packages/db/src/schema/company_knowledge_docs.ts` (see design doc §5)
- Types: `packages/shared/src/types/knowledge.ts`
- Service: `server/src/services/company-brain.ts`
- Routes: `server/src/routes/knowledge.ts`
- Mount: `server/src/routes/index.ts`

Test: Create a doc via API → verify it's returned in list. Delete → verify gone.

```bash
git commit -m "feat(server): add company knowledge docs CRUD API"
```

### Task F2: Inject docs into heartbeat system prompt

**File:** `server/src/services/heartbeat.ts`

Find where the agent system prompt is assembled. Before injecting skills, prepend knowledge docs:

```typescript
// In heartbeat.ts, before building the agent prompt:
const { companyBrainService } = await import("./company-brain.js");
const brain = companyBrainService(db);
const knowledgeDocs = await brain.getDocsForRole(companyId, agent.role);
const knowledgePrefix = knowledgeDocs.length > 0
  ? `## Company Knowledge\n\n${knowledgeDocs.map(d => `### ${d.title}\n${d.content}`).join("\n\n")}\n\n---\n\n`
  : "";
// Prepend to systemPrompt
systemPrompt = knowledgePrefix + systemPrompt;
```

Test: Create a "Brand Voice" doc assigned to role `cso`. Trigger a CSO heartbeat. Search the run log for the doc title. Should appear.

```bash
git commit -m "feat(server): inject company knowledge docs into agent system prompts"
```

### Task F3: Knowledge base UI

**Files:**
- Create: `ui/src/pages/settings/Brain.tsx`
- Modify: `ui/src/pages/Settings.tsx` (add Brain tab)

Use `@mdxeditor/editor` (already installed) for the document editor. Follow the UX wireframe in design doc §8.4.

Add a "Company Brain" tab to Settings alongside Company / Integrations / Governance.

```bash
git commit -m "feat(ui): add Company Brain knowledge base editor in Settings"
```

---

## Phase G — Mission Board UI + Approval Queue + PWA

**What this builds:** The core UX. Mission wizard. Dashboard widget. Swipe-to-approve. PWA.

**New packages:**
```bash
cd ui && pnpm add @use-gesture/react
pnpm add -D vite-plugin-pwa workbox-window
```

---

### Task G1: Mission API client + wizard

**Files:**
- Create: `ui/src/api/missions.ts`
- Create: `ui/src/pages/MissionWizard.tsx`
- Create: `ui/src/pages/Missions.tsx`
- Modify: `ui/src/App.tsx` (add routes)

**Step 1: API client**

```typescript
// ui/src/api/missions.ts
import type { CreateMission } from "@paperclipai/shared";

const base = (companyId: string) => `/api/companies/${companyId}/missions`;

export const missionsApi = {
  list: (companyId: string) =>
    fetch(base(companyId)).then(r => r.json()),

  create: (companyId: string, data: CreateMission) =>
    fetch(base(companyId), { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      .then(r => r.json()),

  launch: (companyId: string, missionId: string) =>
    fetch(`${base(companyId)}/${missionId}/launch`, { method: "PATCH" }).then(r => r.json()),

  pause: (companyId: string, missionId: string) =>
    fetch(`${base(companyId)}/${missionId}/pause`, { method: "PATCH" }).then(r => r.json()),
};
```

**Step 2: Mission wizard (5 steps)**

Create `ui/src/pages/MissionWizard.tsx`. Follow the wireframe in design doc §8.3 exactly.

Key implementation notes:
- Step 1: Free-text goal OR template button grid (5 templates from design doc §8.3)
- Step 2: Three-button autonomy selector (Assisted / Copilot / Autopilot) — Copilot default
- Step 3: Budget input with "No cap" checkbox
- Step 4: Notification channel checkboxes (Telegram / Email / Slack / Webhook)
- Step 5: Review summary → "Launch Mission" calls `missionsApi.create` then `missionsApi.launch`

**Step 3: Add routes to App.tsx**

```typescript
<Route path="/:companyPrefix/missions" element={<Missions />} />
<Route path="/:companyPrefix/missions/new" element={<MissionWizard />} />
```

**Step 4: Commit**

```bash
git add ui/src/api/missions.ts ui/src/pages/MissionWizard.tsx \
        ui/src/pages/Missions.tsx ui/src/App.tsx
git commit -m "feat(ui): add Mission wizard (5-step) and missions list page"
```

---

### Task G2: Dashboard mission widget + approval badge

**Files:**
- Create: `ui/src/components/MissionStatusCard.tsx`
- Modify: `ui/src/pages/Dashboard.tsx`
- Modify: `ui/src/components/Layout.tsx` (approval badge on nav)

**MissionStatusCard** shows: title, objectives progress, budget consumed progress bar, days remaining, Pause/Details buttons. Queries `GET /api/companies/:id/missions?status=active`.

**Approval badge** on bottom nav: query `GET /api/companies/:id/approvals?status=pending`. Badge count > 0 shows red dot.

```bash
git commit -m "feat(ui): add mission status widget to dashboard and approval badge to nav"
```

---

### Task G3: Approval queue page with swipe gestures

**Files:**
- Create: `ui/src/pages/Approvals.tsx`
- Create: `ui/src/components/ApprovalCard.tsx`
- Modify: `ui/src/App.tsx` (add route)

**ApprovalCard implementation with @use-gesture:**

```tsx
// ui/src/components/ApprovalCard.tsx
import { useSpring, animated } from "@react-spring/web"; // or use plain CSS transition
import { useDrag } from "@use-gesture/react";

export function ApprovalCard({ approval, onApprove, onReject }) {
  const [{ x }, api] = useSpring(() => ({ x: 0 }));

  const bind = useDrag(({ down, movement: [mx], velocity: [vx], direction: [dx] }) => {
    const trigger = Math.abs(mx) > 120 || Math.abs(vx) > 0.5;
    if (!down && trigger) {
      dx > 0 ? onApprove(approval.id) : onReject(approval.id);
      api.start({ x: dx > 0 ? 500 : -500 }); // fly off screen
    } else {
      api.start({ x: down ? mx : 0, immediate: down });
    }
  });

  return (
    <animated.div {...bind()} style={{ x, touchAction: "none" }}
      className="bg-card border rounded-xl p-4 mb-3 cursor-grab active:cursor-grabbing select-none">
      <div className="flex items-center gap-2 mb-2">
        <span>{approval.riskTier === "red" ? "🔴" : "🟡"}</span>
        <span className="font-semibold">{approval.type}</span>
      </div>
      <p className="text-sm text-muted-foreground">{approval.payload?.description}</p>
      {approval.autoApproveAt && (
        <p className="text-xs text-yellow-500 mt-1">
          Auto-approves in {formatTimeRemaining(approval.autoApproveAt)}
        </p>
      )}
      <div className="flex gap-2 mt-3">
        <button onClick={() => onReject(approval.id)}
          className="flex-1 border border-red-500/30 text-red-500 rounded-lg py-2 text-sm">
          Reject
        </button>
        <button onClick={() => onApprove(approval.id)}
          className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm">
          Approve
        </button>
      </div>
    </animated.div>
  );
}
```

**Step 2: Commit**

```bash
git add ui/src/pages/Approvals.tsx ui/src/components/ApprovalCard.tsx
git commit -m "feat(ui): add swipe-to-approve queue page with @use-gesture/react"
```

---

### Task G4: PWA setup

**File:** `ui/vite.config.ts`

**Step 1: Add vite-plugin-pwa**

```typescript
import { VitePWA } from "vite-plugin-pwa";

// In plugins array:
VitePWA({
  registerType: "autoUpdate",
  includeAssets: ["favicon.ico", "apple-touch-icon.png"],
  manifest: {
    name: "Paperclip",
    short_name: "Paperclip",
    description: "Your AI company control plane",
    theme_color: "#0f0f0f",
    background_color: "#0f0f0f",
    display: "standalone",
    start_url: "/",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  },
  workbox: {
    runtimeCaching: [
      {
        urlPattern: /\/api\/companies\/.+\/approvals/,
        handler: "NetworkFirst",
        options: {
          cacheName: "approvals-cache",
          expiration: { maxEntries: 50, maxAgeSeconds: 300 },
        },
      },
    ],
  },
}),
```

**Step 2: Add icons** — create 192x192 and 512x512 PNG icons at `ui/public/icon-192.png` and `ui/public/icon-512.png`. Use the Paperclip logo.

**Step 3: Verify on iPhone**

```bash
pnpm build && pnpm preview
# Open on iPhone Safari → tap Share → "Add to Home Screen" → verify icon appears
```

**Step 4: Commit**

```bash
git add ui/vite.config.ts ui/public/icon-*.png
git commit -m "feat(ui): add PWA manifest and service worker for iOS home screen install"
```

---

## Phase H — Growth Features

**What this builds:** Company templates. Audit log page. Enhanced onboarding.

---

### Task H1: Company template export/import

**Files:**
- Schema: `packages/db/src/schema/company_templates.ts` (see design doc §5)
- Service: `server/src/services/template-engine.ts`
- Routes: `server/src/routes/templates.ts`
- UI: `ui/src/pages/Templates.tsx`

**Template export** serializes: company metadata + all agents (adapter config) + all skills + mission_approval_rules → JSON blob → stored in `company_templates.template_data`.

**Template import** creates a new company from the JSON blob. Agent IDs are remapped (new UUIDs). Skills are re-seeded. Approval rules are copied.

**5 pre-built templates to seed** in `packages/db/src/seed.ts`:
1. SaaS Startup, 2. Marketing Agency, 3. E-commerce, 4. Web3 Project, 5. Solo Founder

```bash
git commit -m "feat: add company template export/import with 5 pre-built templates"
```

---

### Task H2: Audit log page

**Files:**
- Create: `ui/src/pages/settings/AuditLog.tsx`
- Modify: `ui/src/pages/Settings.tsx` (add tab)

Query `GET /api/companies/:id/activity` (endpoint likely exists from activity_log table). Display as a timeline: actor, action, entity, timestamp, channel (for approval events, show `resolvedVia`).

```bash
git commit -m "feat(ui): add audit log page to Settings showing full activity timeline"
```

---

### Task H3: Onboarding integration step (2.5)

**File:** `ui/src/components/OnboardingWizard.tsx`

Add Step 2.5 between the existing adapter step and CEO setup step. Show 4 recommended integrations based on company goal keywords:
- If goal contains "deploy"/"ship"/"build" → suggest GitHub + Vercel
- If goal contains "revenue"/"$"/"paying" → suggest Stripe + Coinbase Commerce
- Default → suggest GitHub + Vercel + Stripe + Telegram

Each integration card shows name, what agents use it for, estimated setup time, and a "Connect" button that opens `IntegrationConnectModal` inline.

"Skip for now" button advances past without connecting.

```bash
git commit -m "feat(ui): add integration-first step 2.5 to onboarding wizard"
```

---

### Task H4: Agent capability card

**File:** `ui/src/pages/AgentDetail.tsx`

Add a "Capabilities" section below the existing metrics section. Fetch connected integrations via `GET /api/companies/:id/integrations` (or business-config). Cross-reference with a map of which agent roles use which integrations:

```typescript
const ROLE_CAPABILITIES: Record<string, string[]> = {
  cso:     ["twitter", "linkedin", "instagram", "slack"],
  releaseops: ["vercel_deploy", "github", "railway"],
  cto:     ["github"],
  ceo:     ["telegram", "slack"],
  pm:      ["github"],
};
```

Show connected ones as ✓, missing ones as greyed out with "Connect in Integrations →" link.

```bash
git commit -m "feat(ui): add agent capabilities card to AgentDetail showing integration status"
```

---

## Final Verification

After all phases are complete:

```bash
# 1. All tests pass
pnpm test

# 2. Zero type errors
pnpm --filter @paperclipai/server typecheck
pnpm --filter @paperclipai/ui typecheck

# 3. Build succeeds
pnpm build

# 4. Run the core revenue loop end-to-end:
# a. Create new account → complete onboarding wizard (10 min)
# b. Connect GitHub + Vercel + Stripe in step 2.5
# c. Create mission "Get to $1K MRR" → select Copilot → $20 budget → Telegram + Email → Launch
# d. Verify mission card appears on dashboard
# e. Trigger CEO heartbeat → verify mission-coordinator skill fires, metrics read
# f. Verify Telegram message with [Approve][Reject] buttons for first yellow action
# g. Tap Approve → verify approval.status = 'approved' in DB
# h. POST test Stripe webhook → verify revenue_events record created
# i. Open on iPhone Safari → verify PWA install prompt
# j. Export company as template → import to new company → verify agents restored
```

---

*Plan written: 2026-03-23*
*Phases: A (Mission) → B (Queue) → C (Notifications) → D (Agent Tools) → E (Integrations) → F (Knowledge) → G (Mission UI + PWA) → H (Growth)*
*Design reference: `doc/plans/2026-03-23-paperclip-vision-design.md`*
