// @ts-nocheck
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { productHealthChecks } from "@paperclipai/db";
function productHealthService(db) {
  return {
    record: async (companyId, input) => {
      const checkedAt = input.checkedAt ? new Date(input.checkedAt) : /* @__PURE__ */ new Date();
      const inserted = await db.insert(productHealthChecks).values({
        companyId,
        productId: input.productId ?? null,
        endpointUrl: input.endpointUrl,
        status: input.status,
        httpStatus: input.httpStatus ?? null,
        responseMs: input.responseMs ?? null,
        error: input.error ?? null,
        sslExpiresAt: input.sslExpiresAt ? new Date(input.sslExpiresAt) : null,
        checkedAt,
        updatedAt: /* @__PURE__ */ new Date()
      }).returning().then((rows) => rows[0]);
      const retentionCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
      await db.delete(productHealthChecks).where(and(eq(productHealthChecks.companyId, companyId), lt(productHealthChecks.checkedAt, retentionCutoff), input.productId ? eq(productHealthChecks.productId, input.productId) : sql`true`));
      return inserted;
    },
    summary: async (companyId) => {
      const baseConditions = [eq(productHealthChecks.companyId, companyId)];
      const current = await db.select().from(productHealthChecks).where(and(...baseConditions)).orderBy(desc(productHealthChecks.checkedAt)).limit(1).then((rows) => rows[0] ?? null);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1e3);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
      const checks24h = await db.select().from(productHealthChecks).where(and(eq(productHealthChecks.companyId, companyId), gte(productHealthChecks.checkedAt, dayAgo))).orderBy(desc(productHealthChecks.checkedAt)).limit(100);
      const weekStats = await db.select({
        total: sql`count(*)::int`,
        healthy: sql`coalesce(sum(case when ${productHealthChecks.status} = 'healthy' then 1 else 0 end), 0)::int`
      }).from(productHealthChecks).where(and(eq(productHealthChecks.companyId, companyId), gte(productHealthChecks.checkedAt, weekAgo))).then((rows) => rows[0]);
      const incidents = await db.select().from(productHealthChecks).where(and(eq(productHealthChecks.companyId, companyId), sql`${productHealthChecks.status} <> 'healthy'`)).orderBy(desc(productHealthChecks.checkedAt)).limit(20);
      const uptimePercent7d = Number(weekStats?.total ? (Number(weekStats.healthy ?? 0) / Number(weekStats.total) * 100).toFixed(2) : 100);
      return {
        companyId,
        currentStatus: current?.status ?? "healthy",
        uptimePercent7d,
        incidents,
        checks24h
      };
    }
  };
}
export {
  productHealthService
};
