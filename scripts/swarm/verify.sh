#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SWARM_ROOT="${PAPERCLIP_SWARM_ROOT:-$ROOT_DIR/.paperclip-local/swarm}"

resolve_run_dir() {
  local input="${1:-}"
  if [ -n "$input" ] && [ -d "$SWARM_ROOT/$input" ]; then
    echo "$SWARM_ROOT/$input"
    return
  fi
  local latest
  latest="$(ls -1dt "$SWARM_ROOT"/* 2>/dev/null | head -n 1 || true)"
  if [ -z "$latest" ]; then
    echo "No swarm run found. Run: pnpm swarm:init" >&2
    exit 1
  fi
  echo "$latest"
}

run_id_arg="${1:-}"
mode="quick"
if [ "${2:-}" = "--full" ] || [ "${1:-}" = "--full" ]; then
  mode="full"
  if [ "$run_id_arg" = "--full" ]; then
    run_id_arg=""
  fi
fi

run_dir="$(resolve_run_dir "$run_id_arg")"
mkdir -p "$run_dir/reports"
log_file="$run_dir/reports/verification.log"
report_file="$run_dir/reports/verification.md"

: > "$log_file"

overall=0

run_check() {
  local name="$1"
  local cmd="$2"

  {
    echo
    echo ">>> ${name}"
    echo "$ ${cmd}"
  } >> "$log_file"

  if (cd "$ROOT_DIR" && bash -lc "$cmd") >> "$log_file" 2>&1; then
    printf '| %s | ✅ pass | `%s` |\n' "$name" "$cmd" >> "$report_file"
  else
    printf '| %s | ❌ fail | `%s` |\n' "$name" "$cmd" >> "$report_file"
    overall=1
  fi
}

{
  echo "# Swarm Verification Report"
  echo
  echo "- Run ID: $(basename "$run_dir")"
  echo "- Mode: ${mode}"
  echo "- Generated at (UTC): $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo
  echo "## Command Results"
  echo
  echo "| Check | Result | Command |"
  echo "|---|---|---|"
} > "$report_file"

run_check "Typecheck" "pnpm -r typecheck"
run_check "Build" "pnpm build"

if [ "$mode" = "full" ]; then
  run_check "Tests" "pnpm test:run"
else
  run_check "Targeted server tests" "pnpm test:run server/src/__tests__/policy-engine.test.ts server/src/__tests__/openapi-spec.test.ts server/src/__tests__/metrics-middleware.test.ts"
fi

{
  echo
  echo "## Notes"
  echo
  if rg -q "listen EPERM" "$log_file"; then
    echo "- Detected listen EPERM in this environment. Socket-binding tests may be constrained in sandbox mode."
  else
    echo "- No sandbox socket-binding errors detected in command logs."
  fi
  echo "- Full logs: $log_file"
} >> "$report_file"

printf 'Verification report generated: %s\n' "$report_file"

exit "$overall"
