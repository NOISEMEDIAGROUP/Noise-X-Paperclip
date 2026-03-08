# Paperclip ↔ Plane Adapter: Development Effort Analysis

**Research Date:** 2026-03-07
**Question:** How much effort to build a custom adapter between Paperclip (agent orchestration) and Plane (project management)?

---

## Executive Summary

**Effort Estimate:** Medium-High (3-5 weeks for 1 developer)

**Recommendation:** Wait for Paperclip's official "bring-your-own-ticket-system" feature OR build a lightweight sync layer (not a full adapter).

**Why:** Both systems have different core purposes:
- **Paperclip:** Agent orchestration (org charts, heartbeats, budgets, governance)
- **Plane:** Human project management (initiatives, epics, work items)

The integration requires mapping fundamentally different mental models, not just syncing data.

---

## Architecture Analysis

### Paperclip Architecture

**Tech Stack:**
- Node.js + React
- PostgreSQL (embedded or external)
- Drizzle ORM
- TypeScript

**Core Data Model:**
```
Company
  └── Project
      └── Goal
          └── Issue (called "issues" internally)
              ├── Issue Comments
              ├── Issue Labels
              ├── Issue Attachments
              └── Issue Approvals
```

**Key Concepts:**
- **Issues = Tickets** (tasks with status, assignee, comments, approvals)
- **Heartbeats** (scheduled agent wake-ups)
- **Runs** (execution instances)
- **Agents** (AI employees with budgets, roles, org chart positions)
- **Goals** (alignment hierarchy: company → project → goal → issue)

**Issue Fields:**
```typescript
{
  id: UUID
  companyId: UUID
  projectId: UUID (optional)
  goalId: UUID (optional)
  parentId: UUID (hierarchical issues)
  title: string
  description: string
  status: "backlog" | "todo" | "in_progress" | "in_review" | "blocked" | "done" | "cancelled"
  priority: "medium" | ...
  assigneeAgentId: UUID (AI agent)
  assigneeUserId: string (human)
  checkoutRunId: UUID (who's working on it)
  executionRunId: UUID (current execution)
  executionLockedAt: timestamp
  startedAt: timestamp
  completedAt: timestamp
  cancelledAt: timestamp
  issueNumber: integer
  identifier: string (e.g., "PROJ-123")
  billingCode: string
  // ... more fields
}
```

**Adapter Architecture:**
- Paperclip uses a **plugin adapter system**
- Adapters are separate npm packages under `packages/adapters/`
- Each adapter implements `ServerAdapterModule` interface:

```typescript
interface ServerAdapterModule {
  type: string;
  execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult>;
  testEnvironment(ctx: AdapterEnvironmentTestContext): Promise<AdapterEnvironmentTestResult>;
  sessionCodec?: AdapterSessionCodec;
  models?: AdapterModel[];
  listModels?: () => Promise<AdapterModel[]>;
  agentConfigurationDoc?: string;
  onHireApproved?: (payload, config) => Promise<HireApprovedHookResult>;
}
```

**Existing Adapters:**
- `adapter-claude-local` (Claude Code CLI)
- `adapter-codex-local` (OpenAI Codex)
- `adapter-opencode-local` (OpenCode)
- `adapter-cursor` (Cursor IDE)
- `adapter-openclaw` (OpenClaw)
- `adapter-process` (Generic shell commands)
- `adapter-http` (HTTP webhooks)

**Important:** Paperclip adapters are for **agent execution**, NOT ticket systems. The roadmap mentions "bring-your-own-ticket-system" but it's not implemented yet.

---

### Plane Architecture

**Tech Stack:**
- Next.js + Python (FastAPI backend)
- PostgreSQL
- REST API with OAuth 2.0
- Webhooks (HMAC-signed)
- SDKs: Node.js, Python

**Core Data Model:**
```
Workspace
  └── Project
      ├── Initiative
      │   └── Epic
      │       └── Work Item (issues/tasks)
      └── Module
          └── Work Item
```

**API Base URL:** `https://api.plane.so/`

