import { pgTable, uuid, text, timestamp, date, integer, index, jsonb, unique } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { projects } from "./projects.js";

export interface ProjectTechStack {
  framework: string;
  runtime: string;
  css: string;
  stateManagement?: string;
  orm?: string;
  additionalLibs?: string[];
}

export interface ProjectModuleStats {
  pages?: number;
  apiEndpoints?: number;
  hooks?: number;
  queries?: number;
  parsers?: number;
  schemas?: number;
}

export interface ProjectIosCompanion {
  repoName: string;
  framework: string;
  minVersion?: string;
}

export const projectProfiles = pgTable(
  "project_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    slug: text("slug").notNull(),
    customerName: text("customer_name"),
    customerContact: text("customer_contact"),
    businessModel: text("business_model"),
    productionUrl: text("production_url"),
    stagingUrl: text("staging_url"),
    hostPort: integer("host_port"),
    vpsDirectory: text("vps_directory"),
    dbSchema: text("db_schema"),
    techStack: jsonb("tech_stack").$type<ProjectTechStack>(),
    moduleStats: jsonb("module_stats").$type<ProjectModuleStats>(),
    iosCompanion: jsonb("ios_companion").$type<ProjectIosCompanion>(),
    features: jsonb("features").$type<Record<string, unknown>>(),
    phase: text("phase").notNull().default("development"),
    launchedAt: date("launched_at"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectIdx: unique("project_profiles_project_idx").on(table.projectId),
    slugIdx: unique("project_profiles_slug_idx").on(table.slug),
    companyIdx: index("project_profiles_company_idx").on(table.companyId),
  }),
);
