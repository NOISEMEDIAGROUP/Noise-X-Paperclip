# Model Routing Profiles

Status: default Alibaba-first routing guidance for the lean 8-role Paperclip company.

Use this file with:

- `doc/OPERATING-PLAYBOOK.md`
- `doc/AGENT-ROLE-TEMPLATES.md`

This document assumes the company is being run with Alibaba Cloud as the primary
provider for compatible process agents. OpenAI remains a fallback and reference path,
not the default operating profile for this playbook.

## 1) Routing Principles

Use these rules first:

- route models role-by-role, not fleet-wide by default
- optimize for reliability and role fit, not novelty
- canary every model change before wider rollout
- keep secret bindings as `secret_ref`, never plaintext
- change one role profile at a time unless you are doing a controlled rebuild

## 2) Provider Secret Names

Paperclip expects these provider secret names:

- Alibaba DashScope: `provider-alibaba-api-key`
- OpenAI: `provider-openai-api-key`
- Anthropic: `provider-anthropic-api-key`
- Groq: `provider-groq-api-key`
- xAI: `provider-xai-api-key`
- MiniMax: `provider-minimax-api-key`

For this playbook, the critical secret is:

- Alibaba DashScope: `provider-alibaba-api-key`

Set secrets in Company Settings before enabling heartbeat.

## 3) Default Env Keys For Process Agents

For Alibaba-routed process agents, set:

- `MODEL_PROVIDER`
- `MODEL_BASE_URL`
- `MODEL_NAME`

And wire API keys as secret refs:

- `ALIBABA_API_KEY`
- `DASHSCOPE_API_KEY`

Recommended base URL:

- `https://coding-intl.dashscope.aliyuncs.com/v1`

## 4) Alibaba-First Default Role Map

Use this as the default routing table for the lean 8-role company.

| Role | Primary | Fallback | Why |
| --- | --- | --- | --- |
| CEO | `MiniMax-M2.5` | `qwen3.5-plus` | concise strategic synthesis and executive communication |
| CTO | `qwen3-coder-plus` | `qwen3-max-2026-01-23` | technical decomposition, architecture, implementation guidance |
| CPO | `qwen3.5-plus` | `MiniMax-M2.5` | product framing, UX reasoning, acceptance criteria quality |
| CSO | `glm-5` | `qwen3-coder-plus` | risk review, threat-oriented thinking, defensive checks |
| PM | `qwen3.5-plus` | `qwen3-coder-next` | issue decomposition, sequencing, and coordination clarity |
| Builder Engineer | `qwen3-coder-plus` | `qwen3-coder-next` | main implementation role |
| QA Engineer | `glm-4.7` | `qwen3.5-plus` | deterministic review, repro quality, disciplined verification |
| Release/Ops | `qwen3-coder-plus` | `qwen3.5-plus` | rollout steps, environment checks, and release prep |

## 5) Why This Is The Default

This profile is optimized for Paperclip's current practical path:

- Alibaba works cleanly with `process` agents in this setup
- role quality is improved by matching models to the role's main task
- the routing table stays small enough to reason about
- fallback models are chosen to preserve continuity without full reconfiguration

Do not overcomplicate routing on day 1. Stable role fit is better than provider churn.

## 6) Canary Rollout Policy

Never mass-swap models across the entire company by default.

Use this rollout procedure:

1. Change one role's primary model.
2. Apply it to one canary agent in that role.
3. Run representative heartbeat or assigned-issue checks.
4. Review output quality, latency, retries, and failures.
5. Roll out to the remaining agents in that role only if the canary is clean.
6. Move to the next role after the previous role is stable.

Operator rule:

- role-by-role rollout is the default
- fleet-wide apply is an exception and should be treated as risky

## 7) Alibaba Compatibility Notes

Current Paperclip operating reality:

- Alibaba routing is the primary path for `process` adapters
- `process` agents can use `MODEL_PROVIDER=alibaba` with the Coding Plan base URL
- bulk or UI-based Alibaba apply should only target compatible agents
- `codex_local` remains better aligned to OpenAI-compatible routing today

This means:

- use Alibaba as the default provider for the lean 8-role company where those agents are process-backed
- keep OpenAI available as a fallback/reference path, especially for `codex_local`

## 8) OpenAI Fallback Notes

OpenAI is not the default for this playbook, but it remains useful as a fallback.

Use OpenAI when:

- a role's Alibaba primary model becomes unstable
- you need a temporary fallback for a canary failure
- you are running a `codex_local` workflow that still assumes OpenAI-compatible behavior

Fallback guideline:

- preserve the same role boundaries and operating flow
- only switch the provider/model path, not the org design or prompt contract

## 9) CLI Examples

Alibaba role-targeted example:

```sh
node scripts/configure-model-routing.mjs \
  --company-id <company-id> \
  --provider alibaba \
  --model qwen3-coder-plus \
  --agent CTO \
  --agent BuilderEngineer
```

Alibaba dry-run:

```sh
node scripts/configure-model-routing.mjs \
  --company-id <company-id> \
  --provider alibaba \
  --model qwen3-coder-plus \
  --dry-run
```

OpenAI fallback example:

```sh
node scripts/configure-model-routing.mjs \
  --company-id <company-id> \
  --provider openai \
  --model gpt-5.4 \
  --agent CTO
```

## 10) Verification Checklist

After changing a role profile:

1. Detect models in Company Settings for the selected provider.
2. Confirm the target agent has the expected `MODEL_PROVIDER`, `MODEL_BASE_URL`, and `MODEL_NAME`.
3. Confirm key bindings are still secret refs.
4. Run one canary heartbeat or one assigned-issue execution.
5. Review logs, latency, output quality, and failure patterns.
6. Roll out only after the canary proves stable.

## 11) Operator Defaults

Use these defaults unless there is a reason not to:

- Alibaba-first company
- lean 8-role routing table
- canary before role-wide rollout
- no fleet-wide model changes by default
- OpenAI retained as fallback/reference only
