import { pgTable, uuid, text, timestamp, index, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").notNull().default("active"),
    productType: text("product_type").notNull().default("newsletter"),
    primaryChannel: text("primary_channel").notNull().default("email"),
    productUrl: text("product_url"),
    landingPath: text("landing_path"),
    healthPath: text("health_path"),
    ownerAgentId: uuid("owner_agent_id").references(() => agents.id),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index("products_company_idx").on(table.companyId),
    companySlugUniqueIdx: uniqueIndex("products_company_slug_idx").on(table.companyId, table.slug),
  }),
);
