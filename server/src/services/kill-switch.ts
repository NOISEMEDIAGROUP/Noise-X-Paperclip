import { and, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents, heartbeatRuns } from "@paperclipai/db";
import { runningProcesses } from "../adapters/index.js";
import { heartbeatService } from "./heartbeat.js";
import { logger } from "../middleware/logger.js";
import type { KillSwitchProcessInfo, KillSwitchStatus, KillAllResult } from "@paperclipai/shared";

export function killSwitchService(db: Db) {
  const heartbeat = heartbeatService(db);

  return {
    async getStatus(companyId: string): Promise<KillSwitchStatus> {
      const runs = await db
        .select({
          id: heartbeatRuns.id,
          agentId: heartbeatRuns.agentId,
          agentName: agents.name,
          status: heartbeatRuns.status,
          createdAt: heartbeatRuns.createdAt,
          issueId: sql<string | null>`${heartbeatRuns.contextSnapshot} ->> 'issueId'`.as("issueId"),
        })
        .from(heartbeatRuns)
        .innerJoin(agents, eq(heartbeatRuns.agentId, agents.id))
        .where(
          and(
            eq(agents.companyId, companyId),
            inArray(heartbeatRuns.status, ["queued", "running"]),
          ),
        );

      const processes: KillSwitchProcessInfo[] = runs.map((r) => {
        const running = runningProcesses.get(r.id);
        return {
          runId: r.id,
          agentId: r.agentId,
          agentName: r.agentName,
          status: r.status,
          pid: running?.child.pid ?? null,
          startedAt: r.createdAt?.toISOString() ?? null,
          issueId: r.issueId,
        };
      });

      return {
        processes,
        totalRunning: processes.filter((p) => p.status === "running").length,
      };
    },

    async killAllAgents(companyId: string): Promise<KillAllResult> {
      const companyAgents = await db
        .select({ id: agents.id })
        .from(agents)
        .where(eq(agents.companyId, companyId));

      let killedCount = 0;
      for (const agent of companyAgents) {
        const count = await heartbeat.cancelActiveForAgent(agent.id);
        killedCount += count;
      }

      // SIGKILL any stragglers that might not have been caught
      for (const [runId, running] of runningProcesses) {
        if (!running.child.killed) {
          try {
            running.child.kill("SIGKILL");
          } catch {
            // process may have already exited
          }
        }
      }

      logger.warn({ companyId, killedCount }, "Kill switch: all agents terminated");
      return { killedCount };
    },

    shutdownServer(): void {
      logger.warn("Kill switch: emergency server shutdown initiated");

      // Kill all running processes first
      for (const [, running] of runningProcesses) {
        try {
          running.child.kill("SIGKILL");
        } catch {
          // process may have already exited
        }
      }

      // Exit after response is flushed
      setTimeout(() => {
        process.exit(1);
      }, 200);
    },
  };
}
