// @ts-nocheck
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { userMetricsSnapshots } from "@paperclipai/db";
function userMetricsService(db) {
  return {
    upsertSnapshot: async (companyId, input) => {
      const snapshotDate = input.snapshotDate ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const arrCents = input.arrCents ?? input.mrrCents * 12;
      const arpuCents = input.arpuCents ?? (input.paidUsers > 0 ? Math.round(input.mrrCents / input.paidUsers) : 0);
      const values = {
        companyId,
        productId: input.productId ?? null,
        snapshotDate,
        totalUsers: input.totalUsers,
        paidUsers: input.paidUsers,
        freeUsers: input.freeUsers,
        newSignups: input.newSignups,
        churned: input.churned,
        mrrCents: input.mrrCents,
        arrCents,
        arpuCents,
        metadata: input.metadata ?? {},
        updatedAt: /* @__PURE__ */ new Date()
      };
      const inserted = await db.insert(userMetricsSnapshots).values(values).onConflictDoUpdate({
        target: [userMetricsSnapshots.companyId, userMetricsSnapshots.productId, userMetricsSnapshots.snapshotDate],
        set: values
      }).returning().then((rows) => rows[0]);
      return inserted;
    },
    summary: async (companyId, opts) => {
      const conditions = [eq(userMetricsSnapshots.companyId, companyId)];
      if (opts?.productId) conditions.push(eq(userMetricsSnapshots.productId, opts.productId));
      const latest = await db.select().from(userMetricsSnapshots).where(and(...conditions)).orderBy(desc(userMetricsSnapshots.snapshotDate)).limit(1).then((rows) => rows[0] ?? null);
      if (opts?.from) conditions.push(gte(userMetricsSnapshots.snapshotDate, opts.from));
      if (opts?.to) conditions.push(lte(userMetricsSnapshots.snapshotDate, opts.to));
      const trend = await db.select().from(userMetricsSnapshots).where(and(...conditions)).orderBy(userMetricsSnapshots.snapshotDate);
      const totalUsers = latest?.totalUsers ?? 0;
      const freeUsers = latest?.freeUsers ?? 0;
      const paidUsers = latest?.paidUsers ?? 0;
      const conversionRate = totalUsers > 0 ? Number((paidUsers / totalUsers * 100).toFixed(2)) : 0;
      return {
        companyId,
        currentSnapshot: latest,
        trend,
        funnel: { totalUsers, freeUsers, paidUsers, conversionRate }
      };
    }
  };
}
export {
  userMetricsService
};
