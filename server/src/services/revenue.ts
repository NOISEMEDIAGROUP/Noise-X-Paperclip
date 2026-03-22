// @ts-nocheck
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { revenueEvents, userMetricsSnapshots } from "@paperclipai/db";
import { conflict, unprocessable } from "../errors.js";
import { businessConfigService } from "./business-config.js";
import { secretService } from "./secrets.js";
function normalizeStripeEventType(eventType) {
  switch (eventType) {
    case "checkout.session.completed":
    case "invoice.payment_succeeded":
      return "payment_received";
    case "customer.subscription.created":
      return "subscription_created";
    case "customer.subscription.deleted":
      return "subscription_cancelled";
    case "customer.subscription.updated":
      return "subscription_renewed";
    case "charge.refunded":
      return "refund";
    case "invoice.payment_failed":
      return "charge_failed";
    default:
      return null;
  }
}
function parseStripeSignature(header) {
  if (!header) throw unprocessable("Missing Stripe signature header");
  const values = /* @__PURE__ */ new Map();
  for (const chunk of header.split(",")) {
    const [rawKey, rawValue] = chunk.split("=");
    const key = rawKey?.trim();
    const value = rawValue?.trim();
    if (!key || !value) continue;
    const existing = values.get(key) ?? [];
    existing.push(value);
    values.set(key, existing);
  }
  const timestamp = values.get("t")?.[0];
  const signatures = values.get("v1") ?? [];
  if (!timestamp || signatures.length === 0) {
    throw unprocessable("Invalid Stripe signature header");
  }
  return { timestamp, signatures };
}
function verifyStripeSignature(rawBody, header, secret) {
  const { timestamp, signatures } = parseStripeSignature(header);
  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const valid = signatures.some((signature) => {
    const signatureBuffer = Buffer.from(signature, "utf8");
    if (signatureBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(signatureBuffer, expectedBuffer);
  });
  if (!valid) throw unprocessable("Stripe signature verification failed");
  const eventAgeSeconds = Math.abs(Date.now() / 1e3 - Number(timestamp));
  if (!Number.isFinite(eventAgeSeconds) || eventAgeSeconds > 300) {
    throw unprocessable("Stripe signature timestamp outside tolerance");
  }
}
function deriveStripePayloadData(payload) {
  const eventType = String(payload.type ?? "");
  const normalizedType = normalizeStripeEventType(eventType);
  if (!normalizedType) return null;
  const eventId = typeof payload.id === "string" ? payload.id : null;
  const dataObject = payload.data?.object ?? {};
  const amount = typeof dataObject.amount_total === "number" ? dataObject.amount_total : typeof dataObject.amount_received === "number" ? dataObject.amount_received : typeof dataObject.amount_paid === "number" ? dataObject.amount_paid : typeof dataObject.amount_due === "number" ? dataObject.amount_due : typeof dataObject.amount === "number" ? dataObject.amount : 0;
  const amountCents = normalizedType === "refund" ? -Math.abs(amount) : amount;
  const customerDetails = dataObject.customer_details ?? {};
  const occurredAtSeconds = typeof payload.created === "number" ? payload.created : typeof dataObject.created === "number" ? dataObject.created : Math.floor(Date.now() / 1e3);
  return {
    stripeEventId: eventId,
    eventType: normalizedType,
    amountCents,
    currency: String(dataObject.currency ?? payload.currency ?? "usd").toLowerCase(),
    customerId: typeof dataObject.customer === "string" ? dataObject.customer : null,
    customerEmail: typeof customerDetails.email === "string" ? customerDetails.email : typeof dataObject.customer_email === "string" ? dataObject.customer_email : null,
    subscriptionId: typeof dataObject.subscription === "string" ? dataObject.subscription : null,
    productId: typeof dataObject.price === "string" ? dataObject.price : typeof dataObject.plan === "string" ? dataObject.plan : null,
    occurredAt: new Date(occurredAtSeconds * 1e3),
    metadata: payload
  };
}
function revenueService(db) {
  const secrets = secretService(db);
  const businessConfig = businessConfigService(db);
  const recordEvent = async (companyId, payload) => {
    const row = {
      companyId,
      source: payload.source,
      eventType: payload.eventType,
      stripeEventId: payload.stripeEventId ?? null,
      amountCents: payload.amountCents,
      currency: payload.currency ?? "usd",
      customerId: payload.customerId ?? null,
      customerEmail: payload.customerEmail ?? null,
      subscriptionId: payload.subscriptionId ?? null,
      productId: payload.productId ?? null,
      metadata: payload.metadata ?? {},
      occurredAt: payload.occurredAt ?? /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (!row.stripeEventId) {
      return db.insert(revenueEvents).values(row).returning().then((rows) => rows[0]);
    }
    const inserted = await db.insert(revenueEvents).values(row).onConflictDoNothing({ target: revenueEvents.stripeEventId }).returning().then((rows) => rows[0] ?? null);
    if (inserted) return inserted;
    const existing = await db.select().from(revenueEvents).where(eq(revenueEvents.stripeEventId, row.stripeEventId)).then((rows) => rows[0] ?? null);
    if (!existing) throw conflict("Revenue event already exists but could not be loaded");
    return existing;
  };
  return {
    listEvents: async (companyId, opts) => {
      const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 200);
      const conditions = [eq(revenueEvents.companyId, companyId)];
      if (opts?.type) conditions.push(eq(revenueEvents.eventType, opts.type));
      return db.select().from(revenueEvents).where(and(...conditions)).orderBy(desc(revenueEvents.occurredAt)).limit(limit);
    },
    summary: async (companyId, opts) => {
      const now = /* @__PURE__ */ new Date();
      const from = opts?.from ? new Date(opts.from) : new Date(now.getFullYear(), now.getMonth(), 1);
      const to = opts?.to ? new Date(opts.to) : now;
      const latestSnapshot = await db.select().from(userMetricsSnapshots).where(eq(userMetricsSnapshots.companyId, companyId)).orderBy(desc(userMetricsSnapshots.snapshotDate)).limit(1).then((rows) => rows[0] ?? null);
      const totals = await db.select({
        totalRevenueCents: sql`coalesce(sum(${revenueEvents.amountCents}), 0)::int`,
        subscriptionsCents: sql`coalesce(sum(case when ${revenueEvents.eventType} in ('payment_received', 'subscription_created', 'subscription_renewed') then ${revenueEvents.amountCents} else 0 end), 0)::int`,
        refundsCents: sql`coalesce(sum(case when ${revenueEvents.eventType} = 'refund' then abs(${revenueEvents.amountCents}) else 0 end), 0)::int`,
        failedCharges: sql`coalesce(sum(case when ${revenueEvents.eventType} = 'charge_failed' then 1 else 0 end), 0)::int`
      }).from(revenueEvents).where(and(eq(revenueEvents.companyId, companyId), gte(revenueEvents.occurredAt, from), lte(revenueEvents.occurredAt, to))).then((rows) => rows[0]);
      const granularity = opts?.granularity ?? "day";
      const truncExpr = sql`date_trunc(${sql.raw(`'${granularity}'`)}, ${revenueEvents.occurredAt})`;
      const trend = await db.select({
        bucket: sql`to_char(${truncExpr}, 'YYYY-MM-DD')`,
        amountCents: sql`coalesce(sum(${revenueEvents.amountCents}), 0)::int`
      }).from(revenueEvents).where(and(eq(revenueEvents.companyId, companyId), gte(revenueEvents.occurredAt, from), lte(revenueEvents.occurredAt, to))).groupBy(truncExpr).orderBy(truncExpr);
      const recentEvents = await db.select().from(revenueEvents).where(eq(revenueEvents.companyId, companyId)).orderBy(desc(revenueEvents.occurredAt)).limit(20);
      return {
        companyId,
        mrrCents: latestSnapshot?.mrrCents ?? 0,
        totalRevenueCents: Number(totals?.totalRevenueCents ?? 0),
        breakdown: {
          subscriptionsCents: Number(totals?.subscriptionsCents ?? 0),
          oneTimeCents: 0,
          refundsCents: Number(totals?.refundsCents ?? 0),
          failedCharges: Number(totals?.failedCharges ?? 0)
        },
        revenueTrend: trend.map((row) => ({ bucket: row.bucket, amountCents: Number(row.amountCents ?? 0) })),
        recentEvents
      };
    },
    recordEvent,
    ingestStripeWebhook: async (companyId, payload, signatureHeader, rawBody) => {
      const config = await businessConfig.get(companyId);
      const webhookSecret = await secrets.resolveSecretValueByName(companyId, config.stripeWebhookSecretName);
      if (!webhookSecret) throw unprocessable(`Missing company secret: ${config.stripeWebhookSecretName}`);
      verifyStripeSignature(rawBody, signatureHeader, webhookSecret);
      const parsed = deriveStripePayloadData(payload);
      if (!parsed) {
        return { processed: false, ignored: true, reason: "Unsupported Stripe event type" };
      }
      const recorded = await recordEvent(companyId, {
        source: "stripe",
        ...parsed
      });
      return { processed: true, ignored: false, revenueEvent: recorded };
    }
  };
}
export {
  revenueService
};
