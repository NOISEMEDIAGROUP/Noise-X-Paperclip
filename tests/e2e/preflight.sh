#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
E2E_DATA_DIR="${ROOT_DIR}/tests/e2e/.paperclip-data"
E2E_PORT="${PAPERCLIP_E2E_PORT:-3105}"

# Port checks rely on lsof. Some minimal environments might not have it; in
# that case, skip preflight and let the server start fail naturally if needed.
if ! command -v lsof >/dev/null 2>&1; then
  echo "Warning: 'lsof' not found; skipping E2E port preflight." >&2
  exit 0
fi

# Playwright's `webServer` refuses to start when the port is already in use
# (when `reuseExistingServer` is false). Preflight ensures the port is free so
# `start-server.sh` can deterministically start a clean instance.
existing_pid="$(lsof -nP -iTCP:"${E2E_PORT}" -sTCP:LISTEN -t 2>/dev/null | head -n 1 || true)"
if [ -n "${existing_pid}" ]; then
  existing_cmd="$(ps -p "${existing_pid}" -o command= 2>/dev/null || true)"
  if [[ "${existing_cmd}" == *"${E2E_DATA_DIR}"* ]]; then
    kill "${existing_pid}" 2>/dev/null || true

    # Wait briefly for the port to be released.
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      if ! lsof -nP -iTCP:"${E2E_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
        break
      fi
      sleep 0.1
    done
  else
    echo "E2E port ${E2E_PORT} is already in use by:" >&2
    echo "  ${existing_cmd}" >&2
    echo "Set PAPERCLIP_E2E_PORT to a free port and retry." >&2
    exit 1
  fi
fi
