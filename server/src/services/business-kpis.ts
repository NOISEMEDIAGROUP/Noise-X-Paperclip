// @ts-nocheck
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { businessKpis, costEvents, infraCosts, revenueEvents } from "@paperclipai/db";
function asNumber(value) {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}
function businessKpiService(db) {
  return {
    upsert: async (companyId, input) => {
      const kpiDate = input.kpiDate ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const values = {
        companyId,
        kpiDate,
        mrrCents: input.mrrCents,
        totalRevenueCents: input.totalRevenueCents,
        totalCostsCents: input.totalCostsCents,
        netProfitCents: input.netProfitCents,
        marginPercent: String(input.marginPercent),
        ltvCents: input.ltvCents ?? null,
        cacCents: input.cacCents ?? null,
        ltvCacRatio: input.ltvCacRatio == null ? null : String(input.ltvCacRatio),
        monthlyChurnRate: input.monthlyChurnRate == null ? null : String(input.monthlyChurnRate),
        burnRateCents: input.burnRateCents,
        metadata: input.metadata ?? {},
        updatedAt: /* @__PURE__ */ new Date()
      };
      return db.insert(businessKpis).values(values).onConflictDoUpdate({
        target: [businessKpis.companyId, businessKpis.kpiDate],
        set: values
      }).returning().then((rows) => rows[0]);
    },
    summary: async (companyId) => {
      const latest = await db.select().from(businessKpis).where(eq(businessKpis.companyId, companyId)).orderBy(desc(businessKpis.kpiDate)).limit(1).then((rows) => rows[0] ?? null);
      const trends = await db.select().from(businessKpis).where(eq(businessKpis.companyId, companyId)).orderBy(desc(businessKpis.kpiDate)).limit(30);
      const healthIndicators = latest ? [
        {
          label: "Margin",
          value: `${asNumber(latest.marginPercent).toFixed(2)}%`,
          tone: asNumber(latest.marginPercent) >= 20 ? "good" : asNumber(latest.marginPercent) >= 0 ? "warning" : "danger"
        },
        {
          label: "LTV:CAC",
          value: latest.ltvCacRatio == null ? "n/a" : asNumber(latest.ltvCacRatio).toFixed(2),
          tone: latest.ltvCacRatio == null ? "neutral" : asNumber(latest.ltvCacRatio) >= 3 ? "good" : "warning"
        },
        {
          label: "Churn",
          value: latest.monthlyChurnRate == null ? "n/a" : `${(asNumber(latest.monthlyChurnRate) * 100).toFixed(2)}%`,
          tone: latest.monthlyChurnRate == null ? "neutral" : asNumber(latest.monthlyChurnRate) <= 0.03 ? "good" : "warning"
        }
      ] : [];
      return { companyId, latestKpis: latest ? { ...latest, marginPercent: asNumber(latest.marginPercent), ltvCacRatio: latest.ltvCacRatio == null ? null : asNumber(latest.ltvCacRatio), monthlyChurnRate: latest.monthlyChurnRate == null ? null : asNumber(latest.monthlyChurnRate) } : null, trends: trends.map((row) => ({ ...row, marginPercent: asNumber(row.marginPercent), ltvCacRatio: row.ltvCacRatio == null ? null : asNumber(row.ltvCacRatio), monthlyChurnRate: row.monthlyChurnRate == null ? null : asNumber(row.monthlyChurnRate) })), healthIndicators };
    },
    pnl: async (companyId, opts) => {
      const now = /* @__PURE__ */ new Date();
      const from = opts?.from ? new Date(opts.from) : new Date(now.getFullYear(), now.getMonth(), 1);
      const to = opts?.to ? new Date(opts.to) : now;
      const revenue = await db.select({ total: sql`coalesce(sum(${revenueEvents.amountCents}), 0)::int` }).from(revenueEvents).where(and(eq(revenueEvents.companyId, companyId), gte(revenueEvents.occurredAt, from), lte(revenueEvents.occurredAt, to))).then((rows) => Number(rows[0]?.total ?? 0));
      const aiCosts = await db.select({ total: sql`coalesce(sum(${costEvents.costCents}), 0)::int` }).from(costEvents).where(and(eq(costEvents.companyId, companyId), gte(costEvents.occurredAt, from), lte(costEvents.occurredAt, to))).then((rows) => Number(rows[0]?.total ?? 0));
      const activeInfraCosts = await db.select().from(infraCosts).where(and(eq(infraCosts.companyId, companyId), lte(infraCosts.effectiveFrom, to.toISOString().slice(0, 10))));
      const infraCostTotal = activeInfraCosts.filter((row) => !row.effectiveTo || row.effectiveTo >= from.toISOString().slice(0, 10)).reduce((sum, row) => sum + row.amountCents, 0);
      const latest = await db.select().from(businessKpis).where(eq(businessKpis.companyId, companyId)).orderBy(desc(businessKpis.kpiDate)).limit(1).then((rows) => rows[0] ?? null);
      const totalCostsCents = aiCosts + infraCostTotal;
      const netProfitCents = revenue - totalCostsCents;
      const marginPercent = revenue > 0 ? Number((netProfitCents / revenue * 100).toFixed(2)) : 0;
      return {
        companyId,
        revenueCents: revenue,
        aiCostsCents: aiCosts,
        infraCostsCents: infraCostTotal,
        totalCostsCents,
        netProfitCents,
        marginPercent,
        latestKpis: latest ? { ...latest, marginPercent: asNumber(latest.marginPercent), ltvCacRatio: latest.ltvCacRatio == null ? null : asNumber(latest.ltvCacRatio), monthlyChurnRate: latest.monthlyChurnRate == null ? null : asNumber(latest.monthlyChurnRate) } : null,
        activeInfraCosts
      };
    }
  };
}
export {
  businessKpiService
};
