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
task_board="$run_dir/task-board.yaml"

if [ ! -f "$task_board" ]; then
  echo "Missing task board: $task_board" >&2
  exit 1
fi

owners_and_tasks="$(awk '
  /^[[:space:]]*- id:/ {
    id=$3
    gsub(/"/, "", id)
    next
  }
  /^[[:space:]]*title:/ {
    title=substr($0, index($0, $2))
    gsub(/^"|"$/, "", title)
    next
  }
  /^[[:space:]]*owner_agent:/ {
    owner=$2
    gsub(/"/, "", owner)
    if (id != "" && owner != "") {
      print owner "\t" id "\t" title
      id=""
      title=""
    }
  }
' "$task_board")"

if [ -z "$owners_and_tasks" ]; then
  echo "No tasks parsed from task board. Keep YAML field names as: id/title/owner_agent." >&2
  exit 1
fi

while IFS=$'\t' read -r owner task_id task_title; do
  [ -z "$owner" ] && continue
  owner_dir="$run_dir/agents/$owner"
  mkdir -p "$owner_dir"
  inbox="$owner_dir/inbox.md"

  if [ ! -f "$inbox" ]; then
    cat > "$inbox" <<INBOX
# Agent Inbox

- Agent: $owner
- Run: $(basename "$run_dir")

## Assigned Tasks

INBOX
  fi

  if ! rg -q "^- ${task_id}:" "$inbox"; then
    printf -- '- %s: %s\n' "$task_id" "$task_title" >> "$inbox"
  fi

  task_file="$run_dir/tasks/${task_id}.md"
  if [ ! -f "$task_file" ]; then
    cat > "$task_file" <<TASK
# Task ${task_id}

- Owner: $owner
- Title: $task_title
- Status: pending

## Scope

-

## Acceptance Checks

-

## Execution Notes

-
TASK
  fi

done <<< "$owners_and_tasks"

printf 'Split complete for run %s\nGenerated inboxes under: %s/agents\n' "$(basename "$run_dir")" "$run_dir"
