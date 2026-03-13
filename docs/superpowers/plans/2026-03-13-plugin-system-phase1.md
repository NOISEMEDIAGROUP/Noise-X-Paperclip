# Plugin System Phase 1 — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Paperclip's plugin runtime — out-of-process workers, cron jobs, event bus, capability-gated SDK, CLI, and plugin creator skill.

**Architecture:** Plugins are npm packages with a manifest. The host spawns each plugin as a child process, communicating via JSON-RPC 2.0 over stdio. A capability system gates what SDK methods each plugin can call. The host provides loader, process manager, event bus, job scheduler, SDK proxy, and route forwarding.

**Tech Stack:** Node.js, TypeScript (ES2023/NodeNext), Drizzle ORM, Express, Vitest, Commander.js, cron-parser, pnpm workspaces.

**Spec:** `docs/superpowers/specs/2026-03-13-plugin-system-phase1-design.md`

---

## Chunk 1: Foundation — DB Schema, SDK Types, JSON-RPC Framing

### Task 1: Plugin DB Schema (Drizzle)

**Files:**
- Create: `packages/db/src/schema/plugins.ts`
- Create: `packages/db/src/schema/plugin_config.ts`
- Create: `packages/db/src/schema/plugin_state.ts`
- Create: `packages/db/src/schema/plugin_jobs.ts`
- Create: `packages/db/src/schema/plugin_job_runs.ts`
- Create: `packages/db/src/schema/plugin_tools.ts`
- Modify: `packages/db/src/schema/index.ts`

- [ ] **Step 1: Create `plugins` table schema**

```typescript
// packages/db/src/schema/plugins.ts
import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const plugins = pgTable("plugins", {
  id: uuid("id").primaryKey().defaultRandom(),
  pluginKey: text("plugin_key").unique().notNull(),
  displayName: text("display_name").notNull(),
  version: text("version").notNull(),
  status: text("status").notNull().default("installed"),
  capabilities: text("capabilities").array().notNull().default([]),
  manifest: jsonb("manifest").$type<Record<string, unknown>>().notNull(),
  installPath: text("install_path").notNull(),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: Create `plugin_config` table schema**

```typescript
// packages/db/src/schema/plugin_config.ts
import { pgTable, uuid, timestamp, jsonb } from "drizzle-orm/pg-core";
import { plugins } from "./plugins.js";

