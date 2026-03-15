import { pgTable, uuid, text, timestamp, integer, jsonb, boolean, index, uniqueIndex, real } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { issues } from "./issues.js";
import { agents } from "./agents.js";
import { heartbeatRuns } from "./heartbeat_runs.js";
import { costEvents } from "./cost_events.js";

export const telemetryRecords = pgTable(
  "telemetry_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    issueId: uuid("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
    executionAgentId: uuid("execution_agent_id").notNull().references(() => agents.id),
    heartbeatRunId: uuid("heartbeat_run_id").notNull().references(() => heartbeatRuns.id),
    costEventId: uuid("cost_event_id").references(() => costEvents.id, { onDelete: "set null" }),
    adapterType: text("adapter_type").notNull().default("unknown"),
    adapterToolName: text("adapter_tool_name").notNull().default("heartbeat.execute"),
    status: text("status").notNull(),
    successBoolean: boolean("success_boolean"),
    errorClassification: text("error_classification"),
    retryClassification: text("retry_classification"),
    retryAttempt: integer("retry_attempt").notNull().default(0),
    latencyMs: integer("latency_ms"),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costCents: integer("cost_cents").notNull().default(0),
    pressureCostRatio: real("pressure_cost_ratio"),
    pressureErrorRatio: real("pressure_error_ratio"),
    pressureRoutedAction: text("pressure_routed_action"),
    pressureRouted: boolean("pressure_routed").notNull().default(false),
    confidence: real("confidence"),
    blockers: jsonb("blockers").$type<string[]>().notNull().default([]),
    evidenceRefs: jsonb("evidence_refs").$type<string[]>().notNull().default([]),
    rawOutput: jsonb("raw_output").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIssueCreatedIdx: index("telemetry_records_company_issue_created_idx").on(
      table.companyId,
      table.issueId,
      table.createdAt,
    ),
    companyRunIdx: uniqueIndex("telemetry_records_company_run_idx").on(table.companyId, table.heartbeatRunId),
    executionAgentCreatedIdx: index("telemetry_records_execution_agent_created_idx").on(
      table.executionAgentId,
      table.createdAt,
    ),
    companyRerouteCreatedIdx: index("telemetry_records_company_reroute_created_idx").on(
      table.companyId,
      table.pressureRoutedAction,
      table.createdAt,
    ),
  }),
);