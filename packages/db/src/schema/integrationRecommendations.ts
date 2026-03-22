import { pgTable, uuid, text, timestamp, jsonb, boolean, integer, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";
import { issues } from "./issues.js";

// ============================================================================
// Integration Catalog - Master list of supported integrations
// ============================================================================

export const integrationCatalog = pgTable(
  "integration_catalog",
  {
    id: text("id").primaryKey(), // 'telegram', 'stripe', 'github', etc.
    name: text("name").notNull(),
    description: text("description"),
    icon: text("icon"), // lucide icon name
    category: text("category").notNull(), // 'notifications', 'payments', 'monitoring', etc.
    
    // Pricing info
    isFree: boolean("is_free").notNull().default(false),
    isOpenSource: boolean("is_open_source").notNull().default(false),
    freeTierLimit: text("free_tier_limit"), // "10 users", "1000 emails/month"
    paidPrice: text("paid_price"), // "$7.75/user/month"
    paidUrl: text("paid_url"), // pricing page URL
    
    // Setup info
    setupTimeMinutes: integer("setup_time_minutes").notNull().default(5),
    setupDifficulty: text("setup_difficulty").notNull().default("easy"), // 'easy', 'medium', 'hard'
    
    // Capabilities and usage
    capabilities: jsonb("capabilities").$type<string[]>().notNull().default([]),
    usedByAgents: jsonb("used_by_agents").$type<string[]>().notNull().default([]), // ['ceo', 'pm', 'support_lead']
    
    // Integration config reference
    configId: text("config_id"), // Reference to integrationConfigs.ts
    
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    categoryIdx: index("integration_catalog_category_idx").on(table.category),
    isFreeIdx: index("integration_catalog_is_free_idx").on(table.isFree),
  }),
);

// ============================================================================
// Integration Recommendations - Suggestions from agents
// ============================================================================

export const integrationRecommendations = pgTable(
  "integration_recommendations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    
    // Who recommended this
    agentId: uuid("agent_id").references(() => agents.id),
    agentRole: text("agent_role"), // 'ceo', 'pm', 'cto', etc.
    
    // What integration
    integrationId: text("integration_id").notNull(), // 'telegram', 'linear', 'stripe'
    integrationName: text("integration_name").notNull(),
    
    // Why recommended
    reason: text("reason").notNull(), // "for daily briefs", "for error tracking"
    useCase: text("use_case"), // "daily_briefs", "error_tracking", "payments"
    
    // Priority and pricing info (cached from catalog)
    priority: integer("priority").notNull().default(0), // 0 = high priority
    isFree: boolean("is_free").notNull().default(true),
    isOpenSource: boolean("is_open_source").notNull().default(false),
    pricingNotes: text("pricing_notes"), // "Free tier: 10 users", "$7.75/user/month"
    
    // Context
    taskId: uuid("task_id").references(() => issues.id), // Task that triggered recommendation
    taskTitle: text("task_title"),
    
    // Status
    status: text("status").notNull().default("pending"), // 'pending', 'dismissed', 'connected'
    connectedAt: timestamp("connected_at", { withTimezone: true }),
    
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyStatusIdx: index("integration_recommendations_company_status_idx").on(
      table.companyId,
      table.status,
    ),
    integrationIdx: index("integration_recommendations_integration_idx").on(table.integrationId),
    agentIdx: index("integration_recommendations_agent_idx").on(table.agentId),
    // Unique constraint: one recommendation per integration per agent per company
    uniqueCompanyIntegrationAgent: index("integration_recommendations_unique_idx").on(
      table.companyId,
      table.integrationId,
      table.agentId,
    ),
  }),
);

// ============================================================================
// Integration Blocks - When agent is blocked by missing integration
// ============================================================================

export const integrationBlocks = pgTable(
  "integration_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    
    // What was blocked
    agentId: uuid("agent_id").references(() => agents.id),
    agentRole: text("agent_role"),
    taskId: uuid("task_id").references(() => issues.id),
    taskTitle: text("task_title"),
    
    // What integration was needed
    integrationId: text("integration_id").notNull(),
    integrationName: text("integration_name").notNull(),
    
    // Message to user (clear, simple)
    message: text("message").notNull(), // "CEO needs Telegram to send daily briefs"
    
    // Severity
    isCritical: boolean("is_critical").notNull().default(false), // true = modal, false = banner
    
    // Resolution
    status: text("status").notNull().default("pending"), // 'pending', 'dismissed', 'resolved'
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: text("resolved_by"), // 'user_setup', 'user_skip', 'agent_alternative'
    
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyStatusIdx: index("integration_blocks_company_status_idx").on(
      table.companyId,
      table.status,
    ),
    agentIdx: index("integration_blocks_agent_idx").on(table.agentId),
    taskIdx: index("integration_blocks_task_idx").on(table.taskId),
  }),
);