**Authentication:**
- API Key: `X-API-Key: plane_api_<token>`
- OAuth Bearer Token: `Authorization: Bearer <token>`

**Work Item Fields:**
```typescript
{
  id: UUID
  workspace_id: string
  project_id: string
  parent: UUID (optional)
  name: string
  description_html: string
  description_text: string
  priority: "none" | "low" | "medium" | "high" | "urgent"
  state: UUID (state object reference)
  assignees: string[]
  labels: string[]
  // ... custom properties, links, attachments
}
```

**Key Differences from Paperclip:**
- **No agent concept** (assignees are humans)
- **No heartbeat system** (no scheduled execution)
- **No budget tracking** (no cost control)
- **No goal alignment hierarchy** (initiatives/epics are different)
- **No governance/approvals** (no board-level controls)

---

## Integration Challenges

### 1. Conceptual Mismatch

| Concept | Paperclip | Plane | Mapping Difficulty |
|---------|-----------|-------|-------------------|
| Task | Issue | Work Item | ✅ Easy (1:1) |
| Assignee | Agent (AI) + User (Human) | User (Human only) | ⚠️ Medium (lose AI context) |
| Status | 7 states (backlog → done) | Custom states | ⚠️ Medium (need mapping) |
| Hierarchy | Company → Project → Goal → Issue | Workspace → Project → Initiative → Epic → Work Item | ❌ Hard (different models) |
| Execution | Heartbeat Runs, checkout locks | N/A | ❌ No mapping |
| Budgets | Per-agent token budgets | N/A | ❌ No mapping |
| Governance | Approvals, board controls | N/A | ❌ No mapping |
| Context | SKILLS.md, goal ancestry | Wiki pages | ⚠️ Medium (different UX) |

### 2. Data Synchronization

**Bidirectional Sync Requirements:**
- **Paperclip → Plane:**
  - Issue created → Create Plane work item
  - Issue status changed → Update Plane state
  - Issue assigned → Assign Plane user (ignore AI agents)
  - Comment added → Add Plane comment
  - Issue completed → Mark Plane work item done

- **Plane → Paperclip:**
  - Work item created → Create Paperclip issue
  - State changed → Update Paperclip status
  - User assigned → Update Paperclip assigneeUserId
  - Comment added → Add Paperclip comment
  - **Problem:** No way to trigger Paperclip agents from Plane (no heartbeat integration)

**Conflict Resolution:**
- What if both systems update the same field simultaneously?
- Need last-write-wins or version vector system
- Plane has webhooks, Paperclip needs webhook receiver

### 3. Missing Plane Features

Paperclip features that Plane **cannot** represent:
- **Agent management** (hiring, pausing, terminating AI agents)
- **Heartbeat scheduling** (agents wake on schedule)
- **Budget enforcement** (token limits, cost tracking)
- **Execution context** (checkout locks, run history)
- **Governance** (board approvals, strategy reviews)
- **Goal alignment** (mission → project → goal → task chain)

**Result:** You'd need to keep Paperclip for these features anyway, making Plane just a **read-only view** for humans.

---

## Implementation Approaches

### Approach 1: Full Adapter (NOT RECOMMENDED)

Build a Paperclip adapter that replaces the ticket system with Plane API calls.

**What it would do:**
- Intercept all Paperclip issue operations
- Redirect to Plane API
- Store Plane IDs in Paperclip DB
- Sync status, assignees, comments bidirectionally

**Estimated Effort:**
- **Week 1-2:** Map data models, build Plane API client
- **Week 3-4:** Implement sync logic (create, update, delete)
- **Week 5:** Handle webhooks (Plane → Paperclip)
- **Week 6:** Testing, edge cases, conflict resolution

**Total:** 6 weeks (120 hours)

