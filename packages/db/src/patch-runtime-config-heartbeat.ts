/**
 * ONE-TIME PATCH: Backfill runtimeConfig.heartbeat for all EVOHAUS AI agents
 *
 * Problem: Seed script created agents with metadata.heartbeat ("2h", "24h")
 * but NOT runtimeConfig.heartbeat.intervalSec (which the heartbeat scheduler reads).
 * Result: All agents had intervalSec=0 → heartbeat timer skipped every agent.
 *
 * Run: npx tsx packages/db/src/patch-runtime-config-heartbeat.ts
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL!;
if (!url) throw new Error("DATABASE_URL is required");

const COMPANY_ID = "e4f86ad5-bcdd-4ac9-9972-11ed5f6c7820";

async function main() {
  const sql = postgres(url);
  console.log("EVOHAUS AI — Heartbeat Config Patch\n");

  // -------------------------------------------------------------------------
  // 1. Patch agents that have metadata.heartbeat string (CEO, C-Level, Leads)
  // -------------------------------------------------------------------------
  const withMetaHb = await sql`
    UPDATE agents
    SET runtime_config = jsonb_set(
      COALESCE(runtime_config, '{}'::jsonb),
      '{heartbeat}',
      jsonb_build_object(
        'enabled', true,
        'intervalSec', CASE
          WHEN metadata->>'heartbeat' ~ '^\d+h$' THEN
            (regexp_replace(metadata->>'heartbeat', '[^0-9]', '', 'g'))::int * 3600
          WHEN metadata->>'heartbeat' ~ '^\d+m$' THEN
            (regexp_replace(metadata->>'heartbeat', '[^0-9]', '', 'g'))::int * 60
          WHEN metadata->>'heartbeat' ~ '^\d+s$' THEN
            (regexp_replace(metadata->>'heartbeat', '[^0-9]', '', 'g'))::int
          ELSE 0
        END,
        'wakeOnDemand', true,
        'maxConcurrentRuns', 1
      )
    ),
    updated_at = NOW()
    WHERE company_id = ${COMPANY_ID}
      AND metadata->>'heartbeat' IS NOT NULL
      AND (runtime_config IS NULL OR runtime_config->'heartbeat'->>'intervalSec' IS NULL)
  `;
  console.log(`[1] Patched agents with metadata.heartbeat: ${withMetaHb.count}`);

  // -------------------------------------------------------------------------
  // 2. Patch team members (claude_local, level=team) → default 1h heartbeat
  // -------------------------------------------------------------------------
  const teamPatch = await sql`
    UPDATE agents
    SET runtime_config = jsonb_set(
      COALESCE(runtime_config, '{}'::jsonb),
      '{heartbeat}',
      '{"enabled": true, "intervalSec": 3600, "wakeOnDemand": true, "maxConcurrentRuns": 1}'::jsonb
    ),
    metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{heartbeat}', '"1h"'),
    updated_at = NOW()
    WHERE company_id = ${COMPANY_ID}
      AND metadata->>'level' = 'team'
      AND (runtime_config IS NULL OR runtime_config->'heartbeat'->>'intervalSec' IS NULL)
  `;
  console.log(`[2] Patched team agents (1h default): ${teamPatch.count}`);

  // -------------------------------------------------------------------------
  // 3. Patch operational agents → wakeOnDemand only (intervalSec=0)
  // -------------------------------------------------------------------------
  const opsPatch = await sql`
    UPDATE agents
    SET runtime_config = jsonb_set(
      COALESCE(runtime_config, '{}'::jsonb),
      '{heartbeat}',
      '{"enabled": true, "intervalSec": 0, "wakeOnDemand": true, "maxConcurrentRuns": 1}'::jsonb
    ),
    updated_at = NOW()
    WHERE company_id = ${COMPANY_ID}
      AND metadata->>'level' = 'operational'
      AND (runtime_config IS NULL OR runtime_config->'heartbeat'->>'intervalSec' IS NULL)
  `;
  console.log(`[3] Patched operational agents (wakeOnDemand only): ${opsPatch.count}`);

  // -------------------------------------------------------------------------
  // 4. Check and reset circuit-breaker paused agents
  // -------------------------------------------------------------------------
  const cbPaused = await sql`
    SELECT id, name, pause_reason, paused_at
    FROM agents
    WHERE company_id = ${COMPANY_ID}
      AND status = 'paused'
      AND pause_reason LIKE 'circuit_breaker:%'
  `;
  if (cbPaused.length > 0) {
    console.log(`\n[4] Found ${cbPaused.length} circuit-breaker paused agents:`);
    for (const a of cbPaused) {
      console.log(`    - ${a.name} (${a.id}): ${a.pause_reason}`);
    }
    const cbReset = await sql`
      UPDATE agents
      SET status = 'idle',
          pause_reason = NULL,
          paused_at = NULL,
          updated_at = NOW()
      WHERE company_id = ${COMPANY_ID}
        AND status = 'paused'
        AND pause_reason LIKE 'circuit_breaker:%'
    `;
    console.log(`    Reset ${cbReset.count} agents`);
  } else {
    console.log(`[4] No circuit-breaker paused agents found`);
  }

  // -------------------------------------------------------------------------
  // 5. Report budget-paused agents (don't auto-reset, manual review needed)
  // -------------------------------------------------------------------------
  const budgetPaused = await sql`
    SELECT id, name, pause_reason, paused_at
    FROM agents
    WHERE company_id = ${COMPANY_ID}
      AND status = 'paused'
      AND pause_reason = 'budget'
  `;
  if (budgetPaused.length > 0) {
    console.log(`\n[5] WARNING: ${budgetPaused.length} budget-paused agents (manual review needed):`);
    for (const a of budgetPaused) {
      console.log(`    - ${a.name} (${a.id}): paused at ${a.paused_at}`);
    }
  } else {
    console.log(`[5] No budget-paused agents found`);
  }

  // -------------------------------------------------------------------------
  // 6. Summary report
  // -------------------------------------------------------------------------
  const summary = await sql`
    SELECT
      status,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE runtime_config->'heartbeat'->>'intervalSec' IS NOT NULL) as has_interval
    FROM agents
    WHERE company_id = ${COMPANY_ID}
    GROUP BY status
    ORDER BY count DESC
  `;
  console.log(`\n[6] Agent Status Summary:`);
  for (const row of summary) {
    console.log(`    ${row.status}: ${row.count} agents (${row.has_interval} with heartbeat config)`);
  }

  const intervalBreakdown = await sql`
    SELECT
      runtime_config->'heartbeat'->>'intervalSec' as interval_sec,
      metadata->>'level' as level,
      COUNT(*) as count
    FROM agents
    WHERE company_id = ${COMPANY_ID}
    GROUP BY interval_sec, level
    ORDER BY interval_sec DESC NULLS LAST
  `;
  console.log(`\n    Heartbeat interval breakdown:`);
  for (const row of intervalBreakdown) {
    const sec = row.interval_sec ?? "NULL";
    const hrs = row.interval_sec ? `(${(parseInt(row.interval_sec) / 3600).toFixed(1)}h)` : "";
    console.log(`    ${sec}s ${hrs} — ${row.level}: ${row.count}`);
  }

  await sql.end();
  console.log("\nDone!");
}

main().catch((err) => {
  console.error("PATCH FAILED:", err);
  process.exit(1);
});
