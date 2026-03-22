// @ts-nocheck
import { and, desc, eq, sql } from "drizzle-orm";
import { Router } from "express";
import { agents, businessKpis, companies, notificationLog, productHealthChecks, userMetricsSnapshots } from "@paperclipai/db";
import { assertBoard } from "./authz.js";
function portfolioRoutes(db) {
  const router = Router();
  router.get("/portfolio", async (req, res) => {
    assertBoard(req);
    const companyRows = await db.select().from(companies).where(sql`${companies.status} <> 'archived'`);
    const summaries = await Promise.all(
      companyRows.map(async (company) => {
        const latestKpi = await db.select().from(businessKpis).where(eq(businessKpis.companyId, company.id)).orderBy(desc(businessKpis.kpiDate)).limit(1).then((rows) => rows[0] ?? null);
        const latestUsers = await db.select().from(userMetricsSnapshots).where(eq(userMetricsSnapshots.companyId, company.id)).orderBy(desc(userMetricsSnapshots.snapshotDate)).limit(1).then((rows) => rows[0] ?? null);
        const latestHealth = await db.select().from(productHealthChecks).where(eq(productHealthChecks.companyId, company.id)).orderBy(desc(productHealthChecks.checkedAt)).limit(1).then((rows) => rows[0] ?? null);
        const agentCount = await db.select({ count: sql`count(*)::int` }).from(agents).where(and(eq(agents.companyId, company.id), sql`${agents.status} <> 'terminated'`)).then((rows) => Number(rows[0]?.count ?? 0));
        return {
          companyId: company.id,
          name: company.name,
          issuePrefix: company.issuePrefix,
          mrrCents: latestKpi?.mrrCents ?? latestUsers?.mrrCents ?? 0,
          totalCostsCents: latestKpi?.totalCostsCents ?? 0,
          profitCents: latestKpi?.netProfitCents ?? 0,
          userCount: latestUsers?.totalUsers ?? 0,
          agentCount,
          healthStatus: latestHealth?.status ?? "healthy"
        };
      })
    );
    const recentNotifications = await db.select().from(notificationLog).orderBy(desc(notificationLog.createdAt)).limit(12);
    const totals = summaries.reduce(
      (acc, item) => {
        acc.mrrCents += item.mrrCents;
        acc.totalCostsCents += item.totalCostsCents;
        acc.profitCents += item.profitCents;
        acc.companies += 1;
        return acc;
      },
      { mrrCents: 0, totalCostsCents: 0, profitCents: 0, companies: 0 }
    );
    res.json({ totals, companies: summaries, recentNotifications });
  });
  return router;
}
export {
  portfolioRoutes
};
