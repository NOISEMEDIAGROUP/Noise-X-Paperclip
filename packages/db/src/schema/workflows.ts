import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export interface WorkflowStepDefinition {
  stepIndex: number;
  name: string;
  agentId: string | null;
  conditions?: Record<string, unknown>;
  requiresApproval?: boolean;
}

export const workflows = pgTable(
  "workflows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    name: text("name").notNull(),
    description: text("description"),
    steps: jsonb("steps").$type<WorkflowStepDefinition[]>().notNull(),
    enabled: text("enabled").notNull().default("true"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index("workflows_company_idx").on(table.companyId),
  }),
);
