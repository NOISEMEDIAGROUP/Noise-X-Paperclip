// @ts-nocheck
import { eq, and, ne, sql } from "drizzle-orm";
import { agents } from "@paperclipai/db";
import { logger } from "../middleware/logger.js";

/**
 * Auto-routing engine for task assignment.
 * Picks the least-loaded active agent when no assignee is specified.
 */
function routingService(db) {
  return {
    resolve: async (companyId, opts = {}) => {
      const { priority } = opts;

      // Find all active agents
      const availableAgents = await db
        .select({
          id: agents.id,
          name: agents.name,
          role: agents.role,
          status: agents.status,
        })
        .from(agents)
        .where(
          and(
            eq(agents.companyId, companyId),
            ne(agents.status, "terminated"),
            ne(agents.status, "paused"),
          ),
        );

      if (availableAgents.length === 0) {
        return null;
      }

      // Count open tasks per agent using Drizzle SQL template
      const workload = await db.execute(sql`
        SELECT assignee_agent_id, COUNT(*) as task_count
        FROM issues
        WHERE company_id = ${companyId}
          AND assignee_agent_id IS NOT NULL
          AND status NOT IN ('done', 'cancelled')
        GROUP BY assignee_agent_id
      `);

      const workloadMap = new Map();
      const rows = workload?.rows ?? workload ?? [];
      for (const row of rows) {
        workloadMap.set(row.assignee_agent_id, Number(row.task_count));
      }

      // Sort by fewest open tasks
      const sorted = availableAgents
        .map((a) => ({ ...a, openTasks: workloadMap.get(a.id) ?? 0 }))
        .sort((a, b) => a.openTasks - b.openTasks || a.name.localeCompare(b.name));

      // For critical tasks, prefer security agents
      if (priority === "critical" || priority === "high") {
        const security = sorted.find((a) =>
          a.role?.toLowerCase().includes("security") || a.role?.toLowerCase().includes("cso"),
        );
        if (security) {
          return security.id;
        }
      }

      const best = sorted[0];
      logger.info({ agentId: best.id, agentName: best.name, openTasks: best.openTasks }, "auto-routed task to agent");
      return best.id;
    },
  };
}

export { routingService };
