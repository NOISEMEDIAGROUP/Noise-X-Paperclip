import { pgTable, uuid, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { agents } from "./agents.js";

export const projectAgents = pgTable(
  "project_agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueProjectAgent: uniqueIndex("project_agents_project_agent_idx").on(table.projectId, table.agentId),
    agentIdx: index("project_agents_agent_idx").on(table.agentId),
  }),
);
