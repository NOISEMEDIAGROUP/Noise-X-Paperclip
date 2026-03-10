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

run_dir="$(resolve_run_dir "${1:-}")"
report="$run_dir/reports/integration-report.md"
mkdir -p "$run_dir/reports"

changed_files="$(git -C "$ROOT_DIR" status --short | awk '{print $2}' || true)"

{
  echo "# Swarm Integration Report"
  echo
  echo "- Run ID: $(basename "$run_dir")"
  echo "- Generated at (UTC): $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo

  echo "## Integrated Changes (working tree snapshot)"
  echo
  if [ -n "$changed_files" ]; then
    echo "$changed_files" | sed 's/^/- `/' | sed 's/$/`/'
  else
    echo "- No local changes detected."
  fi
  echo

  echo "## Contract Sync Checks"
  echo
  echo "- [ ] packages/db changed and exports/migrations validated"
  echo "- [ ] packages/shared changed and API/type constants synced"
  echo "- [ ] server routes/services aligned with shared contract"
  echo "- [ ] ui/cli clients aligned with API behavior"
  echo

  echo "## Compatibility and Risk"
  echo
  echo "- Backward compatibility impact:"
  echo "- Data damage risk (Low/Medium/High):"
  echo "- Privilege escalation risk (Low/Medium/High):"
  echo "- Performance regression risk (Low/Medium/High):"
  echo "- Deployment rollback risk (Low/Medium/High):"
} > "$report"

printf 'Integration report generated: %s\n' "$report"
