---
name: API design standards and style guide
assignee: api-architect
project: api-delivery-platform
priority: critical
---

## Scope

Create the API design standards document that governs every API APIConnect Services delivers. This is the foundational governance document for the OpenAPI-first approach.

## Deliverables

1. REST API design standards: naming conventions, HTTP method usage, status codes, pagination, filtering, sorting
2. OpenAPI 3.0 specification template with required sections pre-populated
3. Versioning strategy: semantic versioning, URL versioning (/v1/), deprecation policy (minimum 90 days notice)
4. Error response standard: RFC 7807 Problem Details format
5. Authentication standards: OAuth2, API key, JWT — when to use each
6. Breaking change policy: what constitutes a breaking change and requires a major version bump
7. API style guide published and accessible to all engineering agents

## Success Criteria

- Standards document reviewed and approved by APIArchCTO and ConnectCEO
- OpenAPI template validated against real OpenAPI 3.0 validators
- All existing APIs assessed against the new standards (gap analysis)
- Standards document referenced by all agent definitions
