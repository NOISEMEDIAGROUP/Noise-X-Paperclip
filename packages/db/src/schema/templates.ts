import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  real,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { agents, companies, authUsers } from "./index.js";

/**
 * Template library (pre-built templates)
 */
export const templates = pgTable(
  "templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").unique().notNull(),
    category: text("category").notNull(), // 'agent', 'workflow', 'knowledge-base'
    description: text("description"),
    thumbnailUrl: text("thumbnail_url"),
    previewData: jsonb("preview_data").$type<Record<string, unknown>>(),
    configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull(),
    version: text("version").notNull().default("1.0.0"),
    isPublic: boolean("is_public").default(true),
    rating: real("rating").default(0.0),
    downloadCount: integer("download_count").default(0),
    author: text("author"),
    tags: text("tags").array(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    categoryIdx: index("templates_category_idx").on(table.category),
    nameIdx: index("templates_name_idx").on(table.name),
  })
);

/**
 * Template usage tracking
 */
export const templateUsage = pgTable(
  "template_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => templates.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
    workflowId: uuid("workflow_id"),
    customizations: jsonb("customizations").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    companyIdx: index("template_usage_company_idx").on(table.companyId),
    templateIdx: index("template_usage_template_idx").on(table.templateId),
    uniqueUsage: uniqueIndex("template_usage_unique").on(
      table.templateId,
      table.companyId,
      table.agentId
    ),
  })
);

/**
 * Template ratings
 */
export const templateRatings = pgTable(
  "template_ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => templates.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    reviewText: text("review_text"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    templateIdx: index("template_ratings_template_idx").on(table.templateId),
    uniqueRating: uniqueIndex("template_ratings_unique").on(
      table.templateId,
      table.userId
    ),
  })
);

/**
 * PWA Configuration
 */
export const pwaConfig = pgTable("pwa_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().default("Paperclip"),
  shortName: text("short_name").notNull().default("Paperclip"),
  description: text("description"),
  iconUrl: text("icon_url"),
  themeColor: text("theme_color").default("#2563eb"),
  backgroundColor: text("background_color").default("#ffffff"),
  orientation: text("orientation").default("portrait-primary"),
  display: text("display").default("standalone"),
  startUrl: text("start_url").default("/"),
  scope: text("scope").default("/"),
  categories: text("categories").array(),
  screenshots: jsonb("screenshots").$type<Record<string, unknown>>(),
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Landing Page Configuration
 */
export const landingPageConfig = pgTable("landing_page_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  heroTitle: text("hero_title")
    .notNull()
    .default("Unified Agentic Business Platform"),
  heroSubtitle: text("hero_subtitle"),
  heroImageUrl: text("hero_image_url"),
  features: jsonb("features").$type<Record<string, unknown>[]>().notNull().default([]),
  pricingTiers: jsonb("pricing_tiers").$type<Record<string, unknown>>(),
  faqs: jsonb("faqs").$type<Record<string, unknown>[]>().default([]),
  ctaButtonText: text("cta_button_text").default("Get Started"),
  ctaButtonUrl: text("cta_button_url").default("/signup"),
  footerLinks: jsonb("footer_links").$type<Record<string, unknown>>(),
  socialLinks: jsonb("social_links").$type<Record<string, unknown>>(),
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
