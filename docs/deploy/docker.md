---
title: Docker
summary: Docker Compose quickstart
---

Run Paperclip in Docker without installing Node or pnpm locally.

## Compose Quickstart (Recommended)

```sh
docker compose -f docker-compose.quickstart.yml up --build
```

Open [http://localhost:3100](http://localhost:3100).

Defaults:

- Host port: `3100`
- Data directory: `./data/docker-paperclip`
- Restart policy: `unless-stopped`
- Healthcheck: `GET /api/health`

Override with environment variables:

```sh
PAPERCLIP_PORT=3200 PAPERCLIP_DATA_DIR=./data/pc \
  docker compose -f docker-compose.quickstart.yml up --build
```

`PAPERCLIP_DATA_DIR` may be either a bind-mount path (default) or a Docker volume name.

## Server-Only Compose (API)

Run only the Paperclip API server and Postgres in Docker:

```sh
docker compose -f docker-compose.server.yml up --build
```

This uses `SERVE_UI=false`, so the container serves API endpoints only.
Both `db` and `server` are configured with restart policy `unless-stopped`, and `server` has a healthcheck on `/api/health`.

Quick checks:

```sh
curl http://localhost:3100/api/health
curl http://localhost:3100/api/companies
```

## Manual Docker Build

```sh
docker build -t paperclip-local .
docker run --name paperclip \
  -u "$(id -u):$(id -g)" \
  -p 3100:3100 \
  -e HOST=0.0.0.0 \
  -e PAPERCLIP_HOME=/paperclip \
  -v "$(pwd)/data/docker-paperclip:/paperclip" \
  paperclip-local
```

## Data Persistence

All data is persisted under your mounted `/paperclip` path:

- Embedded PostgreSQL data
- Uploaded assets
- Local secrets key
- Agent workspace data

## Claude and Codex Adapters in Docker

The Docker image pre-installs:

- `claude` (Anthropic Claude Code CLI)
- `codex` (OpenAI Codex CLI)

Pass API keys to enable local adapter runs inside the container:

```sh
docker run --name paperclip \
  -u "$(id -u):$(id -g)" \
  -p 3100:3100 \
  -e HOST=0.0.0.0 \
  -e PAPERCLIP_HOME=/paperclip \
  -e OPENAI_API_KEY=sk-... \
  -e ANTHROPIC_API_KEY=sk-... \
  -v "$(pwd)/data/docker-paperclip:/paperclip" \
  paperclip-local
```

Without API keys, the app runs normally — adapter environment checks will surface missing prerequisites.