export const pluginConfig = pgTable("plugin_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  pluginId: uuid("plugin_id").unique().notNull().references(() => plugins.id, { onDelete: "cascade" }),
  configJson: jsonb("config_json").$type<Record<string, unknown>>().notNull().default({}), // Drizzle handles JSONB defaults — same pattern as agents.adapterConfig
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 3: Create `plugin_state` table schema**

```typescript
// packages/db/src/schema/plugin_state.ts
import { pgTable, uuid, text, timestamp, jsonb, unique } from "drizzle-orm/pg-core";
import { plugins } from "./plugins.js";

export const pluginState = pgTable(
  "plugin_state",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pluginId: uuid("plugin_id").notNull().references(() => plugins.id, { onDelete: "cascade" }),
    scope: text("scope").notNull(),
    key: text("key").notNull(),
    value: jsonb("value").$type<unknown>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pluginScopeKeyUniq: unique("plugin_state_plugin_scope_key_uniq").on(table.pluginId, table.scope, table.key),
  }),
);
```

- [ ] **Step 4: Create `plugin_jobs` table schema**

```typescript
// packages/db/src/schema/plugin_jobs.ts
import { pgTable, uuid, text, timestamp, boolean, unique } from "drizzle-orm/pg-core";
import { plugins } from "./plugins.js";

export const pluginJobs = pgTable(
  "plugin_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pluginId: uuid("plugin_id").notNull().references(() => plugins.id, { onDelete: "cascade" }),
    jobKey: text("job_key").notNull(),
    displayName: text("display_name").notNull(),
    cron: text("cron").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  },
  (table) => ({
    pluginJobKeyUniq: unique("plugin_jobs_plugin_job_key_uniq").on(table.pluginId, table.jobKey),
  }),
);
```

- [ ] **Step 5: Create `plugin_job_runs` table schema**

```typescript
// packages/db/src/schema/plugin_job_runs.ts
import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { plugins } from "./plugins.js";
import { pluginJobs } from "./plugin_jobs.js";

export const pluginJobRuns = pgTable("plugin_job_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").notNull().references(() => pluginJobs.id, { onDelete: "cascade" }),
  pluginId: uuid("plugin_id").notNull().references(() => plugins.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  error: text("error"),
  result: jsonb("result").$type<unknown>(),
});
```

- [ ] **Step 6: Create `plugin_tools` table schema**

```typescript
// packages/db/src/schema/plugin_tools.ts
import { pgTable, uuid, text, boolean, jsonb, unique } from "drizzle-orm/pg-core";
import { plugins } from "./plugins.js";

export const pluginTools = pgTable(
  "plugin_tools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pluginId: uuid("plugin_id").notNull().references(() => plugins.id, { onDelete: "cascade" }),
    toolName: text("tool_name").notNull(),
    displayName: text("display_name").notNull(),
    description: text("description").notNull(),
    parametersSchema: jsonb("parameters_schema").$type<Record<string, unknown>>().notNull(),
    enabled: boolean("enabled").notNull().default(true),
  },
  (table) => ({
    pluginToolNameUniq: unique("plugin_tools_plugin_tool_name_uniq").on(table.pluginId, table.toolName),
  }),
);
```

- [ ] **Step 7: Export all plugin tables from schema index**

Add to `packages/db/src/schema/index.ts`:

```typescript
export { plugins } from "./plugins.js";
export { pluginConfig } from "./plugin_config.js";
export { pluginState } from "./plugin_state.js";
export { pluginJobs } from "./plugin_jobs.js";
export { pluginJobRuns } from "./plugin_job_runs.js";
export { pluginTools } from "./plugin_tools.js";
```

- [ ] **Step 8: Generate and verify migration**

Run: `cd /home/clawdbot/paperclip && pnpm db:generate`

Expected: A new migration file `packages/db/src/migrations/0027_*.sql` with 6 CREATE TABLE statements, foreign keys, and unique constraints.

- [ ] **Step 9: Apply migration**

Run: `cd /home/clawdbot/paperclip && pnpm db:migrate`

Expected: Migration applies cleanly with no errors.

- [ ] **Step 10: Commit**

```bash
git add packages/db/src/schema/plugin*.ts packages/db/src/schema/index.ts packages/db/src/migrations/
git commit -m "feat(db): add plugin system schema — 6 new tables"
```

---

### Task 2: Plugin SDK Package Scaffold

**Files:**
- Create: `packages/plugin-sdk/package.json`
- Create: `packages/plugin-sdk/tsconfig.json`
- Create: `packages/plugin-sdk/src/types.ts`
- Create: `packages/plugin-sdk/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@paperclipai/plugin-sdk",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./*": "./src/*.ts"
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create types.ts with all SDK types**

```typescript
// packages/plugin-sdk/src/types.ts

// --- Manifest types ---

export interface PaperclipPluginManifestV1 {
  id: string;
  apiVersion: 1;
  version: string;
  displayName: string;
  description: string;
  categories: Array<"connector" | "workspace" | "automation" | "ui">;
  minimumPaperclipVersion?: string;
  capabilities: string[];
  entrypoints: {
    worker: string;
  };
  instanceConfigSchema?: JsonSchema;
  jobs?: Array<{
    id: string;
    displayName: string;
    cron: string;
  }>;
  events?: string[];
  tools?: Array<{
    name: string;
    displayName: string;
    description: string;
    parametersSchema: JsonSchema;
  }>;
}

// --- SDK context types ---

export interface PluginContext {
  issues: {
    create(input: IssueCreateInput): Promise<Issue>;
    read(issueId: string): Promise<Issue>;
    update(issueId: string, input: IssueUpdateInput): Promise<Issue>;
    list(companyId: string, filter?: IssueFilter): Promise<Issue[]>;
    addComment(issueId: string, body: string): Promise<Comment>;
  };
  agents: {
    list(companyId: string): Promise<Agent[]>;
    read(agentId: string): Promise<Agent>;
    wakeup(agentId: string, input: WakeupInput): Promise<void>;
  };
  events: {
    emit(name: string, payload: Record<string, unknown>): Promise<void>;
  };
  state: {
    get(scope: string, key: string): Promise<unknown | null>;
    set(scope: string, key: string, value: unknown): Promise<void>;
    delete(scope: string, key: string): Promise<void>;
  };
  config: {
    get(): Promise<Record<string, unknown>>;
  };
  logger: {
    debug(message: string, data?: Record<string, unknown>): void;
    info(message: string, data?: Record<string, unknown>): void;
    warn(message: string, data?: Record<string, unknown>): void;
    error(message: string, data?: Record<string, unknown>): void;
  };
}

// --- Handler types ---

export interface PluginWorkerHandlers {
  initialize(ctx: PluginContext): Promise<void>;
  health(): Promise<{ status: string }>;
  shutdown(): Promise<void>;
  configChanged?(ctx: PluginContext, config: Record<string, unknown>): Promise<void>;
  jobs?: Record<string, (ctx: PluginContext, job: JobContext) => Promise<void>>;
  events?: Record<string, (ctx: PluginContext, event: EventPayload) => Promise<void>>;
  routes?: Record<string, (ctx: PluginContext, req: PluginRequest) => Promise<PluginResponse>>;
  tools?: Record<string, PluginToolDefinition>;
}

export interface JobContext {
  jobKey: string;
  triggerSource: "schedule" | "manual";
  runId: string;
}

export interface EventPayload {
  name: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface PluginRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  params: Record<string, string>;
  auth: {
    userId?: string;
    agentId?: string;
    actorType: "user" | "agent" | "system";
  };
}

export interface PluginResponse {
  status: number;
  headers?: Record<string, string>;
  body: unknown;
}

export interface PluginToolDefinition {
  description: string;
  parameters: JsonSchema;
  handler(
    ctx: PluginContext,
    params: Record<string, unknown>,
    runContext: ToolRunContext,
  ): Promise<ToolResult>;
}

export interface ToolRunContext {
  agentId: string;
  agentName: string;
  runId: string;
  companyId: string;
  projectId?: string;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface WakeupInput {
  reason: string;
  payload?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

// --- Domain types (simplified mirrors of core models) ---

export interface Issue {
  id: string;
  companyId: string;
  title: string;
  description?: string;
  status: string;
  assigneeAgentId?: string;
  assigneeUserId?: string;
  priority?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IssueCreateInput {
  companyId: string;
  title: string;
  description?: string;
  status?: string;
  assigneeAgentId?: string;
  assigneeUserId?: string;
  priority?: string;
}

export interface IssueUpdateInput {
  title?: string;
  description?: string;
  status?: string;
  assigneeAgentId?: string;
  assigneeUserId?: string;
  priority?: string;
}

export interface IssueFilter {
  status?: string | string[];
  assigneeAgentId?: string;
}

export interface Comment {
  id: string;
  issueId: string;
  body: string;
  createdAt: string;
}

export interface Agent {
  id: string;
  companyId: string;
  name: string;
  role: string;
  title?: string;
  status: string;
}

// --- JSON Schema type (loose) ---

export type JsonSchema = Record<string, unknown>;

// --- JSON-RPC types ---

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// Notification: no id, no response expected
export interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
}
```

- [ ] **Step 4: Create index.ts barrel export (placeholder)**

```typescript
// packages/plugin-sdk/src/index.ts
export * from "./types.js";
// createPluginWorker will be added in Task 3
```

- [ ] **Step 5: Install dependencies**

Run: `cd /home/clawdbot/paperclip && pnpm install`

Expected: `@paperclipai/plugin-sdk` resolves in the workspace.

- [ ] **Step 6: Type-check**

Run: `cd /home/clawdbot/paperclip/packages/plugin-sdk && pnpm typecheck`

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add packages/plugin-sdk/
git commit -m "feat(plugin-sdk): scaffold package with all SDK types"
```

---

### Task 3: JSON-RPC Framing Module

**Files:**
- Create: `packages/plugin-sdk/src/rpc.ts`
- Create: `packages/plugin-sdk/src/__tests__/rpc.test.ts`

- [ ] **Step 1: Write failing tests for RPC framing**

```typescript
// packages/plugin-sdk/src/__tests__/rpc.test.ts
import { describe, it, expect } from "vitest";
import { parseJsonRpcMessage, serializeJsonRpcRequest, serializeJsonRpcResponse } from "../rpc.js";

describe("parseJsonRpcMessage", () => {
  it("parses a valid request", () => {
    const msg = '{"jsonrpc":"2.0","id":1,"method":"health","params":{}}';
    const parsed = parseJsonRpcMessage(msg);
    expect(parsed).toEqual({ jsonrpc: "2.0", id: 1, method: "health", params: {} });
  });

  it("parses a valid response", () => {
    const msg = '{"jsonrpc":"2.0","id":1,"result":{"status":"ok"}}';
    const parsed = parseJsonRpcMessage(msg);
    expect(parsed).toEqual({ jsonrpc: "2.0", id: 1, result: { status: "ok" } });
  });

  it("throws on invalid JSON", () => {
    expect(() => parseJsonRpcMessage("not json")).toThrow();
  });

  it("throws on missing jsonrpc field", () => {
    expect(() => parseJsonRpcMessage('{"id":1,"method":"foo"}')).toThrow("not a valid JSON-RPC");
  });
});

describe("serializeJsonRpcRequest", () => {
  it("serializes a request with newline delimiter", () => {
    const result = serializeJsonRpcRequest(1, "health", {});
    expect(result).toBe('{"jsonrpc":"2.0","id":1,"method":"health","params":{}}\n');
  });

  it("serializes a request without params", () => {
    const result = serializeJsonRpcRequest(2, "shutdown");
    expect(result).toBe('{"jsonrpc":"2.0","id":2,"method":"shutdown"}\n');
  });
});

describe("serializeJsonRpcResponse", () => {
  it("serializes a success response", () => {
    const result = serializeJsonRpcResponse(1, { ok: true });
    expect(result).toBe('{"jsonrpc":"2.0","id":1,"result":{"ok":true}}\n');
  });

  it("serializes an error response", () => {
    const result = serializeJsonRpcResponse(1, undefined, { code: -32600, message: "denied" });
    expect(result).toBe('{"jsonrpc":"2.0","id":1,"error":{"code":-32600,"message":"denied"}}\n');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/clawdbot/paperclip && pnpm vitest run packages/plugin-sdk/src/__tests__/rpc.test.ts`

Expected: FAIL — module `../rpc.js` not found.

- [ ] **Step 3: Implement RPC framing**

```typescript
// packages/plugin-sdk/src/rpc.ts
import type { JsonRpcRequest, JsonRpcResponse, JsonRpcError } from "./types.js";

/**
 * Parse a single newline-delimited JSON-RPC message.
 * Returns the parsed object (request or response).
 */
export function parseJsonRpcMessage(raw: string): JsonRpcRequest | JsonRpcResponse {
  const obj = JSON.parse(raw);
  if (obj.jsonrpc !== "2.0") {
    throw new Error("not a valid JSON-RPC 2.0 message");
  }
  return obj;
}

/**
 * Serialize a JSON-RPC request with newline delimiter.
 */
export function serializeJsonRpcRequest(
  id: number | string,
  method: string,
  params?: unknown,
): string {
  const msg: Record<string, unknown> = { jsonrpc: "2.0", id, method };
  if (params !== undefined) {
    msg.params = params;
  }
  return JSON.stringify(msg) + "\n";
}

/**
 * Serialize a JSON-RPC response with newline delimiter.
 */
export function serializeJsonRpcResponse(
  id: number | string,
  result?: unknown,
  error?: JsonRpcError,
): string {
  const msg: Record<string, unknown> = { jsonrpc: "2.0", id };
  if (error) {
    msg.error = error;
  } else {
    msg.result = result;
  }
  return JSON.stringify(msg) + "\n";
}

/**
 * RPC Channel: manages bidirectional JSON-RPC communication over readable/writable streams.
 * Used by both host (per-worker) and worker (to host).
 */
export class RpcChannel {
  private nextId = 1;
  private pending = new Map<number | string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();
  private buffer = "";
  private onRequest?: (method: string, params: unknown, id: number | string) => Promise<unknown>;

  constructor(
    private input: NodeJS.ReadableStream,
    private output: NodeJS.WritableStream,
  ) {
    this.input.setEncoding("utf8" as any);
    this.input.on("data", (chunk: string) => this.handleData(chunk));
  }

  /**
   * Register a handler for incoming requests (host->worker or worker->host).
   */
  setRequestHandler(handler: (method: string, params: unknown, id: number | string) => Promise<unknown>) {
    this.onRequest = handler;
  }

  /**
   * Send an RPC request and wait for the response.
   */
  async call(method: string, params?: unknown, timeoutMs = 30000): Promise<unknown> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`RPC timeout for ${method} (${timeoutMs}ms)`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.output.write(serializeJsonRpcRequest(id, method, params));
    });
  }

  /**
   * Send a response to an incoming request.
   */
  respond(id: number | string, result?: unknown, error?: JsonRpcError) {
    this.output.write(serializeJsonRpcResponse(id, result, error));
  }

  /**
   * Clean up pending calls.
   */
  destroy() {
    for (const [, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.reject(new Error("RPC channel destroyed"));
    }
    this.pending.clear();
  }

  private handleData(chunk: string) {
    this.buffer += chunk;
    const lines = this.buffer.split("\n");
    // Keep the last (possibly incomplete) line in the buffer
    this.buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim() === "") continue;
      try {
        const msg = parseJsonRpcMessage(line);
        this.handleMessage(msg);
      } catch {
        // Skip malformed messages
      }
    }
  }

  private handleMessage(msg: JsonRpcRequest | JsonRpcResponse) {
    // Response to our outgoing call
    if ("result" in msg || "error" in msg) {
      const resp = msg as JsonRpcResponse;
      const entry = this.pending.get(resp.id);
      if (entry) {
        clearTimeout(entry.timer);
        this.pending.delete(resp.id);
        if (resp.error) {
          entry.reject(new Error(resp.error.message));
        } else {
          entry.resolve(resp.result);
        }
      }
      return;
    }

    // Incoming request
    const req = msg as JsonRpcRequest;
    if (this.onRequest && req.method) {
      this.onRequest(req.method, req.params, req.id)
        .then((result) => this.respond(req.id, result))
        .catch((err) => this.respond(req.id, undefined, {
          code: -32603,
          message: err instanceof Error ? err.message : String(err),
        }));
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/clawdbot/paperclip && pnpm vitest run packages/plugin-sdk/src/__tests__/rpc.test.ts`

Expected: All 7 tests PASS.

- [ ] **Step 5: Write RpcChannel integration tests**

```typescript
// Append to packages/plugin-sdk/src/__tests__/rpc.test.ts

import { RpcChannel } from "../rpc.js";
import { PassThrough } from "node:stream";

describe("RpcChannel", () => {
  function createPair() {
    const aToB = new PassThrough();
    const bToA = new PassThrough();
    const channelA = new RpcChannel(bToA, aToB);
    const channelB = new RpcChannel(aToB, bToA);
    return { channelA, channelB };
  }

  it("sends request and receives response", async () => {
    const { channelA, channelB } = createPair();
    channelB.setRequestHandler(async (method) => {
      if (method === "health") return { status: "ok" };
      throw new Error("unknown method");
    });
    const result = await channelA.call("health");
    expect(result).toEqual({ status: "ok" });
    channelA.destroy();
    channelB.destroy();
  });

  it("handles bidirectional concurrent calls", async () => {
    const { channelA, channelB } = createPair();
    channelA.setRequestHandler(async (method, params) => {
      if (method === "issues.create") return { id: "iss-1", ...(params as object) };
      throw new Error("unknown");
    });
    channelB.setRequestHandler(async (method) => {
      if (method === "runJob") return { ok: true };
      throw new Error("unknown");
    });

    const [jobResult, issueResult] = await Promise.all([
      channelA.call("runJob", { jobKey: "sync" }),
      channelB.call("issues.create", { title: "Test" }),
    ]);
    expect(jobResult).toEqual({ ok: true });
    expect(issueResult).toEqual({ id: "iss-1", title: "Test" });
    channelA.destroy();
    channelB.destroy();
  });

  it("rejects on timeout", async () => {
    const { channelA, channelB } = createPair();
    // No handler set on B — request will never be answered
    await expect(channelA.call("health", {}, 50)).rejects.toThrow("RPC timeout");
    channelA.destroy();
    channelB.destroy();
  });

  it("propagates handler errors as JSON-RPC errors", async () => {
    const { channelA, channelB } = createPair();
    channelB.setRequestHandler(async () => {
      throw new Error("kaboom");
    });
    await expect(channelA.call("health")).rejects.toThrow("kaboom");
    channelA.destroy();
    channelB.destroy();
  });
});
```

- [ ] **Step 6: Run all RPC tests**

Run: `cd /home/clawdbot/paperclip && pnpm vitest run packages/plugin-sdk/src/__tests__/rpc.test.ts`

Expected: All 11 tests PASS.

- [ ] **Step 7: Export RpcChannel from index**

Update `packages/plugin-sdk/src/index.ts`:

```typescript
export * from "./types.js";
export { RpcChannel, parseJsonRpcMessage, serializeJsonRpcRequest, serializeJsonRpcResponse } from "./rpc.js";
```

- [ ] **Step 8: Commit**

```bash
git add packages/plugin-sdk/
git commit -m "feat(plugin-sdk): add JSON-RPC framing with RpcChannel"
```

---

### Task 4: createPluginWorker Implementation

**Files:**
- Create: `packages/plugin-sdk/src/worker.ts`
- Create: `packages/plugin-sdk/src/route-matcher.ts`
- Create: `packages/plugin-sdk/src/__tests__/route-matcher.test.ts`
- Modify: `packages/plugin-sdk/src/index.ts`

- [ ] **Step 1: Write failing tests for route matcher**

```typescript
// packages/plugin-sdk/src/__tests__/route-matcher.test.ts
import { describe, it, expect } from "vitest";
import { matchRoute } from "../route-matcher.js";

describe("matchRoute", () => {
  const routes = ["GET /jobs", "POST /jobs/:jobKey/trigger", "GET /status"];

  it("matches exact path", () => {
    const result = matchRoute(routes, "GET", "/jobs");
    expect(result).toEqual({ key: "GET /jobs", params: {} });
  });

  it("matches path with parameter", () => {
    const result = matchRoute(routes, "POST", "/jobs/sync/trigger");
    expect(result).toEqual({ key: "POST /jobs/:jobKey/trigger", params: { jobKey: "sync" } });
  });

  it("returns null for no match", () => {
    const result = matchRoute(routes, "DELETE", "/jobs");
    expect(result).toBeNull();
  });

  it("returns null for wrong path", () => {
    const result = matchRoute(routes, "GET", "/unknown");
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/clawdbot/paperclip && pnpm vitest run packages/plugin-sdk/src/__tests__/route-matcher.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement route matcher**

```typescript
// packages/plugin-sdk/src/route-matcher.ts

export interface RouteMatch {
  key: string;
  params: Record<string, string>;
}

/**
 * Match an HTTP method + path against a list of route keys like "GET /jobs/:id/trigger".
 * Returns the matched key and extracted params, or null.
 */
export function matchRoute(
  routeKeys: string[],
  method: string,
  path: string,
): RouteMatch | null {
  for (const key of routeKeys) {
    const spaceIdx = key.indexOf(" ");
    if (spaceIdx === -1) continue;
    const routeMethod = key.slice(0, spaceIdx).toUpperCase();
    const routePattern = key.slice(spaceIdx + 1);

    if (routeMethod !== method.toUpperCase()) continue;

    const params: Record<string, string> = {};
    const patternParts = routePattern.split("/");
    const pathParts = path.split("/");

    if (patternParts.length !== pathParts.length) continue;

    let matched = true;
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(":")) {
        params[patternParts[i].slice(1)] = pathParts[i];
      } else if (patternParts[i] !== pathParts[i]) {
        matched = false;
        break;
      }
    }

    if (matched) return { key, params };
  }
  return null;
}
```

- [ ] **Step 4: Run route matcher tests**

Run: `cd /home/clawdbot/paperclip && pnpm vitest run packages/plugin-sdk/src/__tests__/route-matcher.test.ts`

Expected: All 4 tests PASS.

- [ ] **Step 5: Implement createPluginWorker**

```typescript
// packages/plugin-sdk/src/worker.ts
import { RpcChannel } from "./rpc.js";
import { matchRoute } from "./route-matcher.js";
import type {
  PluginContext,
  PluginWorkerHandlers,
  PluginRequest,
  EventPayload,
  JobContext,
  ToolRunContext,
} from "./types.js";

/**
 * Boot a plugin worker process. Connects stdin/stdout as JSON-RPC channel to the host.
 * Routes incoming host calls to the provided handlers.
 */
export function createPluginWorker(handlers: PluginWorkerHandlers): void {
  const channel = new RpcChannel(process.stdin, process.stdout);
  let ctx: PluginContext;

  // Build PluginContext — each method sends an RPC to the host
  function buildContext(): PluginContext {
    return {
      issues: {
        create: (input) => channel.call("issues.create", input) as Promise<any>,
        read: (id) => channel.call("issues.read", { issueId: id }) as Promise<any>,
        update: (id, input) => channel.call("issues.update", { issueId: id, ...input }) as Promise<any>,
        list: (companyId, filter) => channel.call("issues.list", { companyId, ...filter }) as Promise<any>,
        addComment: (id, body) => channel.call("issues.addComment", { issueId: id, body }) as Promise<any>,
      },
      agents: {
        list: (companyId) => channel.call("agents.list", { companyId }) as Promise<any>,
        read: (id) => channel.call("agents.read", { agentId: id }) as Promise<any>,
        wakeup: (id, input) => channel.call("agents.wakeup", { agentId: id, ...input }) as Promise<void>,
      },
      events: {
        emit: (name, payload) => channel.call("events.emit", { name, payload }) as Promise<void>,
      },
      state: {
        get: (scope, key) => channel.call("state.get", { scope, key }) as Promise<unknown>,
        set: (scope, key, value) => channel.call("state.set", { scope, key, value }) as Promise<void>,
        delete: (scope, key) => channel.call("state.delete", { scope, key }) as Promise<void>,
      },
      config: {
        get: () => channel.call("config.get") as Promise<Record<string, unknown>>,
      },
      logger: {
        debug: (message, data) => { channel.call("logger.debug", { message, data }).catch(() => {}); },
        info: (message, data) => { channel.call("logger.info", { message, data }).catch(() => {}); },
        warn: (message, data) => { channel.call("logger.warn", { message, data }).catch(() => {}); },
        error: (message, data) => { channel.call("logger.error", { message, data }).catch(() => {}); },
      },
    };
  }

  // Route keys for route matching
  const routeKeys = handlers.routes ? Object.keys(handlers.routes) : [];

  channel.setRequestHandler(async (method, params, _id) => {
    const p = (params ?? {}) as Record<string, unknown>;

    switch (method) {
      case "initialize":
        ctx = buildContext();
        await handlers.initialize(ctx);
        return { ok: true };

      case "health":
        return handlers.health();

      case "shutdown":
        await handlers.shutdown();
        setTimeout(() => process.exit(0), 100);
        return { ok: true };

      case "configChanged":
        if (handlers.configChanged) {
          await handlers.configChanged(ctx, p.config as Record<string, unknown>);
        }
        return { ok: true };

      case "runJob": {
        const jobKey = p.jobKey as string;
        const handler = handlers.jobs?.[jobKey];
        if (!handler) throw new Error(`no handler for job "${jobKey}"`);
        const jobCtx: JobContext = {
          jobKey,
          triggerSource: (p.triggerSource as "schedule" | "manual") ?? "schedule",
          runId: p.runId as string,
        };
        await handler(ctx, jobCtx);
        return { ok: true };
      }

      case "onEvent": {
        const eventName = p.name as string;
        const handler = handlers.events?.[eventName];
        if (!handler) return { ok: true }; // silently ignore unhandled events
        const eventPayload: EventPayload = {
          name: eventName,
          payload: p.payload as Record<string, unknown>,
          timestamp: p.timestamp as string,
        };
        await handler(ctx, eventPayload);
        return { ok: true };
      }

      case "executeTool": {
        const toolName = p.toolName as string;
        const tool = handlers.tools?.[toolName];
        if (!tool) throw new Error(`no handler for tool "${toolName}"`);
        return tool.handler(
          ctx,
          p.parameters as Record<string, unknown>,
          p.runContext as ToolRunContext,
        );
      }

      case "handleRequest": {
        const req = p as unknown as PluginRequest;
        if (!handlers.routes || routeKeys.length === 0) {
          return { status: 404, body: { error: "no routes" } };
        }
        const match = matchRoute(routeKeys, req.method, req.path);
        if (!match) {
          return { status: 404, body: { error: "route not found" } };
        }
        const routeHandler = handlers.routes[match.key];
        return routeHandler(ctx, { ...req, params: { ...req.params, ...match.params } });
      }

      default:
        throw new Error(`unknown method: ${method}`);
    }
  });

  // Handle SIGTERM gracefully
  process.on("SIGTERM", async () => {
    try {
      await handlers.shutdown();
    } finally {
      process.exit(0);
    }
  });
}
```

- [ ] **Step 6: Update index.ts exports**

```typescript
// packages/plugin-sdk/src/index.ts
export * from "./types.js";
export { RpcChannel, parseJsonRpcMessage, serializeJsonRpcRequest, serializeJsonRpcResponse } from "./rpc.js";
export { createPluginWorker } from "./worker.js";
export { matchRoute } from "./route-matcher.js";
```

- [ ] **Step 7: Type-check the full SDK package**

Run: `cd /home/clawdbot/paperclip/packages/plugin-sdk && pnpm typecheck`

Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add packages/plugin-sdk/
git commit -m "feat(plugin-sdk): implement createPluginWorker and route matcher"
```

---

## Chunk 2: Core Host — Loader, Process Manager

### Task 5: Manifest Validation (Zod Schema)

**Files:**
- Create: `server/src/plugins/types.ts`
- Create: `server/src/__tests__/plugin-manifest.test.ts`

- [ ] **Step 1: Write failing tests for manifest validation**

```typescript
// server/src/__tests__/plugin-manifest.test.ts
import { describe, it, expect } from "vitest";
import { manifestSchema, validateManifest } from "../plugins/types.js";

describe("validateManifest", () => {
  const validManifest = {
    id: "@test/plugin-foo",
    apiVersion: 1,
    version: "1.0.0",
    displayName: "Test Plugin",
    description: "A test plugin",
    categories: ["automation"],
    capabilities: ["issues.read", "jobs.schedule"],
    entrypoints: { worker: "./dist/worker.js" },
    jobs: [{ id: "sync", displayName: "Sync", cron: "* * * * *" }],
  };

  it("accepts a valid manifest", () => {
    const result = validateManifest(validManifest);
    expect(result.success).toBe(true);
  });

  it("rejects manifest missing id", () => {
    const { id, ...noId } = validManifest;
    const result = validateManifest(noId);
    expect(result.success).toBe(false);
  });

  it("rejects manifest with invalid apiVersion", () => {
    const result = validateManifest({ ...validManifest, apiVersion: 2 });
    expect(result.success).toBe(false);
  });

  it("rejects manifest with invalid cron expression", () => {
    const result = validateManifest({
      ...validManifest,
      jobs: [{ id: "bad", displayName: "Bad", cron: "not-a-cron" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts manifest with events array", () => {
    const result = validateManifest({
      ...validManifest,
      events: ["agent.run.failed", "issue.created"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts manifest with tools array", () => {
    const result = validateManifest({
      ...validManifest,
      tools: [{
        name: "list-jobs",
        displayName: "List Jobs",
        description: "Lists all jobs",
        parametersSchema: { type: "object" },
      }],
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/clawdbot/paperclip && pnpm vitest run server/src/__tests__/plugin-manifest.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement manifest validation**

```typescript
// server/src/plugins/types.ts
import { z } from "zod";
import { parseExpression } from "cron-parser";

const cronString = z.string().refine(
  (val) => {
    try {
      parseExpression(val);
      return true;
    } catch {
      return false;
    }
  },
  { message: "Invalid cron expression" },
);

export const manifestSchema = z.object({
  id: z.string().min(1),
  apiVersion: z.literal(1),
  version: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string(),
  categories: z.array(z.enum(["connector", "workspace", "automation", "ui"])),
  minimumPaperclipVersion: z.string().optional(),
  capabilities: z.array(z.string()),
  entrypoints: z.object({
    worker: z.string().min(1),
  }),
  instanceConfigSchema: z.record(z.unknown()).optional(),
  jobs: z
    .array(
      z.object({
        id: z.string().min(1),
        displayName: z.string().min(1),
        cron: cronString,
      }),
    )
    .optional(),
  events: z.array(z.string()).optional(),
  tools: z
    .array(
      z.object({
        name: z.string().min(1),
        displayName: z.string().min(1),
        description: z.string(),
        parametersSchema: z.record(z.unknown()),
      }),
    )
    .optional(),
});

export type ValidatedManifest = z.infer<typeof manifestSchema>;

export function validateManifest(data: unknown): z.SafeParseReturnType<unknown, ValidatedManifest> {
  return manifestSchema.safeParse(data);
}

/** Per-method RPC timeouts in milliseconds */
export const RPC_TIMEOUTS: Record<string, number> = {
  initialize: 30_000,
  health: 5_000,
  shutdown: 10_000,
  runJob: 300_000,
  onEvent: 30_000,
  handleRequest: 30_000,
  executeTool: 60_000,
  configChanged: 10_000,
};

/** All known capabilities for validation/documentation */
export const KNOWN_CAPABILITIES = [
  "issues.create",
  "issues.read",
  "issues.update",
  "issue.comments.create",
  "agents.read",
  "agents.wakeup",
  "events.subscribe",
  "events.emit",
  "jobs.schedule",
  "routes.handle",
  "agent.tools.register",
  "plugin.state.read",
  "plugin.state.write",
] as const;

/** Capability required for each SDK method */
export const METHOD_CAPABILITIES: Record<string, string | null> = {
  "issues.create": "issues.create",
  "issues.read": "issues.read",
  "issues.update": "issues.update",
  "issues.list": "issues.read",
  "issues.addComment": "issue.comments.create",
  "agents.list": "agents.read",
  "agents.read": "agents.read",
  "agents.wakeup": "agents.wakeup",
  "events.emit": "events.emit",
  "state.get": "plugin.state.read",
  "state.set": "plugin.state.write",
  "state.delete": "plugin.state.write",
  "config.get": null,        // always allowed
  "logger.debug": null,
  "logger.info": null,
  "logger.warn": null,
  "logger.error": null,
};
```

- [ ] **Step 4: Install cron-parser dependency**

Run: `cd /home/clawdbot/paperclip/server && pnpm add cron-parser`

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /home/clawdbot/paperclip && pnpm vitest run server/src/__tests__/plugin-manifest.test.ts`

Expected: All 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/plugins/types.ts server/src/__tests__/plugin-manifest.test.ts server/package.json pnpm-lock.yaml
git commit -m "feat(plugins): manifest validation with Zod schema and cron checking"
```

---

### Task 6: Plugin Loader

**Files:**
- Create: `server/src/plugins/loader.ts`
- Create: `server/src/__tests__/plugin-loader.test.ts`

- [ ] **Step 1: Write failing tests for plugin loader**

```typescript
// server/src/__tests__/plugin-loader.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { scanPluginPackages, syncPluginToDb } from "../plugins/loader.js";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

describe("scanPluginPackages", () => {
  it("finds packages with paperclipPlugin key", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-test-"));
    const pluginDir = path.join(tmpDir, "node_modules", "@test", "plugin-foo");
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, "package.json"),
      JSON.stringify({
        name: "@test/plugin-foo",
        version: "1.0.0",
        paperclipPlugin: {
          manifest: "./dist/manifest.js",
          worker: "./dist/worker.js",
        },
      }),
    );
    // Create a minimal manifest module
    const distDir = path.join(pluginDir, "dist");
    fs.mkdirSync(distDir);
    fs.writeFileSync(
      path.join(distDir, "manifest.js"),
      `export const manifest = ${JSON.stringify({
        id: "@test/plugin-foo",
        apiVersion: 1,
        version: "1.0.0",
        displayName: "Foo",
        description: "test",
        categories: ["automation"],
        capabilities: ["issues.read"],
        entrypoints: { worker: "./worker.js" },
      })};`,
    );
    fs.writeFileSync(path.join(distDir, "worker.js"), "");

    const results = await scanPluginPackages(tmpDir);
    expect(results).toHaveLength(1);
    expect(results[0].manifest.id).toBe("@test/plugin-foo");
    expect(results[0].installPath).toBe(pluginDir);

    fs.rmSync(tmpDir, { recursive: true });
  });

  it("skips packages without paperclipPlugin key", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-test-"));
    const pkgDir = path.join(tmpDir, "node_modules", "express");
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, "package.json"),
      JSON.stringify({ name: "express", version: "4.0.0" }),
    );

    const results = await scanPluginPackages(tmpDir);
    expect(results).toHaveLength(0);

    fs.rmSync(tmpDir, { recursive: true });
  });

  it("rejects plugin with invalid manifest", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-test-"));
    const pluginDir = path.join(tmpDir, "node_modules", "@test", "plugin-bad");
    const distDir = path.join(pluginDir, "dist");
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, "package.json"),
      JSON.stringify({
        name: "@test/plugin-bad",
        paperclipPlugin: { manifest: "./dist/manifest.js", worker: "./dist/worker.js" },
      }),
    );
    // Missing required fields
    fs.writeFileSync(
      path.join(distDir, "manifest.js"),
      `export const manifest = { id: "@test/bad" };`,
    );

    const results = await scanPluginPackages(tmpDir);
    expect(results).toHaveLength(0); // Invalid manifest is skipped with warning

    fs.rmSync(tmpDir, { recursive: true });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/clawdbot/paperclip && pnpm vitest run server/src/__tests__/plugin-loader.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement plugin loader**

