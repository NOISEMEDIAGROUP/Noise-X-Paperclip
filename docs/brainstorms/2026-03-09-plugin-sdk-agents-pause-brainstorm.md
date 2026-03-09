# Brainstorm: Plugin SDK — agents.pause + agents.resume

**Date:** 2026-03-09
**Status:** Ready for planning

## What We're Building

An extension to the Paperclip plugin SDK that adds `pause()` and `resume()` methods to `PluginAgentsClient`, enabling plugins to programmatically control agent lifecycle. This unlocks the circuit breaker use case — plugins can detect runaway agents (consecutive failures, no-progress loops, token velocity spikes) and auto-pause them, then optionally resume when conditions improve.

## Why This Approach

- **Follows the established 6-layer write capability pattern** (constants → types → protocol → host-client-factory → worker-rpc-host → testing), matching how `issues.create`/`issues.update` are implemented.
- **Reuses existing server-side logic** — `agentService.pause()` and `agentService.resume()` already exist and handle status guards, DB updates, and heartbeat cancellation.
- **Minimal scope** — no schema changes, no new tables, no reason parameter. Lean first iteration.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Scope** | Pause + Resume together | Natural pair. Enables fully autonomous circuit breakers. Server already has both methods. |
| **Reason parameter** | Drop for now | Match existing server API exactly. No schema changes needed. Can add later. |
| **Audit trail** | `actorType: 'plugin'`, `actorId: pluginId` | Distinguishes plugin-initiated pauses from user and system pauses in the activity log. |
| **Capability strings** | `agents.pause` + `agents.resume` (separate) | Fine-grained control. A monitoring plugin might only need pause, not resume. Follows `issues.create`/`issues.update` precedent. |

## Implementation Surface

Files to touch (following the issues.create/update pattern):

1. `packages/shared/src/constants.ts` — Add `"agents.pause"` and `"agents.resume"` to `PLUGIN_CAPABILITIES`
2. `packages/plugins/sdk/src/types.ts` — Extend `PluginAgentsClient` with `pause()` and `resume()` methods
3. `packages/plugins/sdk/src/protocol.ts` — Add `"agents.pause"` and `"agents.resume"` to `WorkerToHostMethods`
4. `packages/plugins/sdk/src/host-client-factory.ts` — Add to `HostServices`, `METHOD_CAPABILITY_MAP`, and handler map with `gated()` wrappers
5. `packages/plugins/sdk/src/worker-rpc-host.ts` — Add `pause()` and `resume()` to `ctx.agents` in `buildContext()`
6. `packages/plugins/sdk/src/testing.ts` — Add mock implementations with `requireCapability()` and company scoping
7. Server-side host wiring — Wire RPC handlers to `agentService.pause()` / `agentService.resume()`, including `heartbeat.cancelActiveForAgent()` and activity logging with `actorType: 'plugin'`

## Open Questions

- None blocking. All design decisions resolved.

## Context

- Motivating use case: circuit breaker plugin (issues #390, #373 — runaway agents)
- Related PRs: #396 (plugin SDK), #398 (webhook + discord notifier plugins)
- Circuit breaker v1 can ship as detect-and-notify-only; agents.pause/resume enables the full auto-remediation loop.
