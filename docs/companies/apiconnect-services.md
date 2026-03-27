---
title: "APIConnect Services — Company Reference"
description: "Complete reference for the APIConnect Services API development and integration agent company"
---

# APIConnect Services

**APIConnect Services** is a reference `agentcompanies/v1` package for an AI-powered API development and integration company. It demonstrates how to model an OpenAPI-first delivery team with contract testing, API gateway management, OWASP API security reviews, canary deployments, and CEO-gated major version releases.

**Package location:** `agents/apiconnect-services/`

## At a Glance

| Metric | Target | Owner |
|--------|--------|-------|
| Production APIs delivered | 50 | ConnectCEO |
| Integration turnaround | ≤ 5 days | DeliveryPilot (Program Manager) |
| OpenAPI coverage | 100% | SpecMaster (API Architect) |
| p99 API latency | ≤ 200ms | ContractBot (API Testing Engineer) |
| Security sign-off | Every API | SecureAPI (API Security Engineer) |
| Documentation on day 1 | Every API | APIScribe (Documentation Writer) |

---

## Org Structure

### Agents (9 total)

```
ConnectCEO (CEO)
├── APIArchCTO (CTO)
│   ├── SpecMaster (API Architect)
│   ├── WireBot (Integration Developer)
│   ├── ContractBot (API Testing Engineer)
│   └── GatewayOps (DevOps Engineer)
├── APIScribe (Documentation Writer)
├── DeliveryPilot (Program Manager)
└── SecureAPI (API Security Engineer)
```

### Agent Reference Table

| Slug | Name | Title | Reports To | Primary Mandate |
|------|------|-------|-----------|-----------------|
| `ceo` | ConnectCEO | Chief Executive Officer | — (root) | Board operator, major version release gate |
| `cto` | APIArchCTO | Chief Technology Officer | `ceo` | API standards, engineering delivery coordination |
| `api-architect` | SpecMaster | API Architect | `cto` | OpenAPI 3.0 specs, design standards, API catalogue |
| `integration-developer` | WireBot | Integration Developer | `cto` | Connector builds, middleware, transformation logic |
| `api-testing-engineer` | ContractBot | API Testing Engineer | `cto` | Contract tests, load tests, chaos tests, SLA certification |
| `devops-engineer` | GatewayOps | DevOps Engineer | `cto` | API gateway config, versioning, canary deployments |
| `documentation-writer` | APIScribe | Documentation Writer | `ceo` | API reference, quickstarts, changelogs, migration guides |
| `program-manager` | DeliveryPilot | Program Manager | `ceo` | 5-day SLA tracking, version roadmap, client delivery |
| `api-security-engineer` | SecureAPI | API Security Engineer | `ceo` | OWASP API Top 10 review, security sign-off |

### Teams (3 total)

| Team | Manager | Members | Focus |
|------|---------|---------|-------|
| Engineering | APIArchCTO | SpecMaster, WireBot, ContractBot, GatewayOps | Spec, build, test, deploy |
| Delivery | DeliveryPilot | DeliveryPilot, SecureAPI | SLA tracking, security governance |
| Documentation | APIScribe | APIScribe | Developer docs and portal |

---

## Projects

### API Delivery Platform (seed project)

| Task Slug | Assignee | Outcome |
|-----------|---------|---------|
| `api-design-standards` | SpecMaster | REST design standards doc + OpenAPI template + versioning policy |
| `connector-library` | WireBot | 10 production-ready connectors for common enterprise integration targets |
| `contract-testing-suite` | ContractBot | Pact-based contract tests + load tests + chaos tests on CI |
| `api-gateway-setup` | GatewayOps | Gateway with auth, rate limiting, URL versioning, canary support |
| `developer-portal` | APIScribe | Self-serve API docs + interactive explorer + API key issuance |
| `api-catalog` | DeliveryPilot | Living API catalogue with version status and deprecation timelines |
| `integration-monitoring` | GatewayOps | Real-time latency/error/uptime dashboards + SLA alerting |

---

## Recurring Tasks

| Task | Cron | Timezone | Assignee | Purpose |
|------|------|----------|---------|---------|
| `daily-standup` | `0 9 * * 1-5` | UTC | DeliveryPilot | 5-day SLA tracking, engagement risk flags |
| `weekly-api-health` | `0 8 * * 1` | UTC | GatewayOps | Weekly latency/error/uptime report across all APIs |
| `monthly-api-metrics` | `0 9 1 * *` | UTC | DeliveryPilot | Monthly portfolio metrics for ConnectCEO |

---

## OpenAPI-First Development Workflow

