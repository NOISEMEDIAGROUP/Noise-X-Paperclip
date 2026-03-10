import { pgTable, uuid, text, integer, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { marketplaceListings } from "./marketplace_listings.js";

export const marketplaceReviews = pgTable(
  "marketplace_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id").notNull().references(() => marketplaceListings.id),
    authorUserId: text("author_user_id").notNull(),
    authorDisplayName: text("author_display_name").notNull(),
    rating: integer("rating").notNull(), // 1-5
    title: text("title"),
    body: text("body"),
    verifiedPurchase: boolean("verified_purchase").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    listingIdx: index("marketplace_reviews_listing_idx").on(table.listingId),
    authorIdx: index("marketplace_reviews_author_idx").on(table.authorUserId),
  }),
);
