// @ts-nocheck
import { pgTable, uuid, text, timestamp, jsonb, index, uniqueIndex, integer } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { products } from "./products.js";
const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    productId: uuid("product_id").references(() => products.id),
    email: text("email").notNull(),
    fullName: text("full_name"),
    status: text("status").notNull().default("pending"),
    source: text("source").notNull().default("landing_page"),
    tags: jsonb("tags").$type().notNull().default([]),
    metadata: jsonb("metadata").$type().notNull().default({}),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    lastCheckoutMode: text("last_checkout_mode"),
    lastCheckoutAt: timestamp("last_checkout_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    totalRevenueCents: integer("total_revenue_cents").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    companyCreatedIdx: index("newsletter_subscribers_company_created_idx").on(table.companyId, table.createdAt),
    companyStatusIdx: index("newsletter_subscribers_company_status_idx").on(table.companyId, table.status),
    companyEmailUniqueIdx: uniqueIndex("newsletter_subscribers_company_email_idx").on(table.companyId, table.email)
  })
);
export {
  newsletterSubscribers
};
