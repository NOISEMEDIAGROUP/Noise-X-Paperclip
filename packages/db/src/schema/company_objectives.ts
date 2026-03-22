// @ts-nocheck
import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  date,
  index
} from "drizzle-orm/pg-core";
import { agents } from "./agents.js";
import { companies } from "./companies.js";
const companyObjectives = pgTable(
  "company_objectives",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    title: text("title").notNull(),
    description: text("description"),
    objectiveType: text("objective_type").notNull().default("quarterly"),
    // quarterly, monthly, sprint
    status: text("status").notNull().default("proposed"),
    // proposed, approved, active, achieved, missed
    targetMetric: text("target_metric"),
    targetValue: numeric("target_value"),
    currentValue: numeric("current_value").default("0"),
    proposedBy: uuid("proposed_by").references(() => agents.id),
    approvedBy: text("approved_by"),
    // board user id
    deadline: date("deadline"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    companyIdx: index("company_objectives_company_idx").on(table.companyId)
  })
);
const keyResults = pgTable(
  "key_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    objectiveId: uuid("objective_id").notNull().references(() => companyObjectives.id),
    title: text("title").notNull(),
    targetValue: numeric("target_value").notNull(),
    currentValue: numeric("current_value").default("0"),
    assignedTo: uuid("assigned_to").references(() => agents.id),
    status: text("status").notNull().default("pending"),
    // pending, in_progress, done, missed
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    objectiveIdx: index("key_results_objective_idx").on(table.objectiveId)
  })
);
export {
  companyObjectives,
  keyResults
};
