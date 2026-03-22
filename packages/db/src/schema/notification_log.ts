// @ts-nocheck
import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
const notificationLog = pgTable(
  "notification_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    channel: text("channel").notNull(),
    recipient: text("recipient").notNull(),
    notificationType: text("notification_type").notNull(),
    subject: text("subject"),
    body: text("body").notNull(),
    status: text("status").notNull().default("queued"),
    error: text("error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    companyCreatedIdx: index("notification_log_company_created_idx").on(table.companyId, table.createdAt),
    companyTypeCreatedIdx: index("notification_log_company_type_created_idx").on(
      table.companyId,
      table.notificationType,
      table.createdAt
    )
  })
);
export {
  notificationLog
};