```typescript
// server/src/plugins/loader.ts
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  plugins,
  pluginConfig,
  pluginJobs,
  pluginTools,
} from "@paperclipai/db";
import { validateManifest, type ValidatedManifest } from "./types.js";

export interface ScannedPlugin {
  manifest: ValidatedManifest;
  installPath: string;
  workerEntrypoint: string;
}

/**
 * Scan the plugins directory for npm packages that have a `paperclipPlugin` key.
 * Validates each manifest and returns the valid ones.
 */
export async function scanPluginPackages(pluginsDir: string): Promise<ScannedPlugin[]> {
  const nodeModules = path.join(pluginsDir, "node_modules");
  if (!fs.existsSync(nodeModules)) return [];

  const results: ScannedPlugin[] = [];

  // Walk node_modules, including scoped packages (@scope/name)
  const entries = fs.readdirSync(nodeModules, { withFileTypes: true });
  const packageDirs: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".")) continue;

    if (entry.name.startsWith("@")) {
      // Scoped package — look inside
      const scopeDir = path.join(nodeModules, entry.name);
      const scopeEntries = fs.readdirSync(scopeDir, { withFileTypes: true });
      for (const sub of scopeEntries) {
        if (sub.isDirectory()) {
          packageDirs.push(path.join(scopeDir, sub.name));
        }
      }
    } else {
      packageDirs.push(path.join(nodeModules, entry.name));
    }
  }

  for (const pkgDir of packageDirs) {
    const pkgJsonPath = path.join(pkgDir, "package.json");
    if (!fs.existsSync(pkgJsonPath)) continue;

    let pkgJson: Record<string, unknown>;
    try {
      pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
    } catch {
      continue;
    }

    const pluginEntry = pkgJson.paperclipPlugin as Record<string, string> | undefined;
    if (!pluginEntry?.manifest) continue;

    // Load manifest module
    const manifestPath = path.resolve(pkgDir, pluginEntry.manifest);
    if (!fs.existsSync(manifestPath)) {
      console.warn(`[plugins] manifest file not found: ${manifestPath}`);
      continue;
    }

    try {
      const mod = await import(pathToFileURL(manifestPath).href);
      const rawManifest = mod.manifest ?? mod.default;

      const validation = validateManifest(rawManifest);
      if (!validation.success) {
        console.warn(
          `[plugins] invalid manifest for ${pkgJson.name}: ${validation.error.message}`,
        );
        continue;
      }

      const workerPath = pluginEntry.worker
        ? path.resolve(pkgDir, pluginEntry.worker)
        : path.resolve(pkgDir, validation.data.entrypoints.worker);

      results.push({
        manifest: validation.data,
        installPath: pkgDir,
        workerEntrypoint: workerPath,
      });
    } catch (err) {
      console.warn(`[plugins] failed to load manifest from ${manifestPath}:`, err);
    }
  }

  return results;
}

/**
 * Upsert a plugin record and sync its jobs/tools into the DB.
 */
export async function syncPluginToDb(
  db: Db,
  scanned: ScannedPlugin,
): Promise<string> {
  const { manifest, installPath } = scanned;

  // Upsert plugin record
  const existing = await db
    .select()
    .from(plugins)
    .where(eq(plugins.pluginKey, manifest.id))
    .limit(1);

  let pluginId: string;

  if (existing.length > 0) {
    pluginId = existing[0].id;
    await db
      .update(plugins)
      .set({
        displayName: manifest.displayName,
        version: manifest.version,
        capabilities: manifest.capabilities,
        manifest: manifest as unknown as Record<string, unknown>,
        installPath,
        status: "installed",
        updatedAt: new Date(),
      })
      .where(eq(plugins.id, pluginId));
  } else {
    const [row] = await db
      .insert(plugins)
      .values({
        pluginKey: manifest.id,
        displayName: manifest.displayName,
        version: manifest.version,
        capabilities: manifest.capabilities,
        manifest: manifest as unknown as Record<string, unknown>,
        installPath,
        status: "installed",
      })
      .returning({ id: plugins.id });
    pluginId = row.id;

    // Create initial config
    await db.insert(pluginConfig).values({
      pluginId,
      configJson: {},
    });
  }

  // Sync jobs: insert new, delete stale (preserve enabled state)
  if (manifest.jobs?.length) {
    const existingJobs = await db
      .select()
      .from(pluginJobs)
      .where(eq(pluginJobs.pluginId, pluginId));

    const existingByKey = new Map(existingJobs.map((j) => [j.jobKey, j]));
    const declaredKeys = new Set(manifest.jobs.map((j) => j.id));

    // Insert or update declared jobs
    for (const job of manifest.jobs) {
      const existing = existingByKey.get(job.id);
      if (existing) {
        await db
          .update(pluginJobs)
          .set({
            displayName: job.displayName,
            cron: job.cron,
          })
          .where(eq(pluginJobs.id, existing.id));
      } else {
        await db.insert(pluginJobs).values({
          pluginId,
          jobKey: job.id,
          displayName: job.displayName,
          cron: job.cron,
        });
      }
    }

    // Delete stale jobs
    for (const [key, job] of existingByKey) {
      if (!declaredKeys.has(key)) {
        await db.delete(pluginJobs).where(eq(pluginJobs.id, job.id));
      }
    }
  }

  // Sync tools
  if (manifest.tools?.length) {
    const existingTools = await db
      .select()
      .from(pluginTools)
      .where(eq(pluginTools.pluginId, pluginId));

    const existingByName = new Map(existingTools.map((t) => [t.toolName, t]));
    const declaredNames = new Set(manifest.tools.map((t) => `${manifest.id}:${t.name}`));

    for (const tool of manifest.tools) {
      const fullName = `${manifest.id}:${tool.name}`;
      const existing = existingByName.get(fullName);
      if (existing) {
        await db
          .update(pluginTools)
          .set({
            displayName: tool.displayName,
            description: tool.description,
            parametersSchema: tool.parametersSchema,
          })
          .where(eq(pluginTools.id, existing.id));
      } else {
        await db.insert(pluginTools).values({
          pluginId,
          toolName: fullName,
          displayName: tool.displayName,
          description: tool.description,
          parametersSchema: tool.parametersSchema,
        });
      }
    }

    // Delete stale tools
    for (const [name, tool] of existingByName) {
      if (!declaredNames.has(name)) {
        await db.delete(pluginTools).where(eq(pluginTools.id, tool.id));
      }
    }
  }

  return pluginId;
}
```

