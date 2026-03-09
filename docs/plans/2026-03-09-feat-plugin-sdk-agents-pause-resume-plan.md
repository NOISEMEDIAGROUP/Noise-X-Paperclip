---
title: "feat: Add agents.pause and agents.resume capabilities to plugin SDK"
type: feat
date: 2026-03-09
brainstorm: docs/brainstorms/2026-03-09-plugin-sdk-agents-pause-brainstorm.md
---

# feat: Add agents.pause and agents.resume capabilities to plugin SDK

## Overview

Extend the Paperclip plugin SDK with two new write capabilities — `agents.pause` and `agents.resume` — enabling plugins to programmatically control agent lifecycle. This follows the established 6-layer write capability pattern used by `issues.create`/`issues.update`. The motivating use case is a circuit breaker plugin that detects runaway agents and auto-pauses them.

## Problem Statement / Motivation

- Plugins can currently monitor agents (`agents.read`) but cannot act on them
- The #1 pain point in the repo (issues #390, #373) is runaway agents burning tokens
- A circuit breaker plugin needs `agents.pause` to close the detect-and-remediate loop automatically
- The server already has `agentService.pause()` and `agentService.resume()` — the SDK just needs to expose them

## Proposed Solution

Add `agents.pause` and `agents.resume` as two separate capability strings, following the exact 6-layer pattern established by `issues.create`/`issues.update`. This is an SDK-only change — the server-side host services wiring will be added when the plugin worker manager is built (separate PR).

### Method Signatures

```typescript
// PluginAgentsClient (types.ts)
pause(agentId: string, companyId: string): Promise<Agent>;
resume(agentId: string, companyId: string): Promise<Agent>;
```

### Capability Strings

- `"agents.pause"` — required to call `ctx.agents.pause()`
- `"agents.resume"` — required to call `ctx.agents.resume()`

Separate capabilities allow fine-grained control: a monitoring-only circuit breaker can declare `agents.pause` without `agents.resume`, leaving human-in-the-loop for recovery.

## Implementation

### Layer 1: Shared Constants

**File:** `packages/shared/src/constants.ts` (line ~349, after `"issue.comments.create"`)

Add `"agents.pause"` and `"agents.resume"` to the `PLUGIN_CAPABILITIES` array in the "Data Write" group:

```typescript
// Data Write
"issues.create",
"issues.update",
"issue.comments.create",
"agents.pause",    // NEW
"agents.resume",   // NEW
"assets.write",
```

### Layer 2: SDK Types

**File:** `packages/plugins/sdk/src/types.ts` (line ~836, inside `PluginAgentsClient`)

Extend the interface and update the JSDoc:

```typescript
/**
 * `ctx.agents` — read and manage agents.
 *
 * Requires `agents.read` for reads; `agents.pause` / `agents.resume`
 * for lifecycle operations.
 */
export interface PluginAgentsClient {
  list(input: { companyId: string; status?: Agent["status"]; limit?: number; offset?: number }): Promise<Agent[]>;
  get(agentId: string, companyId: string): Promise<Agent | null>;
  /** Pause an agent. Throws if agent is terminated or not found. Requires `agents.pause`. */
  pause(agentId: string, companyId: string): Promise<Agent>;
  /** Resume a paused agent (sets status to idle). Throws if terminated, pending_approval, or not found. Requires `agents.resume`. */
  resume(agentId: string, companyId: string): Promise<Agent>;
}
```

Also update the `PluginContext.agents` JSDoc (line ~931):

```typescript
/** Read and manage agents. Requires `agents.read` for reads; `agents.pause` / `agents.resume` for lifecycle ops. */
agents: PluginAgentsClient;
```

### Layer 3: Protocol

**File:** `packages/plugins/sdk/src/protocol.ts` (line ~605, after `"agents.get"`)

Add two new entries to `WorkerToHostMethods`:

```typescript
// Agents (read)
"agents.list": [ /* existing */ ];
"agents.get": [ /* existing */ ];

// Agents (write)
"agents.pause": [
  params: { agentId: string; companyId: string },
  result: unknown,
];
"agents.resume": [
  params: { agentId: string; companyId: string },
  result: unknown,
];
```

### Layer 4: Host-Client-Factory

**File:** `packages/plugins/sdk/src/host-client-factory.ts`

**4a. HostServices interface** (line ~175, inside `agents` group):

```typescript
/** Provides `agents.list`, `agents.get`, `agents.pause`, `agents.resume`. */
agents: {
  list(params: WorkerToHostMethods["agents.list"][0]): Promise<WorkerToHostMethods["agents.list"][1]>;
  get(params: WorkerToHostMethods["agents.get"][0]): Promise<WorkerToHostMethods["agents.get"][1]>;
  pause(params: WorkerToHostMethods["agents.pause"][0]): Promise<WorkerToHostMethods["agents.pause"][1]>;
  resume(params: WorkerToHostMethods["agents.resume"][0]): Promise<WorkerToHostMethods["agents.resume"][1]>;
};
```

**4b. METHOD_CAPABILITY_MAP** (line ~296, after `"agents.get"`):

```typescript
// Agents
"agents.list": "agents.read",
"agents.get": "agents.read",
"agents.pause": "agents.pause",
"agents.resume": "agents.resume",
```

