import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { workflows } from "./workflows.js";

export const workflowWebhooks = pgTable(
  "workflow_webhooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    workflowId: uuid("workflow_id").notNull().references(() => workflows.id, { onDelete: "cascade" }),
    webhookUrl: text("webhook_url").notNull(),
    webhookSecret: text("webhook_secret").notNull(), // For HMAC validation
    isActive: text("is_active").notNull().default("true"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workflowIdIdx: index("workflow_webhooks_workflow_id_idx").on(table.workflowId),
    companyIdIdx: index("workflow_webhooks_company_id_idx").on(table.companyId),
  }),
);
