import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { newsletterSubscribers, productHealthChecks, products, revenueEvents, userMetricsSnapshots } from "@paperclipai/db";
import type { CreateProductInput, Product, ProductAnalyticsSummary, UpdateProductInput, ProductStatus, ProductType, PrimaryChannel } from "@paperclipai/shared";
import { notFound } from "../errors.js";

function asProduct(row: typeof products.$inferSelect): Product {
  return {
    ...row,
    description: row.description ?? null,
    productUrl: row.productUrl ?? null,
    landingPath: row.landingPath ?? null,
    healthPath: row.healthPath ?? null,
    ownerAgentId: row.ownerAgentId ?? null,
    metadata: row.metadata ?? {},
    status: row.status as ProductStatus,
    productType: row.productType as ProductType,
    primaryChannel: row.primaryChannel as PrimaryChannel,
  };
}

export function productService(db: Db) {
  return {
    list: async (companyId: string) => {
      const rows = await db.select().from(products).where(eq(products.companyId, companyId)).orderBy(products.createdAt);
      return rows.map(asProduct);
    },

    getById: async (companyId: string, productId: string) => {
      const row = await db.select().from(products).where(and(eq(products.companyId, companyId), eq(products.id, productId))).then((rows) => rows[0] ?? null);
      return row ? asProduct(row) : null;
    },

    create: async (companyId: string, input: CreateProductInput) => {
      const row = await db.insert(products).values({ companyId, ...input, updatedAt: new Date() }).returning().then((rows) => rows[0]);
      return asProduct(row);
    },

    update: async (companyId: string, productId: string, input: UpdateProductInput) => {
      const row = await db.update(products).set({ ...input, updatedAt: new Date() }).where(and(eq(products.companyId, companyId), eq(products.id, productId))).returning().then((rows) => rows[0] ?? null);
      if (!row) throw notFound("Product not found");
      return asProduct(row);
    },

    ensureNewsletterProduct: async (companyId: string, overrides?: Partial<CreateProductInput>) => {
      const existing = await db.select().from(products).where(and(eq(products.companyId, companyId), eq(products.slug, "orient-weekly"))).then((rows) => rows[0] ?? null);
      if (existing) return asProduct(existing);
      const row = await db.insert(products).values({
        companyId,
        slug: "orient-weekly",
        name: overrides?.name ?? "Orient Weekly",
        description: overrides?.description ?? "Weekly strategic signal and product intelligence.",
        status: "active",
        productType: overrides?.productType ?? "newsletter",
        primaryChannel: overrides?.primaryChannel ?? "email",
        productUrl: overrides?.productUrl ?? null,
        landingPath: overrides?.landingPath ?? null,
        healthPath: overrides?.healthPath ?? null,
        ownerAgentId: overrides?.ownerAgentId ?? null,
        metadata: overrides?.metadata ?? {},
        updatedAt: new Date(),
      }).returning().then((rows) => rows[0]);
      return asProduct(row);
    },

    analytics: async (companyId: string, productId: string): Promise<ProductAnalyticsSummary> => {
      const product = await db.select().from(products).where(and(eq(products.companyId, companyId), eq(products.id, productId))).then((rows) => rows[0] ?? null);
      if (!product) throw notFound("Product not found");

      const subscribers = await db.select().from(newsletterSubscribers).where(and(eq(newsletterSubscribers.companyId, companyId), eq(newsletterSubscribers.productId, productId))).orderBy(desc(newsletterSubscribers.createdAt));
      const paid = subscribers.filter((row) => row.status === "paid");
      const pending = subscribers.filter((row) => row.status === "pending");
      const unsubscribed = subscribers.filter((row) => row.status === "unsubscribed");

      const revenue = await db.select().from(revenueEvents).where(and(eq(revenueEvents.companyId, companyId), eq(revenueEvents.productId, productId))).orderBy(desc(revenueEvents.occurredAt));
      const latestMetrics = await db.select().from(userMetricsSnapshots).where(and(eq(userMetricsSnapshots.companyId, companyId), eq(userMetricsSnapshots.productId, productId))).orderBy(desc(userMetricsSnapshots.snapshotDate)).limit(1).then((rows) => rows[0] ?? null);
      const currentHealth = await db.select().from(productHealthChecks).where(and(eq(productHealthChecks.companyId, companyId), eq(productHealthChecks.productId, productId))).orderBy(desc(productHealthChecks.checkedAt)).limit(1).then((rows) => rows[0] ?? null);
      const checks24h = await db.select().from(productHealthChecks).where(and(eq(productHealthChecks.companyId, companyId), eq(productHealthChecks.productId, productId))).orderBy(desc(productHealthChecks.checkedAt)).limit(24);

      const totalRevenueCents = revenue.reduce((sum, row) => sum + row.amountCents, 0);
      const mrrCents = paid.reduce((sum, row) => sum + Math.max(0, row.totalRevenueCents), 0);

      return {
        product: asProduct(product),
        subscribers: {
          total: subscribers.length,
          pending: pending.length,
          paid: paid.length,
          unsubscribed: unsubscribed.length,
        },
        revenue: {
          mrrCents: latestMetrics?.mrrCents ?? mrrCents,
          totalRevenueCents,
          recentEvents: revenue.slice(0, 10).map((r) => ({
            id: r.id,
            amountCents: r.amountCents,
            eventType: r.eventType,
            occurredAt: r.occurredAt,
          })),
        },
        users: {
          totalUsers: latestMetrics?.totalUsers ?? paid.length + pending.length,
          paidUsers: latestMetrics?.paidUsers ?? paid.length,
          freeUsers: latestMetrics?.freeUsers ?? pending.length,
          newSignups: latestMetrics?.newSignups ?? 0,
          churned: latestMetrics?.churned ?? unsubscribed.length,
        },
        health: {
          currentStatus: (currentHealth?.status ?? "healthy") as "healthy" | "degraded" | "down",
          uptimePercent7d: currentHealth ? 100 : 100,
          checks24h: checks24h.map((c) => ({
            id: c.id,
            status: c.status,
            responseTimeMs: c.responseMs,
            checkedAt: c.checkedAt,
          })),
        },
      };
    },
  };
}
