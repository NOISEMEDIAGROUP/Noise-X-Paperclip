#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/env.sh"

ENV_FILE="$PAPERCLIP_HOME/instances/$PAPERCLIP_INSTANCE_ID/.env"
mkdir -p "$(dirname "$ENV_FILE")"
touch "$ENV_FILE"
chmod 600 "$ENV_FILE"

die() {
  echo "[ERROR] $*" >&2
  exit 1
}

validate_optional_openai_key() {
  local key_value="$1"
  [[ -z "$key_value" ]] && return 0
  [[ "$key_value" =~ ^sk-[A-Za-z0-9._-]{10,}$ ]]
}

validate_optional_anthropic_key() {
  local key_value="$1"
  [[ -z "$key_value" ]] && return 0
  [[ "$key_value" =~ ^sk-ant-[A-Za-z0-9._-]{10,}$ ]]
}

tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

# Keep existing vars except provider keys (we rewrite those).
awk '
  BEGIN { FS="=" }
  /^[[:space:]]*OPENAI_API_KEY=/ { next }
  /^[[:space:]]*ANTHROPIC_API_KEY=/ { next }
  { print }
' "$ENV_FILE" > "$tmp_file"

echo "Guardar llaves localmente en: $ENV_FILE"
echo "Deja en blanco si no quieres configurar una de ellas."
echo "La entrada es visible mientras escribes."

read -r -p "OPENAI_API_KEY: " openai_key
read -r -p "ANTHROPIC_API_KEY: " anthropic_key

validate_optional_openai_key "$openai_key" || die "OPENAI_API_KEY invalida: debe empezar con 'sk-' y usar solo [A-Za-z0-9._-]"
validate_optional_anthropic_key "$anthropic_key" || die "ANTHROPIC_API_KEY invalida: debe empezar con 'sk-ant-' y usar solo [A-Za-z0-9._-]"

{
  cat "$tmp_file"
  if [[ -n "${openai_key}" ]]; then
    printf "OPENAI_API_KEY=%s\n" "$openai_key"
  fi
  if [[ -n "${anthropic_key}" ]]; then
    printf "ANTHROPIC_API_KEY=%s\n" "$anthropic_key"
  fi
} > "$ENV_FILE"

chmod 600 "$ENV_FILE"
echo "Listo. Reinicia con: ./ops/local/run.sh"
