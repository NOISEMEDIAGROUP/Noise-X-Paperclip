#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export PAPERCLIP_REPO_ROOT="$REPO_ROOT"
export PAPERCLIP_HOME="$REPO_ROOT/.paperclip-local"
export PAPERCLIP_INSTANCE_ID="default"
export PAPERCLIP_CONFIG="$PAPERCLIP_HOME/instances/$PAPERCLIP_INSTANCE_ID/config.json"
export PAPERCLIP_CONTEXT="$PAPERCLIP_HOME/context.json"

mkdir -p "$PAPERCLIP_HOME/instances/$PAPERCLIP_INSTANCE_ID"

ENV_FILE="$PAPERCLIP_HOME/instances/$PAPERCLIP_INSTANCE_ID/.env"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi
