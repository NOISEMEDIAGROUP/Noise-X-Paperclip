# Paperclip-as-a-Service — Architecture

## Current Architecture (single-tenant, local)

```
┌─────────────────────────────────┐
│  Single Machine                 │
│  ┌───────────┐ ┌─────────┐      │
│  │ Paperclip │ │Embedded │      │
│  │ Server    │→│Postgres │      │
│  │ (Node.js) │ └─────────┘      │
│  └─────┬─────┘                  │
│        │ spawn                  │
│  ┌─────▼─────┐                  │
│  │ claude    │ (child           │
│  │ kiro-cli  │  processes)      │
│  │ codex     │                  │
│  └───────────┘                  │
└─────────────────────────────────┘
```

**Problem:** Agents run as local child processes on the same box as the control plane. No tenant isolation, no horizontal scaling, no sandboxing.

---

## Managed Architecture

```
                ┌─────────────────────────────────────────────────┐
                │                 CONTROL PLANE                   │
                │                                                 │
Users ──────►   │  ┌──────────┐  ┌────────────┐  ┌─────────────┐  │
(Web UI/API)    │  │ API GW / │  │ Paperclip  │  │ Shared      │  │
                │  │ Auth     │─►│ Server     │─►│ Postgres    │  │
                │  │ (tenant) │  │ (stateless)│  │ (RDS)       │  │
                │  └──────────┘  └─────┬──────┘  └─────────────┘  │
                │                      │                          │
                │             ┌────────▼────────┐                 │
                │             │  Task Queue     │                 │
                │             │  (Redis/SQS)    │                 │
                │             └────────┬────────┘                 │
                └──────────────────────┼──────────────────────────┘
                                       │
                ┌──────────────────────▼──────────────────────────┐
                │               EXECUTION PLANE                   │
                │                                                 │
                │  ┌───────────┐ ┌───────────┐ ┌───────────┐      │
                │  │ Worker 1  │ │ Worker 2  │ │ Worker N  │      │
                │  │┌─────────┐│ │┌─────────┐│ │┌─────────┐│      │
                │  ││Container││ ││Container││ ││Container││      │
                │  ││ claude  ││ ││ kiro-cli││ ││ codex   ││      │
                │  │└─────────┘│ │└─────────┘│ │└─────────┘│      │
                │  │ Tenant A  │ │ Tenant B  │ │ Tenant A  │      │
                │  └───────────┘ └───────────┘ └───────────┘      │
                │                                                 │
                │  Sandboxed, ephemeral, per-run containers       │
                └─────────────────────────────────────────────────┘
```

---

## Key Layers

### 1. API Gateway / Auth Layer

- **Multi-tenant auth** — JWT with `companyId` claim, SSO/OAuth
- **Rate limiting** per tenant
- **API key management** for programmatic access
- Route to the right Paperclip server instance

### 2. Control Plane (stateless Paperclip servers)

- **Current Paperclip server, made stateless** — remove embedded Postgres, point at shared RDS
- **Horizontally scalable** — multiple replicas behind a load balancer
- **Heartbeat scheduler** becomes a separate service (or leader-elected) to avoid duplicate wakeups
- Doesn't execute agents directly — enqueues runs to the task queue

### 3. Task Queue

- **Redis Streams, SQS, or NATS** — decouples scheduling from execution
- Messages: `{ runId, agentId, companyId, adapterType, config, prompt }`
- Supports priority queues (CEO runs > background heartbeats)
- Dead-letter queue for failed runs

### 4. Execution Plane (workers)

This is the big change. Instead of `spawn("claude", ...)` locally:

```
┌─────────────────────────────────────┐
│  Execution Worker                   │
│                                     │
│  1. Pull run from queue             │
│  2. Provision sandboxed container   │
│     - Mount agent's repo (R/O or    │
│       cloned fresh)                 │
│     - Inject secrets from Vault     │
│     - Set resource limits (CPU,     │
│       memory, network, time)        │
│  3. Run adapter inside container    │
│  4. Stream logs back to control     │
│     plane via WebSocket/gRPC        │
│  5. Tear down container             │
└─────────────────────────────────────┘
```

**Options for container runtime:**

- **Firecracker microVMs** (AWS Lambda-style) — strongest isolation
- **gVisor/Kata containers** — good balance
- **Docker with seccomp/AppArmor** — simplest to start

### 5. Data Layer

| Store | Purpose |
|---|---|
| **PostgreSQL (RDS)** | Agents, issues, goals, runs, approvals — same schema as today |
| **Redis** | Task queue, pub/sub for live run streaming, session cache |
| **S3** | Run logs (stdout/stderr), artifacts, file attachments |
| **Vault/SSM** | Per-tenant secrets (API keys, tokens), agent env vars |

---

## Tenant Isolation

```
                  Logical isolation
                  ┌────────────────────┐
  DB level:       │ companyId on       │ ← already exists in schema
                  │ every table (RLS)  │
                  └────────────────────┘
  Execution:      ┌────────────────────┐
                  │ Separate container │ ← no cross-tenant access
                  │ per run            │
                  └────────────────────┘
  Network:        ┌────────────────────┐
                  │ Agent containers   │ ← egress-only, no lateral
                  │ in isolated VPC    │   movement between tenants
                  └────────────────────┘
  Secrets:        ┌────────────────────┐
                  │ Per-tenant paths   │ ← vault/company/{id}/...
                  │ in Vault/SSM       │
                  └────────────────────┘
```

---

## What Changes in the Codebase

| Component | Current | Managed |
|---|---|---|
| **DB** | Embedded Postgres | RDS with row-level security (companyId already on every table) |
| **Heartbeat scheduler** | In-process timer | Separate service, or cron + queue (avoids duplicate wakeups across replicas) |
| **Adapter execute()** | `spawn()` local child process | Enqueue to task queue → worker provisions container → runs adapter inside |
| **Log streaming** | `onLog()` writes to local DB | `onLog()` streams to Redis pub/sub → S3 for persistence |
| **Auth** | Local trust mode | JWT + API keys, tenant-scoped |
| **Agent repo access** | Reads local filesystem | Clone from Git (GitHub app integration) or mount from EFS |
| **Secrets** | `process.env` passthrough | Vault/SSM, injected at container start |

---

## Billing / Metering

```
Every run already tracks:
  - usage.inputTokens / outputTokens  ← in AdapterExecutionResult
  - costUsd                            ← in AdapterExecutionResult
  - duration                           ← already tracked
  - budgetMonthlyCents                 ← already on agent model

New for SaaS:
  - Metering service aggregates per-tenant usage
  - Budget enforcement: reject runs when tenant budget exceeded
  - Stripe integration for billing
```

---

## Migration Path (incremental)

### Phase 1 — Externalize DB

- Point at RDS instead of embedded Postgres
- No code changes needed (already uses Drizzle ORM)

### Phase 2 — Queue-based execution

- Add a `QueuedExecutionAdapter` that wraps existing adapters
- Control plane enqueues, workers dequeue and run the real adapter
- Workers can still `spawn()` locally at first — no containers yet

### Phase 3 — Container isolation

- Workers provision containers per run (Docker, then Firecracker)
- Git clone agent repos into containers

### Phase 4 — Multi-tenant auth + billing

- API gateway with JWT auth
- Metering pipeline, Stripe billing

### Phase 5 — Scale

- Autoscale worker pool based on queue depth
- Regional deployment for lower latency

---

## Notes

The current Paperclip schema already has `companyId` on every table and the adapter interface is clean. The main engineering work is:

1. Replacing `spawn()` with queue + container
2. Externalizing the DB and heartbeat scheduler
3. Adding auth and billing layers
