# Agent Routines / Cron Plugin — Brainstorm

**Date:** 2026-03-09
**Issue:** #219
**Status:** Ready for planning

## What We're Building

A plugin (`@paperclipai/plugin-agent-routines`) that lets operators define scheduled routines — cron expression + agent + prompt — so agents execute specific tasks on a recurring schedule. Think: daily production health checks, end-of-day summaries, weekly dependency audits.

The plugin uses the existing `ctx.jobs.register()` infrastructure for scheduling and a **new** `ctx.agents.invoke()` SDK API to trigger agents with the routine's prompt as wakeup payload.

## Why This Approach

- **Plugin, not core code** — validates the architectural decision to build platform features as plugins
- **Exercises `ctx.jobs`** — first real plugin to fully leverage the job scheduling system
- **Simple config model** — routines defined as an array in `instanceConfigSchema`, managed through the standard plugin settings UI
- **Lean tracking** — `ctx.activity.log()` for audit trail, platform's existing agent run history for details, `ctx.metrics.write()` for execution counts/durations

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Agent invocation | New `ctx.agents.invoke()` SDK API | Type-safe, capability-gated, follows SDK patterns. No HTTP workaround. |
| SDK PR strategy | Bundle `agents.invoke` into PR #403 | #403 already adds `agents.pause/resume` with the same 6-layer pattern. Keeps agent write capabilities together. |
| API shape | `ctx.agents.invoke(agentId, { prompt, reason? })` | Simple DX. Plugin SDK auto-fills source/triggerDetail. |
| Config model | Instance config array | `routines: [{ cronExpression, agentId, prompt, enabled }]` in `instanceConfigSchema`. Simple, follows existing patterns. |
| Prompt delivery | Wakeup payload | Pass prompt in wakeup payload. Agent reads it from heartbeat context. Direct, minimal overhead. |
| Run tracking | Activity log + metrics only | `ctx.activity.log()` for audit, `ctx.metrics.write()` for counts/durations. No state bloat. |

## Design Sketch

### Routine Config Schema

```typescript
routines: [{
  name: string,           // Human-readable label
  cronExpression: string,  // 5-field cron (e.g., "0 9 * * 1-5")
  agentId: string,         // Target agent UUID
  prompt: string,          // What the agent should do
  enabled: boolean         // Toggle without deleting
}]
```

### Plugin Architecture

```
manifest.ts
  - Declares one job per routine (dynamically from config)
  - Capabilities: jobs.schedule, agents.invoke, agents.read, activity.log.write, metrics.write

worker.ts
  - setup(ctx):
    1. Read routines from ctx.config.get()
    2. For each enabled routine, ctx.jobs.register(routineKey, handler)
    3. Handler: ctx.agents.invoke(agentId, { prompt, reason })
    4. Log via ctx.activity.log(), record metrics via ctx.metrics.write()
```

### SDK Addition (PR #403)

```typescript
// New method on PluginAgentsClient
invoke(agentId: string, opts: { prompt: string; reason?: string }): Promise<{ runId: string }>

// New capability
"agents.invoke"
```

Follows the 6-layer pattern: constants → types → protocol → host-client-factory → worker-rpc-host → testing.

## Open Questions

1. **Dynamic job registration** — The manifest declares jobs statically, but routines come from config. Need to verify if jobs can be registered dynamically in `setup()` or if they must be declared in the manifest. If manifest-only, the plugin may need a fixed set of job slots.
2. **Config change handling** — When an operator adds/removes/modifies routines in config, do jobs need to be re-registered? What's the reload lifecycle?
3. **Agent validation** — Should the plugin validate that the `agentId` in each routine actually exists and is active? At config time or at execution time?
4. **Concurrency** — If a previous routine run is still in-flight (agent still processing), should the next cron tick skip, queue, or run anyway?

## Use Cases

- **Daily health check**: `"0 9 * * 1-5"` — "Check all production services are responding and report any issues"
- **End-of-day summary**: `"0 17 * * 1-5"` — "Summarize today's completed work, open blockers, and tomorrow's priorities"
- **Weekly dependency audit**: `"0 10 * * 1"` — "Review all dependencies for security vulnerabilities and outdated versions"
- **Hourly monitoring**: `"0 * * * *"` — "Check error rates and alert if above threshold"
