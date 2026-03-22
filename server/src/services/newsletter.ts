// @ts-nocheck
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { companies, newsletterSubscribers, revenueEvents, userMetricsSnapshots, productHealthChecks } from "@paperclipai/db";
import { notFound, unprocessable } from "../errors.js";
import { businessConfigService } from "./business-config.js";
import { productService } from "./products.js";
import { productHealthService } from "./product-health.js";
import { secretService } from "./secrets.js";
import { telegramNotifierService } from "./telegram-notifier.js";
import { userMetricsService } from "./user-metrics.js";
const DEFAULT_PRODUCT_NAME = "Orient Weekly";
const DEFAULT_TAGLINE = "Strategic signal for builders, operators, and investors.";
const DEFAULT_DESCRIPTION = "A sharp weekly briefing on AI-native companies, product leverage, and durable execution.";
const DEFAULT_PRICE_CENTS = 700;
function normalizeEmail(email) {
  return email.trim().toLowerCase();
}
function asSubscriber(row) {
  return {
    ...row,
    status: row.status,
    fullName: row.fullName ?? null,
    stripeCustomerId: row.stripeCustomerId ?? null,
    stripeSubscriptionId: row.stripeSubscriptionId ?? null,
    lastCheckoutMode: row.lastCheckoutMode ?? null,
    lastCheckoutAt: row.lastCheckoutAt ?? null,
    paidAt: row.paidAt ?? null,
    unsubscribedAt: row.unsubscribedAt ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    metadata: row.metadata ?? {}
  };
}
function newsletterService(db) {
  const configs = businessConfigService(db);
  const secrets = secretService(db);
  const metrics = userMetricsService(db);
  const health = productHealthService(db);
  const notifier = telegramNotifierService(db);
  const productsSvc = productService(db);
  async function getCompanyByPrefix(companyPrefix) {
    const prefix = companyPrefix.trim().toUpperCase();
    const company = await db.select().from(companies).where(eq(companies.issuePrefix, prefix)).then((rows) => rows[0] ?? null);
    if (!company) throw notFound("Company not found");
    return company;
  }
  async function ensureNewsletterProduct(companyId, companyPrefix, config) {
    const existing = await productsSvc.ensureNewsletterProduct(companyId, {
      name: config.productName?.trim() || DEFAULT_PRODUCT_NAME,
      productUrl: config.productUrl ?? null,
      landingPath: `/${companyPrefix}/orient`,
      healthPath: `/api/public/newsletter/${companyPrefix}/health`
    });
    await db.update(newsletterSubscribers).set({ productId: existing.id, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(newsletterSubscribers.companyId, companyId), isNull(newsletterSubscribers.productId))).catch(() => null);
    await db.update(revenueEvents).set({ productId: existing.id, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(revenueEvents.companyId, companyId), isNull(revenueEvents.productId), sql`${revenueEvents.metadata} ->> 'product' = 'orient_weekly'`)).catch(() => null);
    await db.update(userMetricsSnapshots).set({ productId: existing.id, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(userMetricsSnapshots.companyId, companyId), isNull(userMetricsSnapshots.productId), sql`${userMetricsSnapshots.metadata} ->> 'source' = 'newsletter_subscribers'`)).catch(() => null);
    await db.update(productHealthChecks).set({ productId: existing.id, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(productHealthChecks.companyId, companyId), isNull(productHealthChecks.productId), sql`${productHealthChecks.endpointUrl} like '%/newsletter/%'`)).catch(() => null);
    return existing;
  }
  async function getOrCreateSubscriber(companyId, productId, input, source = "landing_page") {
    const email = normalizeEmail(input.email);
    const existing = await db.select().from(newsletterSubscribers).where(and(eq(newsletterSubscribers.companyId, companyId), eq(newsletterSubscribers.email, email))).then((rows) => rows[0] ?? null);
    if (existing) {
      const updated = await db.update(newsletterSubscribers).set({
        fullName: input.fullName?.trim() || existing.fullName,
        productId,
        source,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(newsletterSubscribers.id, existing.id)).returning().then((rows) => rows[0]);
      return asSubscriber(updated);
    }
    const created = await db.insert(newsletterSubscribers).values({
        companyId,
        productId,
        email,
      fullName: input.fullName?.trim() || null,
      source,
      status: "pending",
      updatedAt: /* @__PURE__ */ new Date()
    }).returning().then((rows) => rows[0]);
    return asSubscriber(created);
  }
  async function syncUserMetrics(companyId, productId) {
    const subscribers = await db.select().from(newsletterSubscribers).where(and(eq(newsletterSubscribers.companyId, companyId), eq(newsletterSubscribers.productId, productId)));
    const active = subscribers.filter((subscriber) => subscriber.status !== "unsubscribed");
    const paid = active.filter((subscriber) => subscriber.status === "paid");
    const pending = active.filter((subscriber) => subscriber.status === "pending");
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const newSignups = subscribers.filter((subscriber) => subscriber.createdAt.toISOString().slice(0, 10) === today).length;
    const churned = subscribers.filter(
      (subscriber) => subscriber.unsubscribedAt && subscriber.unsubscribedAt.toISOString().slice(0, 10) === today
    ).length;
    await metrics.upsertSnapshot(companyId, {
      productId,
      totalUsers: active.length,
      paidUsers: paid.length,
      freeUsers: pending.length,
      newSignups,
      churned,
      mrrCents: paid.length * DEFAULT_PRICE_CENTS,
      metadata: { source: "newsletter_subscribers" }
    });
  }
  async function recordNewsletterHealth(companyId, productId, status, error) {
    const config = await configs.get(companyId);
    const company = await db.select().from(companies).where(eq(companies.id, companyId)).then((rows) => rows[0] ?? null);
    const issuePrefix = company?.issuePrefix ?? "newsletter";
    const endpointUrl = config.healthcheckUrl?.trim() || `/api/public/newsletter/${issuePrefix}/health`;
    await health.record(companyId, {
      productId,
      endpointUrl,
      status,
      httpStatus: status === "healthy" ? 200 : 503,
      responseMs: 25,
      error: error ?? null,
      sslExpiresAt: null,
      checkedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  return {
    landingInfo: async (companyPrefix) => {
      const company = await getCompanyByPrefix(companyPrefix);
      const config = await configs.get(company.id);
      const product = await ensureNewsletterProduct(company.id, company.issuePrefix, config);
      return {
        companyId: company.id,
        companyName: company.name,
        companyPrefix: company.issuePrefix,
        productName: product.name,
        tagline: DEFAULT_TAGLINE,
        description: DEFAULT_DESCRIPTION,
        priceLabel: `$${(DEFAULT_PRICE_CENTS / 100).toFixed(0)}/month`,
        checkoutMode: "demo",
        healthUrl: product.healthPath ?? `/api/public/newsletter/${company.issuePrefix}/health`
      };
    },
    subscribe: async (companyPrefix, input) => {
      const company = await getCompanyByPrefix(companyPrefix);
      const config = await configs.get(company.id);
      const product = await ensureNewsletterProduct(company.id, company.issuePrefix, config);
      const subscriber = await getOrCreateSubscriber(company.id, product.id, input, "landing_page");
      if (config.emailEnabled && config.resendFromEmail) {
        await notifier.send(company.id, {
          channel: "email",
          type: "welcome_email",
          recipient: subscriber.email,
          subject: `Welcome to ${config.productName?.trim() || DEFAULT_PRODUCT_NAME}`,
          body: `You are on the list for ${config.productName?.trim() || DEFAULT_PRODUCT_NAME}. Complete checkout to activate your subscription and receive the next issue.`
        }).catch(() => null);
      }
      await syncUserMetrics(company.id, product.id);
      await recordNewsletterHealth(company.id, product.id, "healthy");
      return subscriber;
    },
    createCheckout: async (companyPrefix, input, baseUrl) => {
      const company = await getCompanyByPrefix(companyPrefix);
      const config = await configs.get(company.id);
      const product = await ensureNewsletterProduct(company.id, company.issuePrefix, config);
      const subscriber = await getOrCreateSubscriber(company.id, product.id, input, "checkout");
      const stripeSecretKey = await secrets.resolveSecretValueByName(company.id, config.stripeSecretKeyName);
      if (!stripeSecretKey) {
        await db.update(newsletterSubscribers).set({ lastCheckoutMode: "demo", lastCheckoutAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq(newsletterSubscribers.id, subscriber.id));
        return {
          mode: "demo",
          checkoutUrl: `${baseUrl}/api/public/newsletter/${company.issuePrefix}/demo-checkout/${subscriber.id}`,
          subscriberId: subscriber.id
        };
      }
      const successUrl = `${baseUrl}/${company.issuePrefix}/orient?checkout=success`;
      const cancelUrl = `${baseUrl}/${company.issuePrefix}/orient?checkout=cancelled`;
      const payload = new URLSearchParams();
      payload.set("mode", "subscription");
      payload.set("success_url", successUrl);
      payload.set("cancel_url", cancelUrl);
      payload.set("line_items[0][price_data][currency]", config.defaultCurrency || "usd");
      payload.set("line_items[0][price_data][product_data][name]", DEFAULT_PRODUCT_NAME);
      payload.set("line_items[0][price_data][recurring][interval]", "month");
      payload.set("line_items[0][price_data][unit_amount]", String(DEFAULT_PRICE_CENTS));
      payload.set("line_items[0][quantity]", "1");
      payload.set("customer_email", subscriber.email);
      payload.set("metadata[companyId]", company.id);
      payload.set("metadata[product]", product.slug);
      payload.set("metadata[productId]", product.id);
      payload.set("metadata[subscriberId]", subscriber.id);
      const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: payload
      });
      if (!response.ok) {
        throw unprocessable(`Stripe checkout creation failed: ${response.status}`);
      }
      const session = await response.json();
      if (!session.url) {
        throw unprocessable("Stripe checkout did not return a URL");
      }
      await db.update(newsletterSubscribers).set({
        lastCheckoutMode: "stripe",
        lastCheckoutAt: /* @__PURE__ */ new Date(),
        metadata: { ...subscriber.metadata, stripeCheckoutSessionId: session.id ?? null },
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(newsletterSubscribers.id, subscriber.id));
      return {
        mode: "stripe",
        checkoutUrl: session.url,
        subscriberId: subscriber.id
      };
    },
    completeDemoCheckout: async (companyPrefix, subscriberId) => {
      const company = await getCompanyByPrefix(companyPrefix);
      const config = await configs.get(company.id);
      const product = await ensureNewsletterProduct(company.id, company.issuePrefix, config);
      const existing = await db.select().from(newsletterSubscribers).where(and(eq(newsletterSubscribers.companyId, company.id), eq(newsletterSubscribers.id, subscriberId))).then((rows) => rows[0] ?? null);
      if (!existing) throw notFound("Subscriber not found");
      if (existing.status !== "paid") {
        await db.update(newsletterSubscribers).set({
          status: "paid",
          paidAt: /* @__PURE__ */ new Date(),
          lastCheckoutMode: "demo",
          lastCheckoutAt: /* @__PURE__ */ new Date(),
          totalRevenueCents: existing.totalRevenueCents + DEFAULT_PRICE_CENTS,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(newsletterSubscribers.id, existing.id));
        await db.insert(revenueEvents).values({
          companyId: company.id,
          source: "manual",
          eventType: "subscription_created",
          amountCents: DEFAULT_PRICE_CENTS,
          currency: "usd",
          customerEmail: existing.email,
          productId: product.id,
          metadata: { product: product.slug, productId: product.id, subscriberId: existing.id, mode: "demo" },
          occurredAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        });
      }
      await syncUserMetrics(company.id, product.id);
      await recordNewsletterHealth(company.id, product.id, "healthy");
      return { ok: true, redirectUrl: `/${company.issuePrefix}/orient?checkout=success` };
    },
    unsubscribe: async (companyPrefix, email) => {
      const company = await getCompanyByPrefix(companyPrefix);
      const normalizedEmail = normalizeEmail(email);
      const existing = await db.select().from(newsletterSubscribers).where(and(eq(newsletterSubscribers.companyId, company.id), eq(newsletterSubscribers.email, normalizedEmail))).then((rows) => rows[0] ?? null);
      if (!existing) throw notFound("Subscriber not found");
      const updated = await db.update(newsletterSubscribers).set({ status: "unsubscribed", unsubscribedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq(newsletterSubscribers.id, existing.id)).returning().then((rows) => rows[0]);
      const productId = updated.productId ?? existing.productId;
      if (productId) await syncUserMetrics(company.id, productId);
      return asSubscriber(updated);
    },
    handleStripeEvent: async (companyId, payload) => {
      const eventType = typeof payload.type === "string" ? payload.type : "";
      const eventObject = typeof payload.data === "object" && payload.data !== null && typeof payload.data.object === "object" ? payload.data.object : null;
      if (!eventObject) return null;
      const metadata = typeof eventObject.metadata === "object" && eventObject.metadata !== null ? eventObject.metadata : {};
      if (metadata.product !== "orient_weekly") return null;
      const productId = typeof metadata.productId === "string" ? metadata.productId : null;
      const subscriberId = typeof metadata.subscriberId === "string" ? metadata.subscriberId : null;
      const customerEmail = typeof eventObject.customer_email === "string" ? normalizeEmail(eventObject.customer_email) : typeof eventObject.customer_details === "object" && eventObject.customer_details !== null && typeof eventObject.customer_details.email === "string" ? normalizeEmail(eventObject.customer_details.email) : null;
      const subscriber = subscriberId ? await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.id, subscriberId)).then((rows) => rows[0] ?? null) : customerEmail ? await db.select().from(newsletterSubscribers).where(and(eq(newsletterSubscribers.companyId, companyId), eq(newsletterSubscribers.email, customerEmail))).then((rows) => rows[0] ?? null) : null;
      if (!subscriber) return null;
      let nextStatus = null;
      if (eventType === "checkout.session.completed" || eventType === "customer.subscription.created" || eventType === "invoice.payment_succeeded") {
        nextStatus = "paid";
      } else if (eventType === "customer.subscription.deleted") {
        nextStatus = "unsubscribed";
      }
      if (!nextStatus) return null;
      await db.update(newsletterSubscribers).set({
        status: nextStatus,
        paidAt: nextStatus === "paid" ? /* @__PURE__ */ new Date() : subscriber.paidAt,
        unsubscribedAt: nextStatus === "unsubscribed" ? /* @__PURE__ */ new Date() : subscriber.unsubscribedAt,
        stripeCustomerId: typeof eventObject.customer === "string" ? eventObject.customer : subscriber.stripeCustomerId,
        stripeSubscriptionId: typeof eventObject.subscription === "string" ? eventObject.subscription : subscriber.stripeSubscriptionId,
        totalRevenueCents: nextStatus === "paid" ? Math.max(subscriber.totalRevenueCents, DEFAULT_PRICE_CENTS) : subscriber.totalRevenueCents,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(newsletterSubscribers.id, subscriber.id));
      const resolvedProductId = productId ?? subscriber.productId;
      if (resolvedProductId) await syncUserMetrics(companyId, resolvedProductId);
      return { subscriberId: subscriber.id, status: nextStatus };
    },
    summary: async (companyId) => {
      const company = await db.select().from(companies).where(eq(companies.id, companyId)).then((rows2) => rows2[0] ?? null);
      if (!company) throw notFound("Company not found");
      const config = await configs.get(companyId);
      const product = await ensureNewsletterProduct(company.id, company.issuePrefix, config);
      const rows = await db.select().from(newsletterSubscribers).where(and(eq(newsletterSubscribers.companyId, companyId), eq(newsletterSubscribers.productId, product.id))).orderBy(desc(newsletterSubscribers.createdAt));
      const total = rows.length;
      const pending = rows.filter((row) => row.status === "pending").length;
      const paid = rows.filter((row) => row.status === "paid").length;
      const unsubscribed = rows.filter((row) => row.status === "unsubscribed").length;
      return {
        companyId,
        productName: product.name,
        landingPath: product.landingPath ?? `/${company.issuePrefix}/orient`,
        healthPath: product.healthPath ?? `/api/public/newsletter/${company.issuePrefix}/health`,
        subscribers: { total, pending, paid, unsubscribed },
        mrrCents: paid * DEFAULT_PRICE_CENTS,
        recentSubscribers: rows.slice(0, 10).map(asSubscriber)
      };
    },
    listSubscribers: async (companyId) => {
      const config = await configs.get(companyId);
      const company = await db.select().from(companies).where(eq(companies.id, companyId)).then((rows2) => rows2[0] ?? null);
      if (!company) throw notFound("Company not found");
      const product = await ensureNewsletterProduct(company.id, company.issuePrefix, config);
      const rows = await db.select().from(newsletterSubscribers).where(and(eq(newsletterSubscribers.companyId, companyId), eq(newsletterSubscribers.productId, product.id))).orderBy(desc(newsletterSubscribers.createdAt));
      return rows.map(asSubscriber);
    },
    publicHealth: async (companyPrefix) => {
      const company = await getCompanyByPrefix(companyPrefix);
      const config = await configs.get(company.id);
      const product = await ensureNewsletterProduct(company.id, company.issuePrefix, config);
      await recordNewsletterHealth(company.id, product.id, "healthy");
      return { status: "ok", product: DEFAULT_PRODUCT_NAME, companyPrefix: company.issuePrefix };
    }
  };
}
export {
  newsletterService
};
