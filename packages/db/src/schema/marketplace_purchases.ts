import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { marketplaceListings } from "./marketplace_listings.js";
import { marketplaceVersions } from "./marketplace_versions.js";
import { companies } from "./companies.js";

export const marketplacePurchases = pgTable(
  "marketplace_purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id").notNull().references(() => marketplaceListings.id),
    versionId: uuid("version_id").references(() => marketplaceVersions.id),
    buyerUserId: text("buyer_user_id").notNull(),
    buyerCompanyId: uuid("buyer_company_id").references(() => companies.id),
    pricePaidCents: integer("price_paid_cents").notNull().default(0),
    paymentIntentId: text("payment_intent_id"), // Stripe
    status: text("status").notNull().default("completed"), // 'pending' | 'completed' | 'refunded'
    installedAt: timestamp("installed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    buyerIdx: index("marketplace_purchases_buyer_idx").on(table.buyerUserId),
    listingIdx: index("marketplace_purchases_listing_idx").on(table.listingId),
  }),
);
