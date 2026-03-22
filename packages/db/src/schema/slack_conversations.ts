import { pgTable, uuid, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

const slackConversations = pgTable(
  "slack_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    channelId: text("channel_id").notNull(),
    channelName: text("channel_name"),
    threadTs: text("thread_ts"),
    agentId: uuid("agent_id"),
    issueId: uuid("issue_id"),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyChannelThreadIdx: uniqueIndex("slack_conv_company_channel_thread_idx").on(
      table.companyId,
      table.channelId,
      table.threadTs,
    ),
  }),
);

export { slackConversations };
