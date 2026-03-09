# Paperclip Ops (Local + Quick Server)

This setup keeps runtime state inside this repo, not in `~/Documents/PaperClipMain`.

## Paths

- Runtime root: `./.paperclip-local` (ignored by git)
- Runtime env file: `./.paperclip-local/instances/default/.env`
- Docker compose env file: `./.paperclip-local/docker-compose.env`
- Agent instruction profiles: `./ops/agents/*.md`

## Local Run (fast)

From repo root:

```bash
./ops/local/run.sh
```

Use CLI:

```bash
./ops/local/cli.sh issue list
./ops/local/cli.sh agent list -C 7334f5e0-4b0c-4d50-a96b-afe10c64b0fe
```

## Keys and Secrets

Edit:

```bash
./.paperclip-local/instances/default/.env
```

Add only if needed:

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

Or use the helper (visible input while typing):

```bash
./ops/local/set-secrets.sh
```

The helper fails fast if a key does not match the expected provider format.

Notes:

- Claude can run via `claude auth login` without `ANTHROPIC_API_KEY`.
- Codex can run via `codex login` without `OPENAI_API_KEY`.

## Quick Server Deploy (Docker)

One command (asks for secrets, stores locally, validates values, and boots compose):

```bash
./bootstrap-docker.sh
```

When authenticated mode starts with no instance admin yet, the script now generates the first bootstrap CEO invite automatically. In interactive mode it also opens that invite URL in your browser, so the Docker quickstart is a true one-click setup flow.

Persisted local files used by this flow:

- `./.paperclip-local/instances/default/.env` for provider keys
- `./.paperclip-local/docker-compose.env` for Docker compose settings such as `BETTER_AUTH_SECRET`, port, public URL, and data dir

If Docker is installed but its daemon is not running, the bootstrap script now offers to start an available runtime first (for example Docker Desktop, OrbStack, Colima, or Podman) and then continues with the normal prompts.

Action modes (switch/case):

```bash
./bootstrap-docker.sh up
./bootstrap-docker.sh restart
./bootstrap-docker.sh status
./bootstrap-docker.sh logs
./bootstrap-docker.sh down
```

Useful flags:

```bash
./bootstrap-docker.sh up --no-build
./bootstrap-docker.sh up -y --port 3200 --public-url http://localhost:3200
./bootstrap-docker.sh logs --no-tail
```

On a server with Docker (manual mode):

```bash
git clone https://github.com/paperclipai/paperclip.git
cd paperclip
docker compose -f docker-compose.quickstart.yml up --build -d
```

Optional env overrides:

```bash
PAPERCLIP_PORT=3100 PAPERCLIP_DATA_DIR=./data/docker-paperclip docker compose -f docker-compose.quickstart.yml up --build -d
```

For container-based key auth, pass env vars in compose or docker run (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`).
