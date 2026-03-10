#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TEMPLATE_DIR="$ROOT_DIR/doc/templates"
SWARM_ROOT="${PAPERCLIP_SWARM_ROOT:-$ROOT_DIR/.paperclip-local/swarm}"

run_id="${1:-}"
if [ -z "$run_id" ]; then
  run_id="$(date -u +"%Y%m%dT%H%M%SZ")"
fi

run_dir="$SWARM_ROOT/$run_id"
mkdir -p "$run_dir" "$run_dir/agents" "$run_dir/tasks" "$run_dir/reports"

cp "$TEMPLATE_DIR/swarm-analysis.md" "$run_dir/analysis.md"
cp "$TEMPLATE_DIR/swarm-plan.md" "$run_dir/plan.md"
cp "$TEMPLATE_DIR/swarm-task-board.yaml" "$run_dir/task-board.yaml"
cp "$TEMPLATE_DIR/swarm-release-checklist.md" "$run_dir/release-checklist.md"
cp "$TEMPLATE_DIR/swarm-aggregation-report.md" "$run_dir/reports/aggregation.md"
cp "$TEMPLATE_DIR/swarm-integration-report.md" "$run_dir/reports/integration-report.md"
cp "$TEMPLATE_DIR/swarm-agent-report.md" "$run_dir/agents/_report-template.md"

cat > "$run_dir/README.md" <<RUNINFO
# Swarm Run Workspace

- run_id: $run_id
- root: $run_dir

## Next Steps

1. Fill \`analysis.md\` and \`plan.md\`.
2. Update \`task-board.yaml\`.
3. Run \`pnpm swarm:split $run_id\` to generate per-agent inbox files.
4. Agents write reports in \`agents/<agent-id>/report.md\`.
5. Run \`pnpm swarm:collect $run_id\` and \`pnpm swarm:integrate $run_id\`.
6. Run \`pnpm swarm:verify $run_id --full\`.
7. Run \`pnpm swarm:deliver $run_id\`.
RUNINFO

printf 'Swarm workspace initialized:\n- run_id: %s\n- dir: %s\n' "$run_id" "$run_dir"