- [ ] **Step 4: Run tests**

Run: `cd /home/clawdbot/paperclip && pnpm vitest run server/src/__tests__/plugin-loader.test.ts`

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/plugins/loader.ts server/src/__tests__/plugin-loader.test.ts
git commit -m "feat(plugins): plugin loader — scan, validate, sync to DB"
```

---

### Task 7: Process Manager

**Files:**
- Create: `server/src/plugins/process-manager.ts`
- Create: `server/src/__tests__/plugin-process-manager.test.ts`

- [ ] **Step 1: Write failing tests for process manager**

```typescript
// server/src/__tests__/plugin-process-manager.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ProcessManager, type PluginWorkerEntry } from "../plugins/process-manager.js";

// We'll test with a simple echo worker script
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

function createTestWorker(tmpDir: string, behavior: "healthy" | "crash" | "slow-init"): string {
  const workerPath = path.join(tmpDir, `worker-${behavior}.mjs`);
  const code = {
    healthy: `
import { createInterface } from "readline";
const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  const msg = JSON.parse(line);
  if (msg.method === "initialize") {
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { ok: true } }) + "\\n");
  } else if (msg.method === "health") {
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { status: "ok" } }) + "\\n");
  } else if (msg.method === "shutdown") {
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { ok: true } }) + "\\n");
    setTimeout(() => process.exit(0), 50);
  } else {
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { ok: true } }) + "\\n");
  }
});
`,
    crash: `process.exit(1);`,
    "slow-init": `
import { createInterface } from "readline";
const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  const msg = JSON.parse(line);
  // Never respond to initialize — causes timeout
});
`,
  };
  fs.writeFileSync(workerPath, code[behavior]);
  return workerPath;
}

