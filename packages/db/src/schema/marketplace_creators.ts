import { pgTable, uuid, text, timestamp, boolean, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { authUsers } from "./auth.js";

export const marketplaceCreators = pgTable(
  "marketplace_creators",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().references(() => authUsers.id),
    displayName: text("display_name").notNull(),
    slug: text("slug").notNull(),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    website: text("website"),
    verified: boolean("verified").notNull().default(false),
    stripeAccountId: text("stripe_account_id"),
    totalInstalls: integer("total_installs").notNull().default(0),
    totalRevenueCents: integer("total_revenue_cents").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugUniqueIdx: uniqueIndex("marketplace_creators_slug_idx").on(table.slug),
    userIdUniqueIdx: uniqueIndex("marketplace_creators_user_id_idx").on(table.userId),
  }),
);
