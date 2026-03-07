# Paperclip Slack Bot

This workspace package contains the Slack + Codex runtime that is currently bridged to Paperclip.

It preserves the current behavior:

- Slack assistant replies through the local Codex CLI
- explicit `@paperclip task:` issue creation
- Paperclip project and agent alias mapping
- Slack thread <-> Paperclip issue linking
- high-signal Paperclip updates mirrored back into Slack
- child Paperclip issues creating their own Slack threads

## Local development

From the repo root:

```bash
pnpm dev:server
pnpm dev:slack-bot
```

Or run both together:

```bash
PAPERCLIP_SLACK_ENABLED=true pnpm dev:stack
```

The Slack bot reads configuration from environment variables or `slack-codex.config.json` in this package directory.

Important defaults for this monorepo:

- `CODEX_WORKDIR=../..` in `.env.example`
- `PAPERCLIP_API_URL=http://127.0.0.1:3100`
- `SLACK_PORT=3000`

## Docker

The root `Dockerfile` now supports running Paperclip and this Slack bot in one image.

Build and run the combined stack with:

```bash
PAPERCLIP_SLACK_ENABLED=true docker compose -f docker-compose.slack.yml up --build
```

Required environment variables for the Slack side:

- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN` for socket mode
- `SLACK_SIGNING_SECRET` for HTTP mode
- `PAPERCLIP_COMPANY_ID` if you want the Paperclip bridge enabled immediately

The image already includes the Codex CLI, but the Slack runtime still requires a valid Codex login. Because the container uses `HOME=/paperclip`, you can either:

- persist `/paperclip/.codex` in the mounted volume, or
- run `docker exec -it <container> codex login` once after startup

## Package commands

```bash
pnpm --filter @paperclipai/slack-bot start
pnpm --filter @paperclipai/slack-bot check
pnpm --filter @paperclipai/slack-bot test
```
