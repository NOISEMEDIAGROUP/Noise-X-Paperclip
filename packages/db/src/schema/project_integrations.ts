import { pgTable, uuid, text, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { projects } from "./projects.js";

export const projectIntegrations = pgTable(
  "project_integrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    integrationType: text("integration_type").notNull(),
    name: text("name").notNull(),
    config: jsonb("config").$type<Record<string, unknown>>(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectIdx: index("project_integrations_project_idx").on(table.projectId),
    companyIdx: index("project_integrations_company_idx").on(table.companyId),
  }),
);