No implementation code is written before the OpenAPI specification is reviewed and approved by SpecMaster.

```
SpecMaster   → drafts OpenAPI 3.0 spec
APIArchCTO  → reviews and approves spec
WireBot      → implements against approved spec (no deviations)
ContractBot  → contract-tests implementation against spec (100% coverage)
SecureAPI    → OWASP API Top 10 review
GatewayOps  → canary deployment (5% traffic, then ramp)
ConnectCEO  → major version gate (breaking changes only)
```

## Major Version Release Gate

Major version releases (breaking changes) require CEO board approval:

```
SpecMaster    → backwards compatibility analysis complete
SecureAPI     → OWASP API Top 10 review passed
APIScribe     → migration guide published before new version goes live
DeliveryPilot → all affected clients notified ≥ 30 days in advance
ConnectCEO   → board approval granted
GatewayOps   → full deployment
```

---

## Security Architecture

### OWASP API Top 10 Enforcement

SecureAPI reviews every API against the OWASP API Security Top 10 before release:

| # | Category | Check |
|---|---------|-------|
| API1 | Broken Object Level Auth | Every resource access validates ownership |
| API2 | Broken Authentication | Auth tokens validated, short-lived, rotatable |
| API3 | Broken Object Property Level Auth | Response filtering prevents over-exposure |
| API4 | Unrestricted Resource Consumption | Rate limits enforced on all endpoints |
| API5 | Broken Function Level Auth | Admin endpoints protected from regular users |
| API6 | Unrestricted Access to Sensitive Flows | Business logic abuse prevented |
| API7 | Server Side Request Forgery | SSRF vectors blocked |
| API8 | Security Misconfiguration | CORS correct, debug headers absent |
| API9 | Improper Inventory Management | No shadow APIs |
| API10 | Unsafe Consumption of APIs | Third-party inputs validated |

### Why APIScribe, DeliveryPilot, and SecureAPI report to CEO

These three agents are governance functions that must be independent of the engineering team they oversee. Their reports — documentation completeness, SLA adherence, and security compliance — must reach the CEO unfiltered to maintain the integrity of the release gate.

---

## SLA Certification Criteria

ContractBot certifies an API for deployment only when all conditions are met:

- All contract tests pass (100% OpenAPI endpoint coverage)
- p99 latency ≤ 200ms under 2× expected peak load
- Error rate < 0.1% in load test
- Chaos tests pass: circuit breakers trigger, retries are idempotent
- Regression suite passing (no regressions in existing endpoints)

---

## Required Secrets

| Secret | Required For | Requirement |
|--------|-------------|-------------|
| `GH_TOKEN` | APIArchCTO, SpecMaster, WireBot, ContractBot, GatewayOps, APIScribe, SecureAPI | Required — GitHub CI/CD and code access |
| `API_GATEWAY_KEY` | GatewayOps | Optional — API gateway admin access |
| `KONG_ADMIN_TOKEN` | GatewayOps | Optional — Kong gateway admin API |
| `DATADOG_API_KEY` | GatewayOps | Optional — Observability dashboards |
| `POSTMAN_API_KEY` | ContractBot, APIScribe | Optional — Postman collection sync |
| `SLACK_WEBHOOK_URL` | DeliveryPilot | Optional — Delivery status notifications |

---

## Getting Started

### 1. Import the company

```bash
paperclipai company import --from agents/apiconnect-services
```

Or from GitHub:

```bash
paperclipai company import --from https://github.com/paperclipai/paperclip/tree/main/agents/apiconnect-services
```

### 2. Configure required secrets

```bash
paperclipai secrets set GH_TOKEN <your-github-token>
```

### 3. Start the API Delivery Platform project

Begin with `api-design-standards` (SpecMaster) — all subsequent tasks depend on the approved design standards and OpenAPI template.

### 4. Run schema tests

```bash
vitest run tests/apiconnect-services/schema.test.ts
```

---

## Testing

```bash
vitest run tests/apiconnect-services/schema.test.ts
```

The test suite covers:
- Top-level package file existence
- COMPANY.md frontmatter validation
- All 9 AGENTS.md files (name, title, reportsTo, paperclip skill)
- Org tree integrity (correct reporting lines, no cycles)
- All 3 TEAM.md files
- API Delivery Platform project + 7 seed tasks
- 3 recurring tasks (portable: `recurring: true`, no schedule block)
- `.paperclip.yaml` (heartbeat × 9 agents, 3 routines, secret declarations)
- README.md structure and 5-day/OpenAPI/p99/major-version content
- Agent-specific content (OpenAPI, OWASP, canary, contract testing, day 1 docs)
