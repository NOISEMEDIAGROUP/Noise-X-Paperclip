import { pgTable, uuid, text, timestamp, integer, index, jsonb } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { projects } from "./projects.js";

export const projectScrapers = pgTable(
  "project_scrapers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    name: text("name").notNull(),
    port: integer("port"),
    vpsDirectory: text("vps_directory"),
    status: text("status").notNull().default("active"),
    healthCheckUrl: text("health_check_url"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectIdx: index("project_scrapers_project_idx").on(table.projectId),
    companyIdx: index("project_scrapers_company_idx").on(table.companyId),
  }),
);
