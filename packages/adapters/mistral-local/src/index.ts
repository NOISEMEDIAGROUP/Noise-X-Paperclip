export const MISTRAL_LOCAL_ADAPTER_TYPE = "mistral_local" as const;

export const DEFAULT_MISTRAL_MODEL = "mistral-medium-latest";

export const models = [
  { id: "mistral-medium-latest", label: "Mistral Medium (latest) — Pool 3: no monthly cap, 375K tok/min" },
  { id: "devstral-latest", label: "Devstral (latest) — Pool 7: 1M tok/min, 1B/month, best for coding" },
  { id: "mistral-large-2411", label: "Mistral Large 2411 — Pool 2: ~unlimited monthly" },
  { id: "magistral-medium-latest", label: "Magistral Medium — Pool 6: chain-of-thought reasoning" },
  { id: "magistral-small-latest", label: "Magistral Small — Pool 5: lightweight reasoning" },
  { id: "mistral-small-latest", label: "Mistral Small (latest) — Pool 1: 4M tok/month shared, use sparingly" },
  { id: "mistral-large-latest", label: "Mistral Large (latest) — Pool 1: 4M tok/month shared, use sparingly" },
];

export const agentConfigurationDoc = `# mistral_local agent configuration

Adapter: mistral_local

Use when:
- You want Paperclip to call the Mistral API directly on each heartbeat
- You want to use Mistral models without a local CLI install
- You have a MISTRAL_API_KEY available in the environment

Don't use when:
- You need a full local agentic loop with file edits and tool use (use claude_local or opencode_local)
- You need webhook-style external invocation (use openclaw_gateway or http)

## Model Selection Guide (Free Tier Quota Pools)

Mistral's free tier organizes models into independent quota pools. Choosing the wrong model can burn
your monthly budget quickly. Recommended choices:

| Use Case | Model | Pool | Monthly Limit |
|----------|-------|------|---------------|
| General tasks (recommended default) | mistral-medium-latest | 3 | No monthly cap |
| Coding & agentic dev | devstral-latest | 7 | 1B tokens |
| Complex reasoning / planning | magistral-medium-latest | 6 | 1B tokens |
| Lightweight reasoning | magistral-small-latest | 5 | 1B tokens |
| Legacy / high volume | mistral-large-2411 | 2 | ~unlimited |
| Avoid unless necessary | mistral-small-latest, mistral-large-latest | 1 | 4M tokens shared |

⚠️ Pool 1 (mistral-small-latest, mistral-large-latest, codestral-latest) shares only 4 million
tokens per month across 11+ models. It's the easiest pool to exhaust accidentally. Prefer
mistral-medium-latest or devstral-latest for sustained workloads.

## Core fields:
- model (string, optional): Mistral model id. Defaults to mistral-medium-latest.
- promptTemplate (string, optional): run prompt template
- maxTokens (number, optional): maximum tokens to generate (default: 4096)
- cwd (string, optional): working directory context passed to the model
- env (object, optional): KEY=VALUE environment variables

## Notes:
- MISTRAL_API_KEY must be set in the environment or in the env config field.
- Mistral's API endpoint is OpenAI-compatible: https://api.mistral.ai/v1
- The free tier enforces a hard global limit of 1 request per second per API key.
- Each heartbeat sends a fresh request; sessions are not resumed across heartbeats.
`;
