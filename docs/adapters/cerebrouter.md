---
title: Cerebrouter
summary: Route agent prompts through a Cerebrouter OpenAI-compatible endpoint
---

The `cerebrouter` adapter sends a single `POST /v1/chat/completions` request to a Cerebrouter instance and returns the assistant text as the run summary.

## When to Use

- You run a local/remote Cerebrouter service that exposes OpenAI-compatible endpoints.
- You want Paperclip heartbeats to use Cerebrouter routing (`/v1/models`, `/v1/chat/completions`).
- You want a non-CLI adapter path (no Codex/Claude/OpenCode process spawn).

## Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `baseUrl` | string | No | Cerebrouter base URL. Default: `CEREBROUTER_BASE_URL` or `http://127.0.0.1:7777` |
| `apiKey` | string | No* | Router bearer token. If omitted, adapter reads `apiKeyEnvVar` |
| `apiKeyEnvVar` | string | No | Env var name for API key. Default: `ROUTER_API_KEY` |
| `model` | string | No | Model ID for `/v1/chat/completions`. Default: `gpt-oss-120b` |
| `promptTemplate` | string | No | User prompt template for each run |
| `systemPrompt` | string | No | Optional system instruction |
| `timeoutSec` | number | No | Request timeout seconds. Default: `120` |
| `temperature` | number | No | Forwarded to chat completions |
| `maxTokens` | number | No | Forwarded as `max_tokens` |

`*` one of `apiKey` or `ROUTER_API_KEY` must be provided.

## Docker Notes

If Paperclip server runs in Docker, avoid `localhost` for cross-container calls.
Use the Cerebrouter service name as host:

- Paperclip adapter `baseUrl`: `http://cerebrouter:7777`
- Or set server env `CEREBROUTER_BASE_URL=http://cerebrouter:7777` and leave adapter `baseUrl` empty
- Paperclip server env: `ROUTER_API_KEY=<your-router-key>`

Example `docker-compose` service snippet:

```yaml
services:
  paperclip:
    environment:
      ROUTER_API_KEY: ${ROUTER_API_KEY}
      CEREBROUTER_BASE_URL: http://cerebrouter:7777
    # ...

  cerebrouter:
    image: <your-cerebrouter-image>
    ports:
      - "7777:7777"
```

## Environment Test

The adapter test in UI checks:

1. URL validity
2. API key availability (`apiKey` or `ROUTER_API_KEY`)
3. Reachability of `GET /health`
4. Reachability/catalog of `GET /v1/models`
5. Whether configured `model` exists in the returned catalog