describe("ProcessManager", () => {
  let tmpDir: string;
  let pm: ProcessManager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-test-"));
    pm = new ProcessManager();
  });

  afterEach(async () => {
    await pm.shutdownAll();
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("spawns and initializes a healthy worker", async () => {
    const workerPath = createTestWorker(tmpDir, "healthy");
    await pm.spawn("test-plugin-1", workerPath, {
      pluginId: "test-plugin-1",
      manifest: {} as any,
      config: {},
    });

    const entry = pm.get("test-plugin-1");
    expect(entry).toBeDefined();
    expect(entry!.status).toBe("ready");
  });

  it("marks plugin as error when init times out", async () => {
    const workerPath = createTestWorker(tmpDir, "slow-init");
    await expect(
      pm.spawn("test-plugin-2", workerPath, {
        pluginId: "test-plugin-2",
        manifest: {} as any,
        config: {},
      }, { initTimeoutMs: 500 }),
    ).rejects.toThrow();
  });

  it("sends shutdown to worker", async () => {
    const workerPath = createTestWorker(tmpDir, "healthy");
    await pm.spawn("test-plugin-3", workerPath, {
      pluginId: "test-plugin-3",
      manifest: {} as any,
      config: {},
    });

    await pm.shutdown("test-plugin-3");
    const entry = pm.get("test-plugin-3");
    expect(entry).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/clawdbot/paperclip && pnpm vitest run server/src/__tests__/plugin-process-manager.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement process manager**

```typescript
// server/src/plugins/process-manager.ts
import { spawn, type ChildProcess } from "node:child_process";
import { RpcChannel } from "@paperclipai/plugin-sdk";
import { RPC_TIMEOUTS } from "./types.js";

export interface PluginWorkerEntry {
  pluginId: string;
  process: ChildProcess;
  rpc: RpcChannel;
  status: "starting" | "ready" | "error" | "stopping";
  restartCount: number;
  lastRestartAt?: Date;
}

interface SpawnOptions {
  initTimeoutMs?: number;
}

interface InitializeParams {
  pluginId: string;
  manifest: Record<string, unknown>;
  config: Record<string, unknown>;
}

export class ProcessManager {
  private workers = new Map<string, PluginWorkerEntry>();
  private requestHandler?: (
    pluginId: string,
    method: string,
    params: unknown,
    id: number | string,
  ) => Promise<unknown>;

  /**
   * Set handler for worker->host SDK calls.
   * Called by the SDK proxy.
   */
  setRequestHandler(
    handler: (pluginId: string, method: string, params: unknown, id: number | string) => Promise<unknown>,
  ) {
    this.requestHandler = handler;
  }

  /**
   * Spawn a plugin worker process and send initialize.
   */
  async spawn(
    pluginId: string,
    workerEntrypoint: string,
    initParams: InitializeParams,
    opts?: SpawnOptions,
  ): Promise<void> {
    const child = spawn("node", [workerEntrypoint], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    // Capture stderr for logging
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk: string) => {
      console.log(`[plugin:${pluginId}:stderr] ${chunk.trimEnd()}`);
    });

    const rpc = new RpcChannel(child.stdout!, child.stdin!);

    // Route worker->host calls through the SDK proxy handler
    rpc.setRequestHandler(async (method, params, id) => {
      if (!this.requestHandler) {
        throw new Error("no SDK proxy handler registered");
      }
      return this.requestHandler(pluginId, method, params, id);
    });

    const entry: PluginWorkerEntry = {
      pluginId,
      process: child,
      rpc,
      status: "starting",
      restartCount: 0,
    };
    this.workers.set(pluginId, entry);

    // Handle unexpected exit
    child.on("exit", (code, signal) => {
      const current = this.workers.get(pluginId);
      if (current && current.status !== "stopping") {
        console.warn(`[plugins] worker ${pluginId} exited unexpectedly (code=${code}, signal=${signal})`);
        current.status = "error";
        rpc.destroy();
      }
    });

    // Send initialize
    const timeout = opts?.initTimeoutMs ?? RPC_TIMEOUTS.initialize;
    try {
      await rpc.call("initialize", initParams, timeout);
      entry.status = "ready";
    } catch (err) {
      entry.status = "error";
      rpc.destroy();
      child.kill("SIGKILL");
      this.workers.delete(pluginId);
      throw new Error(
        `Plugin ${pluginId} failed to initialize: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Get a worker entry by plugin ID.
   */
  get(pluginId: string): PluginWorkerEntry | undefined {
    return this.workers.get(pluginId);
  }

  /**
   * Send an RPC call to a specific worker.
   */
  async call(pluginId: string, method: string, params?: unknown): Promise<unknown> {
    const entry = this.workers.get(pluginId);
    if (!entry || entry.status !== "ready") {
      throw new Error(`Plugin ${pluginId} is not ready (status: ${entry?.status ?? "not found"})`);
    }
    const timeout = RPC_TIMEOUTS[method] ?? 30_000;
    return entry.rpc.call(method, params, timeout);
  }

  /**
   * Gracefully shut down a single worker.
   */
  async shutdown(pluginId: string): Promise<void> {
    const entry = this.workers.get(pluginId);
    if (!entry) return;

    entry.status = "stopping";

    try {
      await entry.rpc.call("shutdown", {}, RPC_TIMEOUTS.shutdown);
    } catch {
      // Timeout or error — force kill
    }

    entry.rpc.destroy();

    // Give the process time to exit, then force
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        entry.process.kill("SIGKILL");
        resolve();
      }, 5000);
      entry.process.on("exit", () => {
        clearTimeout(timer);
        resolve();
      });
      if (entry.process.exitCode !== null) {
        clearTimeout(timer);
        resolve();
      }
    });

    this.workers.delete(pluginId);
  }

  /**
   * Shut down all workers.
   */
  async shutdownAll(): Promise<void> {
    const ids = Array.from(this.workers.keys());
    await Promise.allSettled(ids.map((id) => this.shutdown(id)));
  }

  /**
   * List all worker plugin IDs.
   */
  list(): string[] {
    return Array.from(this.workers.keys());
  }

  /**
   * Check if a worker is ready.
   */
  isReady(pluginId: string): boolean {
    return this.workers.get(pluginId)?.status === "ready";
  }
}
```

- [ ] **Step 4: Run tests**

Run: `cd /home/clawdbot/paperclip && pnpm vitest run server/src/__tests__/plugin-process-manager.test.ts`

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/plugins/process-manager.ts server/src/__tests__/plugin-process-manager.test.ts
git commit -m "feat(plugins): process manager — spawn, initialize, shutdown workers"
```

---

## Chunk 3: SDK Proxy + Event Bus

### Task 8: SDK Proxy (Capability Enforcement)

**Files:**
- Create: `server/src/plugins/sdk-proxy.ts`
- Create: `server/src/__tests__/plugin-sdk-proxy.test.ts`

- [ ] **Step 1: Write failing tests for capability enforcement**

```typescript
// server/src/__tests__/plugin-sdk-proxy.test.ts
import { describe, it, expect } from "vitest";
import { checkCapability } from "../plugins/sdk-proxy.js";

describe("checkCapability", () => {
  const capabilities = ["issues.read", "issues.create", "agents.read"];

  it("allows method when capability is present", () => {
    expect(checkCapability("issues.read", capabilities)).toBe(true);
  });

  it("denies method when capability is missing", () => {
    expect(checkCapability("agents.wakeup", capabilities)).toBe(false);
  });

  it("always allows config.get", () => {
    expect(checkCapability("config.get", [])).toBe(true);
  });

  it("always allows logger methods", () => {
    expect(checkCapability("logger.info", [])).toBe(true);
    expect(checkCapability("logger.error", [])).toBe(true);
  });

  it("denies unknown methods", () => {
    expect(checkCapability("unknown.method", capabilities)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/clawdbot/paperclip && pnpm vitest run server/src/__tests__/plugin-sdk-proxy.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement SDK proxy**

```typescript
// server/src/plugins/sdk-proxy.ts
import type { Db } from "@paperclipai/db";
import { eq, and } from "drizzle-orm";
import {
  plugins,
  pluginConfig,
  pluginState,
} from "@paperclipai/db";
import { METHOD_CAPABILITIES } from "./types.js";
import type { ProcessManager } from "./process-manager.js";

/**
 * Check if a method is allowed by the plugin's capabilities.
 */
export function checkCapability(method: string, capabilities: string[]): boolean {
  const required = METHOD_CAPABILITIES[method];
  if (required === null || required === undefined) {
    // null = always allowed (config.get, logger.*), undefined = unknown method
    return required === null;
  }
  return capabilities.includes(required);
}

/**
 * Create an SDK proxy that handles worker->host RPC calls.
 * Returns a request handler function to pass to ProcessManager.setRequestHandler().
 */
