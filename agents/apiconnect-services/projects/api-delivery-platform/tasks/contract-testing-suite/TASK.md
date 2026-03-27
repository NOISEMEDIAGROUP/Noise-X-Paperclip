---
name: Build contract testing suite
assignee: api-testing-engineer
project: api-delivery-platform
priority: high
---

## Scope

Build the Pact-based contract testing suite that validates every API implementation against its OpenAPI specification. This suite becomes the release gate for all future API deliveries.

## Deliverables

1. Pact consumer-driven contract testing framework configured
2. Contract tests for all connector library APIs
3. OpenAPI linting rules integrated into CI (Spectral or equivalent)
4. Contract test CI pipeline: runs on every PR against changed API endpoints
5. Load testing framework: k6 scripts for baseline load test scenarios
6. Chaos testing scripts: simulating timeout, rate limit exceeded, and upstream failure scenarios

## Success Criteria

- Contract tests pass for 100% of connector library APIs
- CI pipeline runs contract tests on every PR in under 5 minutes
- Load tests validate p99 ≤ 200ms under 2x peak load for all connectors
- Chaos tests confirm correct error propagation and retry behaviour
- Testing framework documented for use in all future engagements
