#!/usr/bin/env bash
set -euo pipefail

target_home="${PAPERCLIP_HOME:-/paperclip}"
allow_root_fallback="${PAPERCLIP_ALLOW_ROOT_RUNTIME_ON_PERM_FAILURE:-true}"

probe_node_write() {
  local probe_dir="$1"
  local probe_file="${probe_dir}/.paperclip-write-test.$$"
  gosu node sh -lc "mkdir -p \"$probe_dir\" && : > \"$probe_file\" && rm -f \"$probe_file\""
}

if [[ "$(id -u)" -eq 0 ]]; then
  mkdir -p "$target_home"

  if ! probe_node_write "$target_home"; then
    echo "[paperclip-entrypoint] '$target_home' is not writable for node; attempting permission fix..."
    chown -R node:node "$target_home" 2>/dev/null || true
  fi

  if probe_node_write "$target_home"; then
    exec gosu node "$@"
  fi

  if [[ "$allow_root_fallback" == "true" ]]; then
    echo "[paperclip-entrypoint] WARN: could not make '$target_home' writable for node; starting as root to keep service available."
    exec "$@"
  fi

  echo "[paperclip-entrypoint] ERROR: '$target_home' is not writable for node and root fallback is disabled."
  echo "[paperclip-entrypoint] Set a writable volume or enable fallback with PAPERCLIP_ALLOW_ROOT_RUNTIME_ON_PERM_FAILURE=true."
  exit 70
fi

exec "$@"
