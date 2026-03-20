# OpenClaw Company Bootstrap (Paperclip)

This script creates a new Paperclip company and hires a starter team of OpenClaw-backed agents:

- Board-CTO
- Engineer-01
- QA-01
- Research-01

All agents are configured with `adapterType: openclaw_gateway` and inherit the same gateway credentials.

## Prerequisites

- Paperclip API running (default: `http://127.0.0.1:3100`)
- Logged in to Paperclip UI and have a valid session cookie
- OpenClaw gateway URL + token

## Usage

```bash
cd /path/to/paperclip

PAPERCLIP_COOKIE='better-auth.session_token=...' \
OPENCLAW_GATEWAY_URL='ws://127.0.0.1:18789' \
OPENCLAW_GATEWAY_TOKEN='YOUR_GATEWAY_TOKEN' \
pnpm exec tsx scripts/bootstrap-openclaw-company.ts
```

## Optional flags

- `--base-url=http://127.0.0.1:3100`
- `--company-name='PrimalSpark AI Ops'`
- `--company-description='Orchestrated OpenClaw workforce'`
- `--company-budget-cents=100000`
- `--gateway-url=ws://127.0.0.1:18789`
- `--gateway-token=...`
- `--model=gpt-5.3-codex`

## Output

On success, prints JSON with:

- `companyId`
- created `agents` (id + name)
- `baseUrl`

## Notes

- This is a fast-start baseline. You should still review each agent's budget and permissions.
- For production, use unique gateway tokens per environment and rotate secrets regularly.