export function createSdkProxy(db: Db) {
  // Import services lazily to avoid circular deps (ESM dynamic import)
  let servicesPromise: Promise<{
    issues: ReturnType<any>;
    agents: ReturnType<any>;
    heartbeat: ReturnType<any>;
  }> | null = null;

  const getServices = () => {
    if (!servicesPromise) {
      servicesPromise = Promise.all([
        import("../services/issues.js"),
        import("../services/agents.js"),
        import("../services/heartbeat.js"),
      ]).then(([issuesMod, agentsMod, heartbeatMod]) => ({
        issues: issuesMod.issueService(db),
        agents: agentsMod.agentService(db),
        heartbeat: heartbeatMod.heartbeatService(db),
      }));
    }
    return servicesPromise;
  };

  return async function handleSdkCall(
    pluginId: string,
    method: string,
    params: unknown,
    _id: number | string,
  ): Promise<unknown> {
    // Get plugin capabilities
    const [plugin] = await db
      .select({ capabilities: plugins.capabilities })
      .from(plugins)
      .where(eq(plugins.id, pluginId))
      .limit(1);

    if (!plugin) throw new Error(`Plugin ${pluginId} not found`);

    // Check capability
    if (!checkCapability(method, plugin.capabilities)) {
      throw Object.assign(
        new Error(`capability '${METHOD_CAPABILITIES[method]}' not granted`),
        { code: -32600 },
      );
    }

    const p = (params ?? {}) as Record<string, unknown>;

    // Logger methods — just log and return
    if (method.startsWith("logger.")) {
      const level = method.split(".")[1] as string;
      console.log(`[plugin:${pluginId}:${level}] ${p.message}`, p.data ?? {});
      return { ok: true };
    }

    // Config.get — return plugin config
    if (method === "config.get") {
      const [cfg] = await db
        .select({ configJson: pluginConfig.configJson })
        .from(pluginConfig)
        .where(eq(pluginConfig.pluginId, pluginId))
        .limit(1);
      return cfg?.configJson ?? {};
    }

    // State methods
    if (method === "state.get") {
      const rows = await db
        .select({ value: pluginState.value })
        .from(pluginState)
        .where(
          and(
            eq(pluginState.pluginId, pluginId),
            eq(pluginState.scope, p.scope as string),
            eq(pluginState.key, p.key as string),
          ),
        )
        .limit(1);
      return rows[0]?.value ?? null;
    }

    if (method === "state.set") {
      const scope = p.scope as string;
      const key = p.key as string;
      const value = p.value;
      await db.insert(pluginState).values({
        pluginId,
        scope,
        key,
        value: value as any,
      }).onConflictDoUpdate({
        target: [pluginState.pluginId, pluginState.scope, pluginState.key],
        set: { value: value as any, updatedAt: new Date() },
      });
      return { ok: true };
    }

    if (method === "state.delete") {
      await db.delete(pluginState).where(
        and(
          eq(pluginState.pluginId, pluginId),
          eq(pluginState.scope, p.scope as string),
          eq(pluginState.key, p.key as string),
        ),
      );
      return { ok: true };
    }

    // Service methods — route to real Paperclip services
    const services = await getServices();

    switch (method) {
      case "issues.create":
        return services.issues.create(p);
      case "issues.read":
        return services.issues.getById(p.issueId as string);
      case "issues.update":
        return services.issues.update(p.issueId as string, p);
      case "issues.list":
        return services.issues.list(p.companyId as string, p);
      case "issues.addComment":
        return services.issues.addComment(p.issueId as string, {
          body: p.body as string,
          actorType: "plugin",
          actorId: pluginId,
        });
      case "agents.list":
        return services.agents.list(p.companyId as string);
      case "agents.read":
        return services.agents.getById(p.agentId as string);
      case "agents.wakeup":
        // heartbeatService exposes enqueueWakeup (aliased as wakeup)
        return services.heartbeat.wakeup(p.agentId as string, {
          reason: (p.reason as string) ?? "plugin",
          source: "plugin",
          triggerDetail: `Plugin ${pluginId} triggered wakeup`,
          contextSnapshot: p.payload as Record<string, unknown>,
        });
      case "events.emit":
        // Plugin events use plugin.* namespace — wire through event bus
        const { getEventBus } = await import("./event-bus.js");
        const eventName = `plugin.${pluginId}.${p.name}`;
        await getEventBus().emit(eventName, p.payload as Record<string, unknown>);
        return { ok: true };
      default:
        throw new Error(`unknown SDK method: ${method}`);
    }
  };
}
```

- [ ] **Step 4: Run tests**

Run: `cd /home/clawdbot/paperclip && pnpm vitest run server/src/__tests__/plugin-sdk-proxy.test.ts`

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/plugins/sdk-proxy.ts server/src/__tests__/plugin-sdk-proxy.test.ts
git commit -m "feat(plugins): SDK proxy with capability enforcement"
```

---

### Task 9: Event Bus

**Files:**
- Create: `server/src/plugins/event-bus.ts`
- Create: `server/src/__tests__/plugin-event-bus.test.ts`

- [ ] **Step 1: Write failing tests for event bus**

```typescript
// server/src/__tests__/plugin-event-bus.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventBus } from "../plugins/event-bus.js";

describe("EventBus", () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it("builds subscription map from manifests", () => {
    bus.registerSubscriptions("plugin-a", ["agent.run.failed", "issue.created"]);
    bus.registerSubscriptions("plugin-b", ["agent.run.failed"]);

    const subs = bus.getSubscribers("agent.run.failed");
    expect(subs).toEqual(new Set(["plugin-a", "plugin-b"]));

    const subs2 = bus.getSubscribers("issue.created");
    expect(subs2).toEqual(new Set(["plugin-a"]));
  });

  it("returns empty set for events with no subscribers", () => {
    const subs = bus.getSubscribers("approval.created");
    expect(subs.size).toBe(0);
  });

  it("emits event to subscribed plugins via callback", async () => {
    const delivered: Array<{ pluginId: string; name: string }> = [];
    bus.setDeliveryCallback(async (pluginId, name, payload) => {
      delivered.push({ pluginId, name });
    });

    bus.registerSubscriptions("plugin-a", ["agent.run.failed"]);
    bus.registerSubscriptions("plugin-b", ["agent.run.failed"]);

    await bus.emit("agent.run.failed", { agentId: "a1", runId: "r1", error: "boom" });

    expect(delivered).toHaveLength(2);
    expect(delivered.map((d) => d.pluginId).sort()).toEqual(["plugin-a", "plugin-b"]);
  });

  it("does not emit to unsubscribed plugins", async () => {
    const delivered: string[] = [];
    bus.setDeliveryCallback(async (pluginId) => {
      delivered.push(pluginId);
    });

    bus.registerSubscriptions("plugin-a", ["agent.run.failed"]);

    await bus.emit("issue.created", { issueId: "i1" });

    expect(delivered).toHaveLength(0);
  });

  it("handles delivery failure gracefully", async () => {
    bus.setDeliveryCallback(async () => {
      throw new Error("worker down");
    });

    bus.registerSubscriptions("plugin-a", ["agent.run.failed"]);

    // Should not throw
    await bus.emit("agent.run.failed", { agentId: "a1" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/clawdbot/paperclip && pnpm vitest run server/src/__tests__/plugin-event-bus.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement event bus**

```typescript
// server/src/plugins/event-bus.ts

type DeliveryCallback = (
  pluginId: string,
  eventName: string,
  payload: Record<string, unknown>,
  timestamp: string,
) => Promise<void>;

/**
 * Plugin event bus — routes lifecycle events to subscribed plugin workers.
 * Fire-and-forget delivery: if a worker is down, the event is logged but not retried.
 * Events are delivered serially per plugin to prevent race conditions.
 */
export class EventBus {
  private subscriptions = new Map<string, Set<string>>();
  private deliveryCallback?: DeliveryCallback;
  // Per-plugin delivery queue for serial processing
  private pluginQueues = new Map<string, Promise<void>>();

  /**
   * Register a plugin's event subscriptions from its manifest.
   */
  registerSubscriptions(pluginId: string, events: string[]) {
    for (const event of events) {
      if (!this.subscriptions.has(event)) {
        this.subscriptions.set(event, new Set());
      }
      this.subscriptions.get(event)!.add(pluginId);
    }
  }

  /**
   * Remove all subscriptions for a plugin.
   */
  unregisterPlugin(pluginId: string) {
    for (const [, subscribers] of this.subscriptions) {
      subscribers.delete(pluginId);
    }
  }

  /**
   * Set the callback used to deliver events to plugin workers.
   * Called by the plugin system init to wire to ProcessManager.
   */
  setDeliveryCallback(cb: DeliveryCallback) {
    this.deliveryCallback = cb;
  }

  /**
   * Get the set of plugin IDs subscribed to an event.
   */
  getSubscribers(eventName: string): Set<string> {
    return this.subscriptions.get(eventName) ?? new Set();
  }

  /**
   * Emit an event to all subscribed plugins.
   * Delivery is fire-and-forget — errors are logged, not propagated.
   * Events are delivered serially per plugin.
   */
  async emit(eventName: string, payload: Record<string, unknown>): Promise<void> {
    const subscribers = this.getSubscribers(eventName);
    if (subscribers.size === 0 || !this.deliveryCallback) return;

    const timestamp = new Date().toISOString();

    for (const pluginId of subscribers) {
      // Chain onto the plugin's queue for serial delivery
      const prev = this.pluginQueues.get(pluginId) ?? Promise.resolve();
      const next = prev.then(async () => {
        try {
          await this.deliveryCallback!(pluginId, eventName, payload, timestamp);
        } catch (err) {
          console.warn(
            `[plugins:event-bus] failed to deliver ${eventName} to ${pluginId}:`,
            err instanceof Error ? err.message : err,
          );
        }
      });
      this.pluginQueues.set(pluginId, next);
    }

    // Wait for all deliveries to complete (or fail)
    await Promise.all(
      Array.from(subscribers).map((id) => this.pluginQueues.get(id)),
    );
  }
}

/**
 * Singleton event bus instance — shared across the server.
 */
let globalEventBus: EventBus | null = null;

export function getEventBus(): EventBus {
  if (!globalEventBus) {
    globalEventBus = new EventBus();
  }
  return globalEventBus;
}

export function resetEventBus(): void {
  globalEventBus = null;
}
```

- [ ] **Step 4: Run tests**

Run: `cd /home/clawdbot/paperclip && pnpm vitest run server/src/__tests__/plugin-event-bus.test.ts`

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/plugins/event-bus.ts server/src/__tests__/plugin-event-bus.test.ts
git commit -m "feat(plugins): event bus — pub-sub with serial per-plugin delivery"
```

---

## Chunk 4: Job Scheduler + Plugin Routes

### Task 10: Job Scheduler

**Files:**
- Create: `server/src/plugins/job-scheduler.ts`
- Create: `server/src/__tests__/plugin-job-scheduler.test.ts`

- [ ] **Step 1: Write failing tests for job scheduler**

```typescript
// server/src/__tests__/plugin-job-scheduler.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateNextRunAt, shouldFireJob } from "../plugins/job-scheduler.js";

describe("calculateNextRunAt", () => {
  it("calculates next run time from now", () => {
    const now = new Date("2026-03-13T08:00:00Z");
    const next = calculateNextRunAt("0 9 * * *", now);
    expect(next.getUTCHours()).toBe(9);
    expect(next.getUTCMinutes()).toBe(0);
  });

  it("wraps to next day if time has passed", () => {
    const now = new Date("2026-03-13T10:00:00Z");
    const next = calculateNextRunAt("0 9 * * *", now);
    expect(next.getUTCDate()).toBe(14);
  });

  it("handles every-minute cron", () => {
    const now = new Date("2026-03-13T08:30:30Z");
    const next = calculateNextRunAt("* * * * *", now);
    expect(next.getTime()).toBeGreaterThan(now.getTime());
    expect(next.getTime() - now.getTime()).toBeLessThanOrEqual(60_000);
  });
});

describe("shouldFireJob", () => {
  it("fires when now >= nextRunAt", () => {
    const now = new Date("2026-03-13T09:00:01Z");
    const nextRunAt = new Date("2026-03-13T09:00:00Z");
    expect(shouldFireJob(now, nextRunAt, null)).toBe(true);
  });

  it("does not fire when now < nextRunAt", () => {
    const now = new Date("2026-03-13T08:59:59Z");
    const nextRunAt = new Date("2026-03-13T09:00:00Z");
    expect(shouldFireJob(now, nextRunAt, null)).toBe(false);
  });

  it("does not fire when previous run is still running", () => {
    const now = new Date("2026-03-13T09:00:01Z");
    const nextRunAt = new Date("2026-03-13T09:00:00Z");
    expect(shouldFireJob(now, nextRunAt, "running")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/clawdbot/paperclip && pnpm vitest run server/src/__tests__/plugin-job-scheduler.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement job scheduler**

```typescript
// server/src/plugins/job-scheduler.ts
import { parseExpression } from "cron-parser";
import { eq, and } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { pluginJobs, pluginJobRuns } from "@paperclipai/db";
import type { ProcessManager } from "./process-manager.js";

/**
 * Calculate the next run time for a cron expression from a given base time.
 */
export function calculateNextRunAt(cronExpr: string, fromDate: Date): Date {
  const interval = parseExpression(cronExpr, { currentDate: fromDate });
  return interval.next().toDate();
}

