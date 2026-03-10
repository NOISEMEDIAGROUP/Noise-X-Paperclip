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
summary="$run_dir/reports/delivery-summary.md"

required=(
  "$run_dir/analysis.md"
  "$run_dir/plan.md"
  "$run_dir/task-board.yaml"
  "$run_dir/reports/aggregation.md"
  "$run_dir/reports/integration-report.md"
  "$run_dir/reports/verification.md"
  "$run_dir/release-checklist.md"
)

missing=0
for f in "${required[@]}"; do
  if [ ! -f "$f" ]; then
    echo "Missing required artifact: $f" >&2
    missing=1
  fi
done

if [ "$missing" -ne 0 ]; then
  echo "Delivery bundle generation aborted due to missing artifacts." >&2
  exit 1
fi

verification_status="UNKNOWN"
if rg -q "❌ fail" "$run_dir/reports/verification.md"; then
  verification_status="FAILED"
elif rg -q "✅ pass" "$run_dir/reports/verification.md"; then
  verification_status="PASSED"
fi

{
  echo "# Swarm Delivery Summary"
  echo
  echo "- Run ID: $(basename "$run_dir")"
  echo "- Generated at (UTC): $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "- Verification status: ${verification_status}"
  echo
  echo "## Artifact Index"
  echo
  for f in "${required[@]}"; do
    rel="${f#$run_dir/}"
    echo "- \`${rel}\`"
  done
  echo
  echo "## Ship Decision"
  echo
  if [ "$verification_status" = "PASSED" ]; then
    echo "- Recommendation: **GO** (all recorded checks passed)."
  else
    echo "- Recommendation: **NO-GO** until failed checks or blockers are resolved."
  fi
  echo
  echo "## Rollback Path"
  echo
  echo "- Revert integration commit set."
  echo "- Re-deploy last known-good image/config."
  echo "- Re-run verification checks against rollback state."
} > "$summary"

printf 'Delivery summary generated: %s\n' "$summary"
