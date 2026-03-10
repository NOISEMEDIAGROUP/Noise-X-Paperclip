import { pgTable, uuid, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { marketplaceListings } from "./marketplace_listings.js";

export const marketplaceStars = pgTable(
  "marketplace_stars",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id").notNull().references(() => marketplaceListings.id),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userListingUniqueIdx: uniqueIndex("marketplace_stars_user_listing_idx").on(
      table.userId,
      table.listingId,
    ),
  }),
);
