import { pgTable, uuid, text, timestamp, jsonb, integer, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { workflows } from "./workflows.js";
import { issues } from "./issues.js";

export const workflowRuns = pgTable(
  "workflow_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    workflowId: uuid("workflow_id").notNull().references(() => workflows.id),
    issueId: uuid("issue_id").references(() => issues.id),
    currentStepIndex: integer("current_step_index").notNull().default(0),
    status: text("status").notNull().default("running"),
    state: jsonb("state").$type<Record<string, unknown>>().notNull().default({}),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index("workflow_runs_company_idx").on(table.companyId),
    workflowIdx: index("workflow_runs_workflow_idx").on(table.workflowId),
    issueIdx: index("workflow_runs_issue_idx").on(table.issueId),
    statusIdx: index("workflow_runs_status_idx").on(table.companyId, table.status),
  }),
);
