import { and, eq, desc } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents } from "@paperclipai/db";
import type { Agent } from "@paperclipai/shared";
import { normalizeGovernanceFields } from "./governance.js";

interface ReviewerConfig {
  reviewsRoles: string[];
  autoApprove?: boolean;
  escalateTo?: string | null;
}

const DEFAULT_WORKFLOW_RULES: Record<string, string[]> = {
  engineer: ["qa"],
  designer: ["pm"],
  devops: ["pm"],
  researcher: ["cto"],
  pm: ["cto"],
  general: ["pm"],
  qa: ["pm"],
  cto: ["ceo"],
  cmo: ["ceo"],
  cfo: ["ceo"],
  cpo: ["ceo"],
};

function toAgent(row: typeof agents.$inferSelect): Agent {
  const governance = normalizeGovernanceFields(row);
  return {
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    urlKey: row.name.toLowerCase().replace(/\s+/g, "-"),
    role: row.role as Agent["role"],
    title: row.title,
    icon: row.icon,
    status: row.status as Agent["status"],
    reportsTo: row.reportsTo,
    capabilities: row.capabilities,
    adapterType: row.adapterType as Agent["adapterType"],
    mode: governance.mode,
    classes: governance.classes,
    runtimeEnvironment: governance.runtimeEnvironment,
    runtimePolicy: governance.runtimePolicy,
    adapterConfig: row.adapterConfig,
    runtimeConfig: row.runtimeConfig,
    budgetMonthlyCents: row.budgetMonthlyCents,
    spentMonthlyCents: row.spentMonthlyCents,
    permissions: { canCreateAgents: row.role === "ceo" },
    lastHeartbeatAt: row.lastHeartbeatAt,
    metadata: row.metadata,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function workflowService(db: Db) {
  return {
    async findReviewerForIssue(companyId: string, assigneeAgentId: string | null): Promise<Agent | null> {
      if (!assigneeAgentId) {
        return null;
      }

      const assignee = await db.query.agents.findFirst({
        where: and(eq(agents.id, assigneeAgentId), eq(agents.companyId, companyId)),
      });

      if (!assignee) {
        return null;
      }

      return this.findReviewerByRole(companyId, assignee.role);
    },

    async findReviewerByRole(companyId: string, assigneeRole: string): Promise<Agent | null> {
      const reviewerRoles = DEFAULT_WORKFLOW_RULES[assigneeRole] || ["pm"];

      for (const role of reviewerRoles) {
        const reviewer = await db.query.agents.findFirst({
          where: and(eq(agents.companyId, companyId), eq(agents.role, role)),
          orderBy: [desc(agents.lastHeartbeatAt)],
        });

        if (reviewer && reviewer.status !== "terminated") {
          return toAgent(reviewer);
        }
      }

      const fallbackReviewer = await db.query.agents.findFirst({
        where: and(eq(agents.companyId, companyId), eq(agents.role, "ceo")),
      });

      return fallbackReviewer && fallbackReviewer.status !== "terminated" ? toAgent(fallbackReviewer) : null;
    },

    async findReviewerByConfig(companyId: string, reviewerConfig: ReviewerConfig): Promise<Agent | null> {
      if (!reviewerConfig.reviewsRoles || reviewerConfig.reviewsRoles.length === 0) {
        return null;
      }

      for (const role of reviewerConfig.reviewsRoles) {
        const reviewer = await db.query.agents.findFirst({
          where: and(eq(agents.companyId, companyId), eq(agents.role, role)),
          orderBy: [desc(agents.lastHeartbeatAt)],
        });

        if (reviewer && reviewer.status !== "terminated") {
          return toAgent(reviewer);
        }
      }

      return null;
    },
  };
}
