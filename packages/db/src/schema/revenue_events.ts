// @ts-nocheck
import { pgTable, uuid, text, timestamp, integer, index, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
const revenueEvents = pgTable(
  "revenue_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    source: text("source").notNull(),
    eventType: text("event_type").notNull(),
    stripeEventId: text("stripe_event_id"),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("usd"),
    customerId: text("customer_id"),
    customerEmail: text("customer_email"),
    subscriptionId: text("subscription_id"),
    productId: text("product_id"),
    metadata: jsonb("metadata").$type().notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    companyOccurredIdx: index("revenue_events_company_occurred_idx").on(table.companyId, table.occurredAt),
    companyTypeOccurredIdx: index("revenue_events_company_type_occurred_idx").on(
      table.companyId,
      table.eventType,
      table.occurredAt
    ),
    stripeEventUniqueIdx: uniqueIndex("revenue_events_stripe_event_idx").on(table.stripeEventId)
  })
);
export {
  revenueEvents
};
