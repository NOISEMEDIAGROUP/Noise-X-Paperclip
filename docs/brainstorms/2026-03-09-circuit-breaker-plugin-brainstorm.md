# Brainstorm: Circuit Breaker Plugin (#390)

**Date:** 2026-03-09
**Status:** Ready for planning

## What We're Building

A circuit breaker plugin for Paperclip using the plugin SDK (PR #396) that detects runaway agents and auto-pauses them before they burn through their budgets. Addresses the #1 pain point in the repo (issues #390 and #373): agents get stuck in loops burning tokens with no progress, and the budget system only catches it after the damage is done.

The plugin subscribes to agent run lifecycle events, tracks failure/progress patterns using scoped state, and pauses agents when configurable thresholds are tripped. Recovery is manual by default, with an opt-in half-open circuit breaker pattern for auto-recovery.

## Why a Plugin (Not Server-Side)

PR #391 implements a circuit breaker directly in heartbeat.ts. Our plugin approach is better because:

- **Decoupled from server core** — event-driven monitoring belongs in plugin-land, not baked into the heartbeat path. The maintainer explicitly redirected notification work to plugins (PR #389).
- **No race conditions** — plugin state is scoped per `(pluginId, scopeKind, scopeId)`. No shared mutable state between concurrent runs.
- **Configurable per deployment** — operators customize thresholds via `instanceConfigSchema`. Different deployments get different sensitivity.
- **Better tested** — SDK's `createTestHarness()` enables isolated unit tests for each detector. We ship 11+ tests per plugin.
- **Proves the SDK** — demonstrates the plugin architecture handles real operational problems, not just notifications. Exercises 5 SDK capabilities: events, state, agents, jobs, metrics.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Detection strategies** | All three: consecutive failures, no-progress, token velocity | Full coverage. Each catches different failure modes. |
| **Pause mechanism** | `ctx.agents.pause()` via PR #403 | Clean SDK capability. Plugin declares `agents.pause` in manifest. |
| **Progress data** | Enrich `agent.run.finished` event payload with `resultJson` (upstream PR) | Plugin needs issues modified/created/comments posted to detect no-progress. Benefits all plugin consumers. |
| **Recovery default** | Manual (operator un-pauses via UI) | Safe, matches budget system behavior. Activity log + notifications tell operators what happened. |
| **Recovery opt-in** | Half-open pattern via `ctx.jobs` | After configurable cooldown, allow one trial run. If it succeeds, reset counters. If it fails, re-trip. Showcases jobs capability. |
| **Config scope** | Instance defaults + per-agent overrides | Global thresholds in plugin config, per-agent overrides read from `agent.runtimeConfig.circuitBreaker`. Plugin merges configs per agent. |
| **Circuit states** | Closed → Open → Half-Open (tracked in `ctx.state`) | Classic circuit breaker pattern. State scoped per agent. |

## Detection Strategies

### 1. Consecutive Failures
- Track count of consecutive `agent.run.failed` events per agent in `ctx.state`
- Reset counter on any `agent.run.finished` (succeeded)
- Trip when count hits `maxConsecutiveFailures` (default: 3)

### 2. No-Progress Runs
- On `agent.run.finished`, check `resultJson` from enriched event payload
- A run has "no progress" if `issuesModified`, `issuesCreated`, and `commentsPosted` are all 0
- Track consecutive no-progress count per agent in `ctx.state`
- Reset on any run that made progress
- Trip when count hits `maxConsecutiveNoProgress` (default: 5)
- **Depends on:** upstream PR to add `resultJson` to event payload

### 3. Token Velocity Spike
- Track rolling window of per-run token costs in `ctx.state` (last N runs)
- On each `agent.run.finished`, compare latest run's cost to rolling average
- Trip when latest cost exceeds `tokenVelocityMultiplier × rollingAverage` (default: 3.0×)
- Rolling window size configurable (default: 20 runs)

## SDK Capabilities Used

| Capability | Usage |
|-----------|-------|
| `events.subscribe` | Subscribe to `agent.run.finished`, `agent.run.failed` |
| `plugin.state.read/write` | Track counters, circuit state, rolling averages per agent |
| `agents.read` | Check agent status before acting (don't pause already-paused agents) |
| `agents.pause` | Pause agent when circuit breaker trips (PR #403) |
| `jobs.schedule` | Cooldown timer for half-open recovery |
| `activity.log.write` | Audit trail when circuit trips/resets |
| `metrics.write` | Dashboard metrics: trips, resets, detections per strategy |

## Configuration Schema

```json
{
  "enabled": true,
  "maxConsecutiveFailures": 3,
  "maxConsecutiveNoProgress": 5,
  "tokenVelocityMultiplier": 3.0,
  "tokenVelocityWindowSize": 20,
  "recovery": {
    "mode": "manual",
    "cooldownMinutes": 30
  }
}
```

Per-agent overrides via `agent.runtimeConfig.circuitBreaker` (same shape, merged over instance defaults).

## Dependencies

| Dependency | Status | Notes |
|-----------|--------|-------|
| PR #396 — Plugin SDK | In progress | Foundation for all plugins |
| PR #403 — `agents.pause` + `agents.resume` | Opened | Required for pause action |
| Event payload enrichment — add `resultJson` to `agent.run.finished` | Not yet opened | Required for no-progress detection |

## Open Questions

1. **Should the plugin emit a custom event** (e.g., `circuit_breaker.tripped`) so other plugins (webhook, discord) can react? The SDK supports `events.emit` — this would create a composable notification chain.
2. **Granularity of no-progress** — is "zero issues modified/created + zero comments" the right bar, or should we also consider commits, PRs, or other artifacts?
3. **Token velocity cold start** — what happens before the rolling window is full? Skip velocity checks until N runs are recorded, or use a minimum threshold?

## Strategic Context

This is the third community plugin in our contribution arc:
1. **Webhook notifier** (PR #398) — shipped, proves basic SDK event handling
2. **Discord notifier** (PR #398) — shipped, proves SDK secrets + HTTP
3. **Circuit breaker** — proves the SDK handles real operational problems

Together they demonstrate the plugin architecture covers notifications AND monitoring, making a strong case that PR #391's server-side approach should be replaced by the plugin pattern.
