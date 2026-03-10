import type { Db } from "@paperclipai/db";
import { heartbeatRunEvents } from "@paperclipai/db";
import type { StderrStats } from "@paperclipai/shared";
import { and, desc, inArray, sql } from "drizzle-orm";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNonNegativeInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0) return null;
  return Math.trunc(value);
}

function readStderrStats(value: unknown): StderrStats | null {
  const record = asRecord(value);
  if (!record) return null;

  const benignCount = asNonNegativeInt(record.benignCount);
  const errorCount = asNonNegativeInt(record.errorCount);
  const totalCount = asNonNegativeInt(record.totalCount);
  if (benignCount === null || errorCount === null || totalCount === null) return null;

  return {
    benignCount,
    errorCount,
    totalCount,
  };
}

export async function loadHeartbeatRunStderrStats(db: Db, runIds: string[]): Promise<Map<string, StderrStats>> {
  const uniqueRunIds = Array.from(
    new Set(runIds.map((id) => id.trim()).filter((id) => id.length > 0)),
  );
  if (uniqueRunIds.length === 0) return new Map();

  const events = await db
    .select({
      runId: heartbeatRunEvents.runId,
      payload: heartbeatRunEvents.payload,
      seq: heartbeatRunEvents.seq,
    })
    .from(heartbeatRunEvents)
    .where(
      and(
        inArray(heartbeatRunEvents.runId, uniqueRunIds),
        sql`${heartbeatRunEvents.payload} ? 'stderrStats'`,
      ),
    )
    .orderBy(desc(heartbeatRunEvents.seq));

  const stderrStatsByRunId = new Map<string, StderrStats>();
  for (const event of events) {
    if (stderrStatsByRunId.has(event.runId)) continue;
    const payload = asRecord(event.payload);
    const stderrStats = readStderrStats(payload?.stderrStats);
    if (!stderrStats) continue;
    stderrStatsByRunId.set(event.runId, stderrStats);
  }

  return stderrStatsByRunId;
}