/**
 * Determine whether a job should fire.
 */
export function shouldFireJob(
  now: Date,
  nextRunAt: Date | null,
  lastRunStatus: string | null,
): boolean {
  if (!nextRunAt) return false;
  if (now < nextRunAt) return false;
  if (lastRunStatus === "running") return false;
  return true;
}

/**
 * Job Scheduler — ticks periodically and fires due plugin jobs.
 */
export class JobScheduler {
  constructor(
    private db: Db,
    private processManager: ProcessManager,
  ) {}

  /**
   * Initialize all job next_run_at times from the current time.
   * Called on server startup.
   */
  async initializeJobTimes(): Promise<void> {
    const jobs = await this.db
      .select()
      .from(pluginJobs)
      .where(eq(pluginJobs.enabled, true));

    const now = new Date();
    for (const job of jobs) {
      const nextRunAt = calculateNextRunAt(job.cron, now);
      await this.db
        .update(pluginJobs)
        .set({ nextRunAt })
        .where(eq(pluginJobs.id, job.id));
    }
  }

  /**
   * Tick — check all enabled jobs and fire any that are due.
   * Called every 15 seconds from the server's interval loop.
   */
  async tick(): Promise<{ fired: number }> {
    const now = new Date();
    const jobs = await this.db
      .select()
      .from(pluginJobs)
      .where(eq(pluginJobs.enabled, true));

    let fired = 0;

    for (const job of jobs) {
      // Check if the previous run is still running
      const lastRun = await this.db
        .select({ status: pluginJobRuns.status })
        .from(pluginJobRuns)
        .where(
          and(
            eq(pluginJobRuns.jobId, job.id),
            eq(pluginJobRuns.status, "running"),
          ),
        )
        .limit(1);

      const lastRunStatus = lastRun[0]?.status ?? null;

      if (!shouldFireJob(now, job.nextRunAt, lastRunStatus)) continue;

      // Don't fire if worker is not ready
      if (!this.processManager.isReady(job.pluginId)) {
        console.warn(`[plugins:job-scheduler] skipping job ${job.jobKey} — worker not ready`);
        continue;
      }

      // Create run record
      const [run] = await this.db
        .insert(pluginJobRuns)
        .values({
          jobId: job.id,
          pluginId: job.pluginId,
          status: "running",
        })
        .returning({ id: pluginJobRuns.id });

      // Fire the job asynchronously
      this.fireJob(job.pluginId, job.id, job.jobKey, run.id, job.cron).catch((err) => {
        console.error(`[plugins:job-scheduler] error firing job ${job.jobKey}:`, err);
      });

      fired++;
    }

    return { fired };
  }

  private async fireJob(
    pluginId: string,
    jobId: string,
    jobKey: string,
    runId: string,
    cron: string,
  ): Promise<void> {
    try {
      await this.processManager.call(pluginId, "runJob", {
        jobKey,
        triggerSource: "schedule",
        runId,
      });

      // Mark completed
      const now = new Date();
      await this.db
        .update(pluginJobRuns)
        .set({ status: "completed", completedAt: now })
        .where(eq(pluginJobRuns.id, runId));

      // Update job timing
      await this.db
        .update(pluginJobs)
        .set({
          lastRunAt: now,
          nextRunAt: calculateNextRunAt(cron, now),
        })
        .where(eq(pluginJobs.id, jobId));
    } catch (err) {
      // Mark failed
      await this.db
        .update(pluginJobRuns)
        .set({
          status: "failed",
          completedAt: new Date(),
          error: err instanceof Error ? err.message : String(err),
        })
        .where(eq(pluginJobRuns.id, runId));

      // Still update next_run_at so we don't retry immediately
      await this.db
        .update(pluginJobs)
        .set({
          nextRunAt: calculateNextRunAt(cron, new Date()),
        })
        .where(eq(pluginJobs.id, jobId));
    }
  }
}
```

- [ ] **Step 4: Run tests**

Run: `cd /home/clawdbot/paperclip && pnpm vitest run server/src/__tests__/plugin-job-scheduler.test.ts`

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/plugins/job-scheduler.ts server/src/__tests__/plugin-job-scheduler.test.ts
git commit -m "feat(plugins): job scheduler — cron parsing, tick loop, fire jobs"
```

---

### Task 11: Plugin HTTP Routes

**Files:**
- Create: `server/src/plugins/routes.ts`

- [ ] **Step 1: Implement plugin routes**

```typescript
// server/src/plugins/routes.ts
import { Router, type Request, type Response } from "express";
import type { Db } from "@paperclipai/db";
import { eq } from "drizzle-orm";
import { plugins } from "@paperclipai/db";
import type { ProcessManager } from "./process-manager.js";

/**
 * Create Express router for plugin HTTP routes.
 * Mounted at /api/plugins/:pluginId/*
 * Forwards requests to plugin workers via handleRequest RPC.
 * Uses the DB UUID pluginId (not the npm package name) in the URL path.
 */
export function pluginRoutes(db: Db, processManager: ProcessManager): Router {
  const router = Router();

  // Catch-all for /api/plugins/:pluginId/*
  router.all("/:pluginId/*", async (req: Request, res: Response) => {
    const pluginId = req.params.pluginId;
    // Reconstruct the sub-path after /api/plugins/:pluginId
    const subPath = "/" + (req.params[0] ?? "");

    if (!processManager.isReady(pluginId)) {
      res.status(503).json({ error: `Plugin ${pluginId} is not available` });
      return;
    }

    try {
      const result = await processManager.call(pluginId, "handleRequest", {
        method: req.method,
        path: subPath,
        headers: req.headers as Record<string, string>,
        query: req.query as Record<string, string>,
        body: req.body,
        params: {},
        auth: {
          userId: (req as any).actor?.userId,
          agentId: (req as any).actor?.agentId,
          actorType: (req as any).actor?.type ?? "system",
        },
      });

      const response = result as { status: number; headers?: Record<string, string>; body: unknown };
      if (response.headers) {
        for (const [key, value] of Object.entries(response.headers)) {
          res.setHeader(key, value);
        }
      }
      res.status(response.status ?? 200).json(response.body);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Internal plugin error",
      });
    }
  });

  return router;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/plugins/routes.ts
git commit -m "feat(plugins): HTTP route forwarding to plugin workers"
```

---

## Chunk 5: Integration — Init, Event Emission, CLI

### Task 12: Plugin System Init + Server Integration

**Files:**
- Create: `server/src/plugins/index.ts`
- Modify: `server/src/index.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Create plugin system init module**

```typescript
// server/src/plugins/index.ts
import path from "node:path";
import os from "node:os";
import type { Db } from "@paperclipai/db";
import { scanPluginPackages, syncPluginToDb } from "./loader.js";
import { ProcessManager } from "./process-manager.js";
import { createSdkProxy } from "./sdk-proxy.js";
import { EventBus, getEventBus } from "./event-bus.js";
import { JobScheduler } from "./job-scheduler.js";
import { pluginRoutes } from "./routes.js";
import type { Router } from "express";

export interface PluginSystem {
  processManager: ProcessManager;
  eventBus: EventBus;
  jobScheduler: JobScheduler;
  router: Router;
  shutdown: () => Promise<void>;
}

/**
 * Initialize the plugin system. Called from server startup.
 */