**4c. Handler map** (line ~476, after `"agents.get"` handler):

```typescript
"agents.pause": gated("agents.pause", async (params) => {
  return services.agents.pause(params);
}),
"agents.resume": gated("agents.resume", async (params) => {
  return services.agents.resume(params);
}),
```

### Layer 5: Worker-RPC-Host

**File:** `packages/plugins/sdk/src/worker-rpc-host.ts` (line ~625, after `agents.get()`)

Add to the `agents` object in `buildContext()`:

```typescript
agents: {
  async list(input) { /* existing */ },
  async get(agentId: string, companyId: string) { /* existing */ },

  async pause(agentId: string, companyId: string) {
    return callHost("agents.pause", { agentId, companyId }) as any;
  },

  async resume(agentId: string, companyId: string) {
    return callHost("agents.resume", { agentId, companyId }) as any;
  },
},
```

### Layer 6: Testing Harness

**File:** `packages/plugins/sdk/src/testing.ts` (line ~432, after `agents.get()`)

Add mock implementations that enforce capability gates and status guards matching the server:

```typescript
agents: {
  async list(input) { /* existing */ },
  async get(agentId, companyId) { /* existing */ },

  async pause(agentId, companyId) {
    requireCapability(manifest, capabilitySet, "agents.pause");
    const cid = requireCompanyId(companyId);
    const agent = agents.get(agentId);
    if (!isInCompany(agent, cid)) throw new Error(`Agent not found: ${agentId}`);
    if (agent!.status === "terminated") throw new Error("Cannot pause terminated agent");
    const updated: Agent = { ...agent!, status: "paused", updatedAt: new Date() };
    agents.set(agentId, updated);
    return updated;
  },

  async resume(agentId, companyId) {
    requireCapability(manifest, capabilitySet, "agents.resume");
    const cid = requireCompanyId(companyId);
    const agent = agents.get(agentId);
    if (!isInCompany(agent, cid)) throw new Error(`Agent not found: ${agentId}`);
    if (agent!.status === "terminated") throw new Error("Cannot resume terminated agent");
    if (agent!.status === "pending_approval") throw new Error("Pending approval agents cannot be resumed");
    const updated: Agent = { ...agent!, status: "idle", updatedAt: new Date() };
    agents.set(agentId, updated);
    return updated;
  },
},
```

### Build Step

After all source changes, rebuild the SDK and shared packages:

```bash
pnpm --filter @paperclipai/shared build
pnpm --filter @paperclipai/plugin-sdk build
```

## Technical Considerations

### Status Guards (from server-side `agentService`)

| Operation | Rejects | Sets status to |
|-----------|---------|----------------|
| `pause()` | `terminated` | `"paused"` |
| `resume()` | `terminated`, `pending_approval` | `"idle"` |

Both operations are **idempotent** — pausing an already-paused agent silently succeeds (matches existing server behavior).

### Return Type

`Promise<Agent>` (non-nullable). Follows the `issues.update()` pattern — throws when the agent is not found or in a different company, rather than returning `null`.

### Server-Side Wiring (Future PR)

When the plugin worker manager is built, the server-side `HostServices` implementation will:
1. Call `agentService.pause(id)` / `agentService.resume(id)`
2. Call `heartbeat.cancelActiveForAgent(id)` on pause (not needed for resume)
3. Log activity with `actorType: 'plugin'`, `actorId: pluginId`, action `"agent.paused"` / `"agent.resumed"`

### Edge Cases

- **Concurrent pause from two plugins**: Last writer wins (acceptable for v1)
- **Resume a running agent**: Server sets status to `idle` (state downgrade — documented server behavior, not something the SDK changes)
- **Plugin has pause but not resume**: Works correctly — `gated()` independently enforces each capability

## Acceptance Criteria

- [x] `"agents.pause"` and `"agents.resume"` added to `PLUGIN_CAPABILITIES` in shared constants
- [x] `PluginAgentsClient` interface extended with `pause()` and `resume()` methods
- [x] `WorkerToHostMethods` has `"agents.pause"` and `"agents.resume"` protocol entries
- [x] `HostServices.agents` extended with typed `pause` and `resume` service methods
- [x] `METHOD_CAPABILITY_MAP` maps both methods to their respective capabilities
- [x] `createHostClientHandlers()` has `gated()` wrappers for both methods
- [x] `buildContext()` in worker-rpc-host delegates to `callHost()` for both methods
- [x] Test harness mock enforces capability gates, company scoping, and status guards
- [x] JSDoc updated on `PluginAgentsClient` and `PluginContext.agents`
- [x] Shared and SDK packages build successfully
- [x] Existing tests still pass

## References

- **Brainstorm:** `docs/brainstorms/2026-03-09-plugin-sdk-agents-pause-brainstorm.md`
- **Server pause/resume:** `server/src/services/agents.ts:363-392`
- **issues.create pattern:** `packages/plugins/sdk/src/host-client-factory.ts:162-180` (HostServices), `:290-296` (capability map), `:465-476` (handlers)
- **Motivating issues:** #390, #373 (runaway agents)
- **Related PRs:** #396 (plugin SDK), #398 (webhook + discord notifier plugins)
