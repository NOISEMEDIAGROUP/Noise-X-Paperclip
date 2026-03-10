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
report="$run_dir/reports/aggregation.md"
mkdir -p "$run_dir/reports"

task_board="$run_dir/task-board.yaml"
pending_count="0"
in_progress_count="0"
completed_count="0"
blocked_count="0"

if [ -f "$task_board" ]; then
  pending_count="$(awk '/status:[[:space:]]*pending/{c++} END{print c+0}' "$task_board")"
  in_progress_count="$(awk '/status:[[:space:]]*in_progress/{c++} END{print c+0}' "$task_board")"
  completed_count="$(awk '/status:[[:space:]]*completed/{c++} END{print c+0}' "$task_board")"
  blocked_count="$(awk '/status:[[:space:]]*blocked/{c++} END{print c+0}' "$task_board")"
fi

{
  echo "# Swarm Aggregation Report"
  echo
  echo "- Run ID: $(basename "$run_dir")"
  echo "- Generated at (UTC): $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo

  echo "## Task Status Summary"
  echo
  echo "- Pending: ${pending_count}"
  echo "- In Progress: ${in_progress_count}"
  echo "- Completed: ${completed_count}"
  echo "- Blocked: ${blocked_count}"
  echo

  echo "## Agent Reports"
  echo

  found=0
  for f in "$run_dir"/agents/*/report.md; do
    if [ -f "$f" ]; then
      found=1
      agent_name="$(basename "$(dirname "$f")")"
      echo "### ${agent_name}"
      echo
      cat "$f"
      echo
    fi
  done

  if [ "$found" -eq 0 ]; then
    echo "No per-agent reports found yet."
    echo
  fi
} > "$report"

printf 'Aggregation report generated: %s\n' "$report"