export async function initPluginSystem(db: Db): Promise<PluginSystem> {
  const pluginsDir = path.join(
    os.homedir(),
    ".paperclip",
    "instances",
    "default",
    "plugins",
  );

  const processManager = new ProcessManager();
  const eventBus = getEventBus();
  const jobScheduler = new JobScheduler(db, processManager);

  // Wire SDK proxy
  const sdkProxy = createSdkProxy(db);
  processManager.setRequestHandler(sdkProxy);

  // Wire event delivery to process manager
  eventBus.setDeliveryCallback(async (pluginId, eventName, payload, timestamp) => {
    await processManager.call(pluginId, "onEvent", {
      name: eventName,
      payload,
      timestamp,
    });
  });

  // Scan and load plugins
  const scannedPlugins = await scanPluginPackages(pluginsDir);
  console.log(`[plugins] found ${scannedPlugins.length} plugin(s)`);

  for (const scanned of scannedPlugins) {
    try {
      const pluginId = await syncPluginToDb(db, scanned);

      // Register event subscriptions
      if (scanned.manifest.events?.length) {
        eventBus.registerSubscriptions(pluginId, scanned.manifest.events);
      }

      // Spawn worker
      const configRow = await db.query.pluginConfig?.findFirst?.({
        where: (cfg: any, { eq }: any) => eq(cfg.pluginId, pluginId),
      });

      await processManager.spawn(pluginId, scanned.workerEntrypoint, {
        pluginId,
        manifest: scanned.manifest as unknown as Record<string, unknown>,
        config: (configRow as any)?.configJson ?? {},
      });

      console.log(`[plugins] loaded ${scanned.manifest.id} (${pluginId})`);
    } catch (err) {
      console.error(
        `[plugins] failed to load ${scanned.manifest.id}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Initialize job times
  await jobScheduler.initializeJobTimes();

  // Create Express router
  const router = pluginRoutes(db, processManager);

  return {
    processManager,
    eventBus,
    jobScheduler,
    router,
    shutdown: async () => {
      await processManager.shutdownAll();
    },
  };
}
```

- [ ] **Step 2: Add plugin init to server startup (`server/src/index.ts`)**

Add import at top of file:

```typescript
import { initPluginSystem } from "./plugins/index.js";
```

After the heartbeat scheduler setup (around line 539), add:

```typescript
  // Plugin system initialization
  let pluginSystem: Awaited<ReturnType<typeof initPluginSystem>> | null = null;
  try {
    pluginSystem = await initPluginSystem(db as any);

    // Job scheduler tick — every 15 seconds
    setInterval(() => {
      void pluginSystem!.jobScheduler.tick().catch((err) => {
        logger.error({ err }, "plugin job scheduler tick failed");
      });
    }, 15_000);

    logger.info("Plugin system initialized");
  } catch (err) {
    logger.error({ err }, "Plugin system failed to initialize — continuing without plugins");
  }
```

- [ ] **Step 3: Mount plugin routes in `server/src/app.ts`**

Add to the `createApp` function signature — add `pluginRouter` to opts:

```typescript
pluginRouter?: Router;
```

Then add after line 124 (after `accessRoutes`):

```typescript
  if (opts.pluginRouter) {
    api.use("/plugins", opts.pluginRouter);
  }
```

Pass the router from `index.ts` when creating the app:

```typescript
pluginRouter: pluginSystem?.router,
```

- [ ] **Step 4: Commit**

```bash
git add server/src/plugins/index.ts server/src/index.ts server/src/app.ts
git commit -m "feat(plugins): server startup integration — init, job tick, route mounting"
```

---

### Task 13: Event Emission Points

**Files:**
- Modify: `server/src/services/heartbeat.ts`
- Modify: `server/src/routes/issues.ts`
- Modify: `server/src/routes/approvals.ts`

- [ ] **Step 1: Add event emission to heartbeat service**

Find the heartbeat service file. Add import at top:

```typescript
import { getEventBus } from "../plugins/event-bus.js";
```

After a run starts (status transitions to "running"), add:

```typescript
getEventBus().emit("agent.run.started", {
  agentId: run.agentId,
  agentName: agent.name,
  runId: run.id,
  reason: run.reason,
  companyId: agent.companyId,
}).catch(() => {}); // fire-and-forget
```

After a run completes successfully, add:

```typescript
getEventBus().emit("agent.run.finished", {
  agentId: run.agentId,
  agentName: agent.name,
  runId: run.id,
  durationMs: Date.now() - run.startedAt.getTime(),
  companyId: agent.companyId,
}).catch(() => {});
```

After a run fails, add:

```typescript
getEventBus().emit("agent.run.failed", {
  agentId: run.agentId,
  agentName: agent.name,
  runId: run.id,
  error: run.error ?? "unknown error",
  companyId: agent.companyId,
}).catch(() => {});
```

- [ ] **Step 2: Add event emission to issue routes**

In `server/src/routes/issues.ts`, add import:

```typescript
import { getEventBus } from "../plugins/event-bus.js";
```

After issue creation endpoint (where `logActivity` is called), add:

```typescript
getEventBus().emit("issue.created", {
  issueId: created.id,
  companyId: created.companyId,
  title: created.title,
  assigneeAgentId: created.assigneeAgentId,
  assigneeUserId: created.assigneeUserId,
}).catch(() => {});
```

After issue update endpoint, add:

```typescript
getEventBus().emit("issue.updated", {
  issueId: updated.id,
  companyId: updated.companyId,
  changes: [],  // populate from diff if available
  actorType: req.actor.type,
  actorId: req.actor.userId ?? req.actor.agentId,
}).catch(() => {});
```

After comment creation, add:

```typescript
getEventBus().emit("issue.comment.created", {
  issueId: comment.issueId,
  companyId,
  commentId: comment.id,
  authorAgentId: req.actor.agentId,
  authorUserId: req.actor.userId,
}).catch(() => {});
```

- [ ] **Step 3: Add event emission to approval routes**

In `server/src/routes/approvals.ts`, add import:

```typescript
import { getEventBus } from "../plugins/event-bus.js";
```

After approval creation, add:

```typescript
getEventBus().emit("approval.created", {
  approvalId: created.id,
  companyId,
  issueIds: created.issueIds ?? [],
}).catch(() => {});
```

After approval decided (approve/reject), add:

```typescript
getEventBus().emit("approval.decided", {
  approvalId: approval.id,
  companyId,
  decision,
  decisionNote,
}).catch(() => {});
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/heartbeat.ts server/src/routes/issues.ts server/src/routes/approvals.ts
git commit -m "feat(plugins): add event bus emission points to heartbeat, issues, approvals"
```

---

### Task 14: CLI Plugin Commands

**Files:**
- Create: `cli/src/commands/plugin.ts`
- Modify: `cli/src/index.ts`

- [ ] **Step 1: Implement plugin CLI commands**

```typescript
// cli/src/commands/plugin.ts
import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

function getPluginsDir(): string {
  return path.join(os.homedir(), ".paperclip", "instances", "default", "plugins");
}

function ensurePluginsDir(): string {
  const dir = getPluginsDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    // Initialize package.json for the plugins workspace
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "paperclip-plugins", private: true, dependencies: {} }, null, 2),
    );
  }
  return dir;
}

export function registerPluginCommands(program: Command) {
  const plugin = program.command("plugin").description("Manage plugins");

  plugin
    .command("list")
    .description("List installed plugins")
    .action(async () => {
      // Query DB for installed plugins
      const { createDb } = await import("@paperclipai/db");
      const { loadConfig } = await import("../config.js");
      const config = await loadConfig();
      const db = createDb(config.databaseUrl);
      const { plugins } = await import("@paperclipai/db");
      const rows = await db.select().from(plugins);

      if (rows.length === 0) {
        console.log("No plugins installed.");
        return;
      }

      console.log("\nInstalled plugins:\n");
      for (const row of rows) {
        const statusIcon = row.status === "ready" ? "✓" : row.status === "error" ? "✗" : "○";
        console.log(`  ${statusIcon} ${row.pluginKey} v${row.version} [${row.status}]`);
        if (row.lastError) {
          console.log(`    Error: ${row.lastError}`);
        }
      }
      console.log();
    });

  plugin
    .command("install <source>")
    .description("Install a plugin from a local path or npm package")
    .action(async (source: string) => {
      const pluginsDir = ensurePluginsDir();

      if (fs.existsSync(source)) {
        // Local path — create symlink
        const absSource = path.resolve(source);
        const pkgJson = JSON.parse(fs.readFileSync(path.join(absSource, "package.json"), "utf-8"));
        const name = pkgJson.name as string;

        const targetDir = path.join(pluginsDir, "node_modules", ...name.split("/"));
        fs.mkdirSync(path.dirname(targetDir), { recursive: true });

        if (fs.existsSync(targetDir)) {
          fs.rmSync(targetDir, { recursive: true });
        }
        fs.symlinkSync(absSource, targetDir, "dir");
        console.log(`Linked ${name} -> ${absSource}`);
      } else {
        // npm package
        console.log(`Installing ${source}...`);
        execSync(`npm install ${source}`, { cwd: pluginsDir, stdio: "inherit" });
      }

      console.log("\nPlugin installed. Restart the server to activate.");
    });

  plugin
    .command("uninstall <pluginKey>")
    .description("Uninstall a plugin (soft-delete with 30-day data retention)")
    .action(async (pluginKey: string) => {
      const { createDb } = await import("@paperclipai/db");
      const { loadConfig } = await import("../config.js");
      const config = await loadConfig();
      const db = createDb(config.databaseUrl);
      const { plugins } = await import("@paperclipai/db");
      const { eq } = await import("drizzle-orm");

      await db
        .update(plugins)
        .set({ status: "uninstalled", updatedAt: new Date() })
        .where(eq(plugins.pluginKey, pluginKey));

      console.log(`Plugin ${pluginKey} marked as uninstalled.`);
      console.log("Data retained for 30 days. Use 'plugin purge' to delete immediately.");
      console.log("Restart the server to stop the worker.");
    });

  plugin
    .command("upgrade <pluginKey>")
    .description("Upgrade a plugin (re-read manifest, sync DB)")
    .action(async (pluginKey: string) => {
      console.log(`Upgrading ${pluginKey}...`);
      // Re-scan will happen on next server restart
      console.log("Plugin upgraded. Restart the server to activate the new version.");
    });

  plugin
    .command("config <pluginKey> [json]")
    .description("View or update plugin config")
    .action(async (pluginKey: string, json?: string) => {
      const { createDb } = await import("@paperclipai/db");
      const { loadConfig } = await import("../config.js");
      const config = await loadConfig();
      const db = createDb(config.databaseUrl);
      const { plugins, pluginConfig } = await import("@paperclipai/db");
      const { eq } = await import("drizzle-orm");

      const [p] = await db.select().from(plugins).where(eq(plugins.pluginKey, pluginKey)).limit(1);
      if (!p) {
        console.error(`Plugin ${pluginKey} not found.`);
        process.exit(1);
      }

      if (!json) {
        // Read config
        const [cfg] = await db.select().from(pluginConfig).where(eq(pluginConfig.pluginId, p.id)).limit(1);
        console.log(JSON.stringify(cfg?.configJson ?? {}, null, 2));
        return;
      }

      // Update config
      const config = JSON.parse(json);
      await db
        .update(pluginConfig)
        .set({ configJson: config, updatedAt: new Date() })
        .where(eq(pluginConfig.pluginId, p.id));
      console.log("Config updated. Restart the server to apply.");
    });

  plugin
    .command("doctor [pluginKey]")
    .description("Check plugin health and diagnostics")
    .action(async (pluginKey?: string) => {
      const { createDb } = await import("@paperclipai/db");
      const { loadConfig } = await import("../config.js");
      const config = await loadConfig();
      const db = createDb(config.databaseUrl);
      const { plugins, pluginJobs, pluginJobRuns } = await import("@paperclipai/db");
      const { eq } = await import("drizzle-orm");

      const query = pluginKey
        ? db.select().from(plugins).where(eq(plugins.pluginKey, pluginKey))
        : db.select().from(plugins);

      const rows = await query;

      for (const row of rows) {
        console.log(`\n=== ${row.pluginKey} v${row.version} ===`);
        console.log(`  Status: ${row.status}`);
        console.log(`  Capabilities: ${row.capabilities.join(", ")}`);
        console.log(`  Install path: ${row.installPath}`);
        if (row.lastError) console.log(`  Last error: ${row.lastError}`);

        const jobs = await db.select().from(pluginJobs).where(eq(pluginJobs.pluginId, row.id));
        if (jobs.length > 0) {
          console.log(`  Jobs:`);
          for (const job of jobs) {
            console.log(`    ${job.jobKey}: ${job.cron} (enabled: ${job.enabled}, next: ${job.nextRunAt?.toISOString() ?? "N/A"})`);
          }
        }
      }
      console.log();
    });

  plugin
    .command("purge <pluginKey>")
    .description("Permanently delete all plugin data")
    .action(async (pluginKey: string) => {
      const { createDb } = await import("@paperclipai/db");
      const { loadConfig } = await import("../config.js");
      const config = await loadConfig();
      const db = createDb(config.databaseUrl);
      const { plugins } = await import("@paperclipai/db");
      const { eq } = await import("drizzle-orm");

      const [p] = await db.select().from(plugins).where(eq(plugins.pluginKey, pluginKey)).limit(1);
      if (!p) {
        console.error(`Plugin ${pluginKey} not found.`);
        process.exit(1);
      }
      if (p.status !== "uninstalled") {
        console.error(`Plugin must be uninstalled before purging. Run 'plugin uninstall' first.`);
        process.exit(1);
      }

      await db.delete(plugins).where(eq(plugins.id, p.id));
      console.log(`All data for ${pluginKey} permanently deleted.`);
    });
}
```

- [ ] **Step 2: Register plugin commands in CLI**

In `cli/src/index.ts`, add import:

```typescript
import { registerPluginCommands } from "./commands/plugin.js";
```

Add after the existing `register*Commands` calls:

```typescript
registerPluginCommands(program);
```

- [ ] **Step 3: Commit**

```bash
git add cli/src/commands/plugin.ts cli/src/index.ts
git commit -m "feat(cli): add plugin CLI commands — list, install, uninstall, upgrade, config, doctor, purge"
```

---

## Chunk 6: Plugin Creator Skill

### Task 15: Plugin Creator Skill

**Files:**
- Create: `~/.claude/skills/paperclip-plugin-creator/skill.md`

- [ ] **Step 1: Create the plugin creator skill**

Write the skill file at `~/.claude/skills/paperclip-plugin-creator/skill.md` with:

1. Interactive flow asking: name, description, category, capabilities, jobs, events, tools, routes
2. Manifest generation from answers
3. Worker scaffold with stub handlers
4. package.json and tsconfig.json generation
5. Build script
6. Instructions to run `pnpm paperclipai plugin install ./path`

The skill should follow the same pattern as `paperclip-agent-creator` — guided interactive creation.

See spec Section 10 for the full flow and generated scaffold details.

- [ ] **Step 2: Commit**

```bash
git add ~/.claude/skills/paperclip-plugin-creator/
git commit -m "feat: add plugin creator skill for guided plugin scaffolding"
```

---

### Task 16: End-to-End Verification

- [ ] **Step 1: Type-check entire project**

Run: `cd /home/clawdbot/paperclip && pnpm typecheck`

Expected: No type errors.

- [ ] **Step 2: Run all plugin-related tests**

Run: `cd /home/clawdbot/paperclip && pnpm vitest run --reporter=verbose server/src/__tests__/plugin-*.test.ts packages/plugin-sdk/src/__tests__/*.test.ts`

Expected: All tests PASS.

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address type errors and test failures from plugin system integration"
```
