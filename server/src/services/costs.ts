import { and, desc, eq, gte, isNotNull, lte, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { activityLog, agents, companies, costEvents, heartbeatRuns, issues, projects } from "@paperclipai/db";
import { notFound, unprocessable } from "../errors.js";

export interface CostDateRange {
  from?: Date;
  to?: Date;
}

function effectiveCostCentsExpr() {
  return sql<number>`case
    when ${costEvents.billingType} = 'api'
      and ${costEvents.costCents} = 0
      and ${costEvents.calculatedCostCents} is not null
    then ${costEvents.calculatedCostCents}
    else ${costEvents.costCents}
  end`;
}

function effectiveCostCentsValue(data: Pick<typeof costEvents.$inferInsert, "billingType" | "costCents" | "calculatedCostCents">) {
  if (data.billingType === "api" && data.costCents === 0 && data.calculatedCostCents != null) {
    return data.calculatedCostCents;
  }
  return data.costCents;
}

export function costService(db: Db) {
  return {
    createEvent: async (companyId: string, data: Omit<typeof costEvents.$inferInsert, "companyId">) => {
      const agent = await db
        .select()
        .from(agents)
        .where(eq(agents.id, data.agentId))
        .then((rows) => rows[0] ?? null);

      if (!agent) throw notFound("Agent not found");
      if (agent.companyId !== companyId) {
        throw unprocessable("Agent does not belong to company");
      }

      if (data.runId) {
        const run = await db
          .select()
          .from(heartbeatRuns)
          .where(eq(heartbeatRuns.id, data.runId))
          .then((rows) => rows[0] ?? null);

        if (!run) throw notFound("Heartbeat run not found");
        if (run.companyId !== companyId) {
          throw unprocessable("Heartbeat run does not belong to company");
        }
        if (run.agentId !== data.agentId) {
          throw unprocessable("Heartbeat run does not belong to agent");
        }
      }

      const eventInsert = {
        ...data,
        companyId,
        adapterType: data.adapterType ?? agent.adapterType ?? "unknown",
        billingType: data.billingType ?? "unknown",
      } satisfies typeof costEvents.$inferInsert;

      const event = await db
        .insert(costEvents)
        .values(eventInsert)
        .returning()
        .then((rows) => rows[0]);

      const effectiveCostCents = effectiveCostCentsValue(event);

      await db
        .update(agents)
        .set({
          spentMonthlyCents: sql`${agents.spentMonthlyCents} + ${effectiveCostCents}`,
          updatedAt: new Date(),
        })
        .where(eq(agents.id, event.agentId));

      await db
        .update(companies)
        .set({
          spentMonthlyCents: sql`${companies.spentMonthlyCents} + ${effectiveCostCents}`,
          updatedAt: new Date(),
        })
        .where(eq(companies.id, companyId));

      const updatedAgent = await db
        .select()
        .from(agents)
        .where(eq(agents.id, event.agentId))
        .then((rows) => rows[0] ?? null);

      if (
        updatedAgent &&
        updatedAgent.budgetMonthlyCents > 0 &&
        updatedAgent.spentMonthlyCents >= updatedAgent.budgetMonthlyCents &&
        updatedAgent.status !== "paused" &&
        updatedAgent.status !== "terminated"
      ) {
        await db
          .update(agents)
          .set({ status: "paused", updatedAt: new Date() })
          .where(eq(agents.id, updatedAgent.id));
      }

      return event;
    },

    summary: async (companyId: string, range?: CostDateRange) => {
      const company = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .then((rows) => rows[0] ?? null);

      if (!company) throw notFound("Company not found");

      const conditions: ReturnType<typeof eq>[] = [eq(costEvents.companyId, companyId)];
      if (range?.from) conditions.push(gte(costEvents.occurredAt, range.from));
      if (range?.to) conditions.push(lte(costEvents.occurredAt, range.to));

      const [{ total }] = await db
        .select({
          total: sql<number>`coalesce(sum(${effectiveCostCentsExpr()}), 0)::int`,
        })
        .from(costEvents)
        .where(and(...conditions));

      const spendCents = Number(total);
      const utilization =
        company.budgetMonthlyCents > 0
          ? (spendCents / company.budgetMonthlyCents) * 100
          : 0;

      return {
        companyId,
        spendCents,
        budgetCents: company.budgetMonthlyCents,
        utilizationPercent: Number(utilization.toFixed(2)),
      };
    },

    byAgent: async (companyId: string, range?: CostDateRange) => {
      const conditions: ReturnType<typeof eq>[] = [eq(costEvents.companyId, companyId)];
      if (range?.from) conditions.push(gte(costEvents.occurredAt, range.from));
      if (range?.to) conditions.push(lte(costEvents.occurredAt, range.to));

      const effectiveCost = effectiveCostCentsExpr();

      const costRows = await db
        .select({
          agentId: costEvents.agentId,
          agentName: agents.name,
          agentStatus: agents.status,
          agentAdapterType: sql<string>`coalesce(${costEvents.adapterType}, ${agents.adapterType}, 'unknown')`,
          costCents: sql<number>`coalesce(sum(${effectiveCost}), 0)::int`,
          inputTokens: sql<number>`coalesce(sum(${costEvents.inputTokens}), 0)::int`,
          outputTokens: sql<number>`coalesce(sum(${costEvents.outputTokens}), 0)::int`,
          apiRunCount:
            sql<number>`coalesce(sum(case when ${costEvents.billingType} = 'api' then 1 else 0 end), 0)::int`,
          subscriptionRunCount:
            sql<number>`coalesce(sum(case when ${costEvents.billingType} = 'subscription' then 1 else 0 end), 0)::int`,
          subscriptionInputTokens:
            sql<number>`coalesce(sum(case when ${costEvents.billingType} = 'subscription' then ${costEvents.inputTokens} else 0 end), 0)::int`,
          subscriptionOutputTokens:
            sql<number>`coalesce(sum(case when ${costEvents.billingType} = 'subscription' then ${costEvents.outputTokens} else 0 end), 0)::int`,
        })
        .from(costEvents)
        .leftJoin(agents, eq(costEvents.agentId, agents.id))
        .where(and(...conditions))
        .groupBy(costEvents.agentId, agents.name, agents.status, costEvents.adapterType, agents.adapterType)
        .orderBy(desc(sql`coalesce(sum(${effectiveCost}), 0)::int`));

      return costRows;
    },

    byRuntime: async (companyId: string, range?: CostDateRange) => {
      const conditions: ReturnType<typeof eq>[] = [eq(costEvents.companyId, companyId)];
      if (range?.from) conditions.push(gte(costEvents.occurredAt, range.from));
      if (range?.to) conditions.push(lte(costEvents.occurredAt, range.to));

      const effectiveCost = effectiveCostCentsExpr();
      const apiCostCentsExpr =
        sql<number>`coalesce(sum(case when ${costEvents.billingType} = 'api' then ${effectiveCost} else 0 end), 0)::int`;
      const totalRunCountExpr = sql<number>`count(*)::int`;

      return db
        .select({
          adapterType: costEvents.adapterType,
          costCents: sql<number>`coalesce(sum(${effectiveCost}), 0)::int`,
          apiCostCents: apiCostCentsExpr,
          apiRunCount:
            sql<number>`coalesce(sum(case when ${costEvents.billingType} = 'api' then 1 else 0 end), 0)::int`,
          apiInputTokens:
            sql<number>`coalesce(sum(case when ${costEvents.billingType} = 'api' then ${costEvents.inputTokens} else 0 end), 0)::int`,
          apiOutputTokens:
            sql<number>`coalesce(sum(case when ${costEvents.billingType} = 'api' then ${costEvents.outputTokens} else 0 end), 0)::int`,
          subscriptionRunCount:
            sql<number>`coalesce(sum(case when ${costEvents.billingType} = 'subscription' then 1 else 0 end), 0)::int`,
          subscriptionInputTokens:
            sql<number>`coalesce(sum(case when ${costEvents.billingType} = 'subscription' then ${costEvents.inputTokens} else 0 end), 0)::int`,
          subscriptionOutputTokens:
            sql<number>`coalesce(sum(case when ${costEvents.billingType} = 'subscription' then ${costEvents.outputTokens} else 0 end), 0)::int`,
          unknownRunCount:
            sql<number>`coalesce(sum(case when ${costEvents.billingType} not in ('api', 'subscription') then 1 else 0 end), 0)::int`,
          unknownInputTokens:
            sql<number>`coalesce(sum(case when ${costEvents.billingType} not in ('api', 'subscription') then ${costEvents.inputTokens} else 0 end), 0)::int`,
          unknownOutputTokens:
            sql<number>`coalesce(sum(case when ${costEvents.billingType} not in ('api', 'subscription') then ${costEvents.outputTokens} else 0 end), 0)::int`,
          totalRunCount: totalRunCountExpr,
        })
        .from(costEvents)
        .where(and(...conditions))
        .groupBy(costEvents.adapterType)
        .orderBy(desc(apiCostCentsExpr), desc(totalRunCountExpr), costEvents.adapterType);
    },

    byProject: async (companyId: string, range?: CostDateRange) => {
      const issueIdAsText = sql<string>`${issues.id}::text`;
      const runProjectLinks = db
        .selectDistinctOn([activityLog.runId, issues.projectId], {
          runId: activityLog.runId,
          projectId: issues.projectId,
        })
        .from(activityLog)
        .innerJoin(
          issues,
          and(
            eq(activityLog.entityType, "issue"),
            eq(activityLog.entityId, issueIdAsText),
          ),
        )
        .where(
          and(
            eq(activityLog.companyId, companyId),
            eq(issues.companyId, companyId),
            isNotNull(activityLog.runId),
            isNotNull(issues.projectId),
          ),
        )
        .orderBy(activityLog.runId, issues.projectId, desc(activityLog.createdAt))
        .as("run_project_links");

      const conditions: ReturnType<typeof eq>[] = [eq(heartbeatRuns.companyId, companyId)];
      if (range?.from) conditions.push(gte(heartbeatRuns.finishedAt, range.from));
      if (range?.to) conditions.push(lte(heartbeatRuns.finishedAt, range.to));

      const costCentsExpr = sql<number>`coalesce(sum(round(coalesce((${heartbeatRuns.usageJson} ->> 'costUsd')::numeric, 0) * 100)), 0)::int`;

      return db
        .select({
          projectId: runProjectLinks.projectId,
          projectName: projects.name,
          costCents: costCentsExpr,
          inputTokens: sql<number>`coalesce(sum(coalesce((${heartbeatRuns.usageJson} ->> 'inputTokens')::int, 0)), 0)::int`,
          outputTokens: sql<number>`coalesce(sum(coalesce((${heartbeatRuns.usageJson} ->> 'outputTokens')::int, 0)), 0)::int`,
        })
        .from(runProjectLinks)
        .innerJoin(heartbeatRuns, eq(runProjectLinks.runId, heartbeatRuns.id))
        .innerJoin(projects, eq(runProjectLinks.projectId, projects.id))
        .where(and(...conditions))
        .groupBy(runProjectLinks.projectId, projects.name)
        .orderBy(desc(costCentsExpr));
    },
  };
}
