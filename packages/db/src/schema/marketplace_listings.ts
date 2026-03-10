import { pgTable, uuid, text, integer, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { marketplaceCreators } from "./marketplace_creators.js";

export const marketplaceListings = pgTable(
  "marketplace_listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorId: uuid("creator_id").notNull().references(() => marketplaceCreators.id),
    slug: text("slug").notNull(),
    type: text("type").notNull(), // 'team_blueprint' | 'agent_blueprint' | 'skill' | 'governance_template'
    title: text("title").notNull(),
    tagline: text("tagline"),
    description: text("description"),
    readmeMarkdown: text("readme_markdown"),

    // Pricing
    priceCents: integer("price_cents").notNull().default(0),
    currency: text("currency").notNull().default("usd"),

    // Categorization
    categories: jsonb("categories").$type<string[]>().notNull().default([]),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    agentCount: integer("agent_count"),

    // Content
    previewImages: jsonb("preview_images").$type<string[]>().notNull().default([]),
    compatibleAdapters: jsonb("compatible_adapters").$type<string[]>().notNull().default([]),
    requiredModels: jsonb("required_models").$type<string[]>().notNull().default([]),
    paperclipVersionMin: text("paperclip_version_min"),

    // Social proof
    installCount: integer("install_count").notNull().default(0),
    starCount: integer("star_count").notNull().default(0),
    ratingAvg: integer("rating_avg"), // stored as 10x (e.g. 45 = 4.5)
    reviewCount: integer("review_count").notNull().default(0),

    // Status
    status: text("status").notNull().default("draft"), // 'draft' | 'published' | 'archived'

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugUniqueIdx: uniqueIndex("marketplace_listings_slug_idx").on(table.slug),
    creatorIdx: index("marketplace_listings_creator_idx").on(table.creatorId),
    typeStatusIdx: index("marketplace_listings_type_status_idx").on(table.type, table.status),
    statusInstallIdx: index("marketplace_listings_status_install_idx").on(table.status, table.installCount),
  }),
);