**Problems:**
- Paperclip adapters are for **agent execution**, not ticket storage
- Would need to fork Paperclip core (not extensible in this way)
- Breaks Paperclip's goal alignment features
- No heartbeat integration (can't trigger agents from Plane)

**Verdict:** ❌ Not feasible with current Paperclip architecture

---

### Approach 2: Sync Layer (RECOMMENDED if you must integrate)

Build a separate service that syncs Paperclip issues ↔ Plane work items.

**Architecture:**
```
Paperclip DB → Sync Service → Plane API
                ↑                ↓
            Webhook Handler ← Plane Webhooks
```

**What it would do:**
1. Poll Paperclip DB for issue changes (or use internal hooks)
2. Create/update corresponding Plane work items
3. Listen to Plane webhooks for human updates
4. Sync back to Paperclip DB

**Components:**
- **Paperclip → Plane sync** (Node.js script, runs every 5 min)
- **Plane webhook handler** (HTTP endpoint, receives Plane events)
- **Conflict resolver** (last-write-wins logic)
- **Mapping config** (Paperclip status → Plane state UUIDs)

**Estimated Effort:**
- **Week 1:** Build Paperclip DB poller, map data models
- **Week 2:** Implement Plane API client, create/update logic
- **Week 3:** Build webhook handler, sync back to Paperclip
- **Week 4:** Testing, error handling, monitoring

**Total:** 4 weeks (80 hours)

**Pros:**
- Doesn't require forking Paperclip
- Plane becomes a "human-friendly view" of agent work
- Can run as a separate service

**Cons:**
- Still can't trigger Paperclip agents from Plane
- Limited to syncing issues/work items only
- No agent management in Plane
- Potential sync delays (5 min polling)

---

### Approach 3: Wait for Official Support (BEST)

Paperclip's roadmap mentions **"bring-your-own-ticket-system"** as a planned feature.

**What this likely means:**
- Paperclip will abstract the ticket storage layer
- You'll be able to plug in Plane, Linear, Jira, etc.
- Official support for bidirectional sync
- Proper agent execution hooks

**Timeline:** Unknown (not on GitHub roadmap yet)

**Recommendation:** Monitor Paperclip GitHub issues/discussions. When this feature lands, integration becomes trivial.

---

## Detailed Implementation Plan (Approach 2)

If you decide to build the sync layer now, here's the technical breakdown:

### Phase 1: Data Model Mapping (Week 1)

**Paperclip → Plane Mapping:**

| Paperclip Field | Plane Field | Notes |
|----------------|-------------|-------|
| `companyId` | `workspace_id` | 1 company = 1 workspace |
| `projectId` | `project_id` | 1:1 mapping |
| `goalId` | `parent` (epic) | Goals → Epics (or Modules) |
| `issue.id` | `external_id` | Store Paperclip ID in Plane |
| `issue.title` | `name` | Direct copy |
| `issue.description` | `description_html` | Convert markdown to HTML |
| `issue.status` | `state` | Map to Plane state UUIDs |
| `issue.priority` | `priority` | Map "medium" → "medium" |
| `issue.assigneeUserId` | `assignees` | Array of user IDs |
| `issue.assigneeAgentId` | *(skip)* | No agent concept in Plane |
| `issue.createdAt` | `created_at` | Direct copy |
| `issue.updatedAt` | `updated_at` | Direct copy |

**Status Mapping:**

| Paperclip Status | Plane State (example) |
|------------------|----------------------|
| `backlog` | "Backlog" state UUID |
| `todo` | "Todo" state UUID |
| `in_progress` | "In Progress" state UUID |
| `in_review` | "In Review" state UUID |
| `blocked` | "Blocked" state UUID |
| `done` | "Done" state UUID |
| `cancelled` | "Cancelled" state UUID |

**Implementation:**
```typescript
// sync-service/src/mappers/paperclip-to-plane.ts
export function mapPaperclipIssueToPlane(
  issue: PaperclipIssue,
  stateMapping: Record<string, string>
): PlaneWorkItem {
  return {
    external_id: issue.id,
    project_id: issue.projectId,
    parent: issue.goalId ? mapGoalToEpic(issue.goalId) : null,
    name: issue.title,
    description_html: markdownToHtml(issue.description),
    state: stateMapping[issue.status],
    priority: mapPriority(issue.priority),
    assignees: issue.assigneeUserId ? [issue.assigneeUserId] : [],
    created_at: issue.createdAt,
    updated_at: issue.updatedAt,
  };
}
```

---

### Phase 2: Paperclip DB Poller (Week 1-2)

**Approach:** Query Paperclip's PostgreSQL DB directly.

**Implementation:**
```typescript
// sync-service/src/pollers/paperclip-poller.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { issues } from "@paperclipai/db";

export async function pollPaperclipChanges(lastSyncTime: Date) {
  const db = drizzle(process.env.PAPERCLIP_DB_URL);
  
  const changedIssues = await db
    .select()
    .from(issues)
    .where(sql`updated_at > ${lastSyncTime}`);
  
  for (const issue of changedIssues) {
    await syncToPlane(issue);
  }
  
  return changedIssues;
}
```

**Schedule:** Run every 5 minutes via cron.

---

### Phase 3: Plane API Client (Week 2)

**Implementation:**
```typescript
// sync-service/src/clients/plane-client.ts
import axios from "axios";

const PLANE_API = "https://api.plane.so/api/v1";

export class PlaneClient {
  private apiKey: string;
  private workspaceSlug: string;

  constructor(apiKey: string, workspaceSlug: string) {
    this.apiKey = apiKey;
    this.workspaceSlug = workspaceSlug;
  }

  async createWorkItem(projectId: string, data: any) {
    const response = await axios.post(
      `${PLANE_API}/workspaces/${this.workspaceSlug}/projects/${projectId}/work-items/`,
      data,
      {
        headers: { "X-API-Key": this.apiKey }
      }
    );
    return response.data;
  }

  async updateWorkItem(projectId: string, workItemId: string, data: any) {
    const response = await axios.patch(
      `${PLANE_API}/workspaces/${this.workspaceSlug}/projects/${projectId}/work-items/${workItemId}/`,
      data,
      {
        headers: { "X-API-Key": this.apiKey }
      }
    );
    return response.data;
  }
}
```

---

### Phase 4: Webhook Handler (Week 3)

**Plane Webhook Payload:**
```json
{
  "event": "work_item.updated",
  "timestamp": "2026-03-07T02:30:00Z",
  "data": {
    "id": "work-item-uuid",
    "external_id": "paperclip-issue-id",
    "name": "Updated title",
    "state": { "id": "new-state-uuid", "name": "In Progress" },
    "assignees": ["user-uuid"]
  }
}
```

**Implementation:**
```typescript
// sync-service/src/handlers/plane-webhook.ts
import express from "express";

const app = express();

app.post("/webhooks/plane", express.json(), async (req, res) => {
  const { event, data } = req.body;
  
  if (event === "work_item.updated") {
    await syncToPaperclip(data);
  }
  
  res.status(200).send("OK");
});

async function syncToPaperclip(planeWorkItem: any) {
  const paperclipIssueId = planeWorkItem.external_id;
  
  // Update Paperclip DB
  await db
    .update(issues)
    .set({
      title: planeWorkItem.name,
      status: mapPlaneStateToStatus(planeWorkItem.state.name),
      assigneeUserId: planeWorkItem.assignees[0],
      updatedAt: new Date(),
    })
    .where(eq(issues.id, paperclipIssueId));
}
```

---

### Phase 5: Testing & Monitoring (Week 4)

**Test Scenarios:**
1. Create issue in Paperclip → appears in Plane
2. Update issue status in Paperclip → updates in Plane
3. Assign user in Plane → updates in Paperclip
4. Add comment in Plane → appears in Paperclip
5. Conflict: update same field in both → last-write-wins
6. Network failure → retry logic
7. Rate limiting → respect Plane's 60 req/min limit

**Monitoring:**
- Log sync failures to Paperclip issues table
- Alert on webhook delivery failures
- Dashboard showing sync latency

---

## Alternative: Use Plane's AI Agents

**Plane has built-in AI agents** (as of 2026):
- @mention agents in work items
- Assign AI agents to handle triage, updates
- AI summarizes progress, catches duplicates

**This means:**
- Plane can do some agent-like work
- But it's **human-centric** (agents assist humans)
- Not designed for **autonomous agent companies** like Paperclip

**Recommendation:**
- Use Plane if you want **human teams + AI helpers**
- Use Paperclip if you want **AI employees + human oversight**
- Don't try to merge them (different philosophies)

---

## Cost-Benefit Analysis

### Building Sync Layer

**Costs:**
- 4 weeks development time (80 hours)
- Ongoing maintenance (2-4 hours/month)
- Hosting sync service (~$10-20/month)
- Potential sync issues, debugging

**Benefits:**
- Human-friendly Plane UI for non-technical stakeholders
- Better project views (initiatives, epics, roadmaps)
- Integrations with other tools (Plane has GitHub, Slack, etc.)

**Break-even:** Only worth it if you have:
- Non-technical stakeholders who refuse to use Paperclip UI
- Need for Plane's advanced project views
- Existing investment in Plane for other teams

---

## Final Recommendation

### Option A: Use Paperclip Only (BEST for AI companies)
- Accept Paperclip's ticket system (it's decent)
- Wait for "bring-your-own-ticket-system" feature
- Focus on agent orchestration (Paperclip's strength)

### Option B: Use Both (Sync Layer)
- Build sync service (4 weeks effort)
- Paperclip = agent control plane
- Plane = human stakeholder view
- Accept limitations (no agent triggering from Plane)

### Option C: Wait for Official Support (PATIENCE)
- Monitor Paperclip roadmap
- When "bring-your-own-ticket-system" lands, integration becomes trivial
- Estimated timeline: 3-6 months (speculation)

### Option D: Switch to Plane Entirely (NOT RECOMMENDED)
- Lose agent orchestration features
- Would need to rebuild Paperclip's core in Plane
- Estimated effort: 8-12 weeks (not worth it)

---

## Next Steps

1. **Clarify use case:**
   - Do non-technical stakeholders need to view agent work?
   - Is Plane's UI a hard requirement?
   - Can you wait 3-6 months for official support?

2. **If building sync layer:**
   - Start with Phase 1 (data model mapping)
   - Build minimal Paperclip → Plane one-way sync first
   - Add webhooks later if needed

3. **If waiting:**
   - Star Paperclip GitHub repo
   - Join Discord: https://discord.gg/m4HZY7xNG3
   - Watch for "bring-your-own-ticket-system" announcements

---

## Appendix: Key Files in Paperclip

**Adapter System:**
- `/packages/adapter-utils/src/types.ts` - Adapter interfaces
- `/server/src/adapters/registry.ts` - Adapter registry
- `/packages/adapters/*/src/server/index.ts` - Example adapters

**Issue System:**
- `/packages/db/src/schema/issues.ts` - Issue schema
- `/server/src/services/issues.ts` - Issue business logic

**Heartbeat System:**
- `/packages/db/src/schema/heartbeat_runs.ts` - Run tracking
- `/server/src/services/heartbeat.ts` - Execution scheduling

**Goal Alignment:**
- `/packages/db/src/schema/goals.ts` - Goal hierarchy
- `/packages/db/src/schema/projects.ts` - Project structure

---

## Appendix: Plane API Endpoints

**Work Items:**
- `GET /api/v1/workspaces/{slug}/projects/{id}/work-items/` - List
- `POST /api/v1/workspaces/{slug}/projects/{id}/work-items/` - Create
- `PATCH /api/v1/workspaces/{slug}/projects/{id}/work-items/{item_id}/` - Update
- `DELETE /api/v1/workspaces/{slug}/projects/{id}/work-items/{item_id}/` - Delete

**Webhooks:**
- Configure at: `https://app.plane.so/workspace/{slug}/settings/webhooks`
- Events: `work_item.created`, `work_item.updated`, `work_item.deleted`

**Rate Limits:**
- 60 requests/minute per API key
- Retry-After header on 429 responses

---

**Research Completed:** 2026-03-07 10:36 HKT
**Researcher:** Jarvis Leader
**Files Analyzed:** Paperclip GitHub repo (cloned), Plane API docs, Paperclip website
