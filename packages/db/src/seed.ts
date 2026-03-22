import { createDb } from "./client.js";
import { companies, agents, goals, projects, issues, integrationCatalog, integrationRecommendations } from "./schema/index.js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

const db = createDb(url);

console.log("Seeding database...");

const [company] = await db
  .insert(companies)
  .values({
    name: "Paperclip Demo Co",
    description: "A demo autonomous company",
    status: "active",
    budgetMonthlyCents: 50000,
  })
  .returning();

const [ceo] = await db
  .insert(agents)
  .values({
    companyId: company!.id,
    name: "CEO Agent",
    role: "ceo",
    title: "Chief Executive Officer",
    status: "idle",
    adapterType: "process",
    adapterConfig: { command: "echo", args: ["hello from ceo"] },
    budgetMonthlyCents: 15000,
  })
  .returning();

const [engineer] = await db
  .insert(agents)
  .values({
    companyId: company!.id,
    name: "Engineer Agent",
    role: "engineer",
    title: "Software Engineer",
    status: "idle",
    reportsTo: ceo!.id,
    adapterType: "process",
    adapterConfig: { command: "echo", args: ["hello from engineer"] },
    budgetMonthlyCents: 10000,
  })
  .returning();

const [goal] = await db
  .insert(goals)
  .values({
    companyId: company!.id,
    title: "Ship V1",
    description: "Deliver first control plane release",
    level: "company",
    status: "active",
    ownerAgentId: ceo!.id,
  })
  .returning();

const [project] = await db
  .insert(projects)
  .values({
    companyId: company!.id,
    goalId: goal!.id,
    name: "Control Plane MVP",
    description: "Implement core board + agent loop",
    status: "in_progress",
    leadAgentId: ceo!.id,
  })
  .returning();

await db.insert(issues).values([
  {
    companyId: company!.id,
    projectId: project!.id,
    goalId: goal!.id,
    title: "Implement atomic task checkout",
    description: "Ensure in_progress claiming is conflict-safe",
    status: "todo",
    priority: "high",
    assigneeAgentId: engineer!.id,
    createdByAgentId: ceo!.id,
  },
  {
    companyId: company!.id,
    projectId: project!.id,
    goalId: goal!.id,
    title: "Add budget auto-pause",
    description: "Pause agent at hard budget ceiling",
    status: "backlog",
    priority: "medium",
    createdByAgentId: ceo!.id,
  },
]);

// Seed integration catalog
await db.insert(integrationCatalog).values([
  // ============================================================================
  // Notifications - Free/Open-Source Options First
  // ============================================================================
  {
    id: "telegram",
    name: "Telegram",
    description: "Send messages and notifications to Telegram channels and groups",
    icon: "message-square",
    category: "notifications",
    isFree: true,
    isOpenSource: false,
    freeTierLimit: "Unlimited messages",
    paidPrice: null,
    paidUrl: null,
    setupTimeMinutes: 5,
    setupDifficulty: "easy",
    capabilities: ["send_messages", "send_files", "channel_notifications"],
    usedByAgents: ["ceo", "pm", "support_lead"],
  },
  {
    id: "discord",
    name: "Discord",
    description: "Send messages and notifications to Discord servers",
    icon: "message-circle",
    category: "notifications",
    isFree: true,
    isOpenSource: false,
    freeTierLimit: "Unlimited messages",
    paidPrice: null,
    paidUrl: null,
    setupTimeMinutes: 10,
    setupDifficulty: "easy",
    capabilities: ["send_messages", "send_files", "server_notifications"],
    usedByAgents: ["ceo", "pm", "engineer"],
  },
  {
    id: "slack",
    name: "Slack",
    description: "Send messages and notifications to Slack channels",
    icon: "slack",
    category: "notifications",
    isFree: true,
    isOpenSource: false,
    freeTierLimit: "10,000 messages/month",
    paidPrice: "$7.75/user/month",
    paidUrl: "https://slack.com/pricing",
    setupTimeMinutes: 15,
    setupDifficulty: "medium",
    capabilities: ["send_messages", "send_files", "channel_notifications", "threaded_replies"],
    usedByAgents: ["ceo", "pm", "engineer"],
  },
  // ============================================================================
  // Development
  // ============================================================================
  {
    id: "github",
    name: "GitHub",
    description: "Repository management, pull requests, and code review",
    icon: "github",
    category: "development",
    isFree: true,
    isOpenSource: false,
    freeTierLimit: "Unlimited public repos, 2000 minutes Actions/month",
    paidPrice: "$4/user/month",
    paidUrl: "https://github.com/pricing",
    setupTimeMinutes: 10,
    setupDifficulty: "easy",
    capabilities: ["repo_access", "pull_requests", "issues", "actions", "code_review"],
    usedByAgents: ["cto", "engineer", "qa"],
  },
  {
    id: "gitlab",
    name: "GitLab",
    description: "Self-hosted or cloud git repository management",
    icon: "gitlab",
    category: "development",
    isFree: true,
    isOpenSource: true,
    freeTierLimit: "Unlimited private repos (self-hosted)",
    paidPrice: "$29/user/month (cloud)",
    paidUrl: "https://about.gitlab.com/pricing/",
    setupTimeMinutes: 30,
    setupDifficulty: "medium",
    capabilities: ["repo_access", "merge_requests", "ci_cd", "issue_tracking"],
    usedByAgents: ["cto", "engineer", "devops"],
  },
  {
    id: "linear",
    name: "Linear",
    description: "Modern issue tracking and project management",
    icon: "linear",
    category: "development",
    isFree: true,
    isOpenSource: false,
    freeTierLimit: "10 users",
    paidPrice: "$8/user/month",
    paidUrl: "https://linear.app/pricing",
    setupTimeMinutes: 10,
    setupDifficulty: "easy",
    capabilities: ["issue_tracking", "project_management", "roadmap", "integrations"],
    usedByAgents: ["cto", "pm", "engineer"],
  },
  // ============================================================================
  // Payments
  // ============================================================================
  {
    id: "stripe",
    name: "Stripe",
    description: "Payment processing and subscription management",
    icon: "credit-card",
    category: "payments",
    isFree: true,
    isOpenSource: false,
    freeTierLimit: "2.9% + 30¢ per transaction",
    paidPrice: null,
    paidUrl: "https://stripe.com/pricing",
    setupTimeMinutes: 30,
    setupDifficulty: "medium",
    capabilities: ["payment_processing", "subscriptions", "invoices", "webhooks"],
    usedByAgents: ["cfo", "pm"],
  },
  {
    id: "lemonsqueezy",
    name: "Lemon Squeezy",
    description: "Payment processing with built-in tax handling",
    icon: "shopping-cart",
    category: "payments",
    isFree: true,
    isOpenSource: false,
    freeTierLimit: "5% + 50¢ per transaction",
    paidPrice: null,
    paidUrl: "https://lemonsqueezy.com/pricing",
    setupTimeMinutes: 20,
    setupDifficulty: "easy",
    capabilities: ["payment_processing", "subscriptions", "tax_handling", "licenses"],
    usedByAgents: ["cfo", "pm"],
  },
  // ============================================================================
  // Monitoring
  // ============================================================================
  {
    id: "sentry",
    name: "Sentry",
    description: "Error tracking and performance monitoring",
    icon: "alert-circle",
    category: "monitoring",
    isFree: true,
    isOpenSource: true,
    freeTierLimit: "5K errors/month",
    paidPrice: "$26/month",
    paidUrl: "https://sentry.io/pricing/",
    setupTimeMinutes: 15,
    setupDifficulty: "easy",
    capabilities: ["error_tracking", "performance_monitoring", "release_tracking"],
    usedByAgents: ["cto", "engineer", "qa"],
  },
  {
    id: "grafana",
    name: "Grafana",
    description: "Open-source observability and monitoring dashboards",
    icon: "bar-chart-2",
    category: "monitoring",
    isFree: true,
    isOpenSource: true,
    freeTierLimit: "Self-hosted: unlimited",
    paidPrice: "$49/user/month (cloud)",
    paidUrl: "https://grafana.com/pricing/",
    setupTimeMinutes: 45,
    setupDifficulty: "hard",
    capabilities: ["dashboards", "alerting", "data_visualization", "metrics"],
    usedByAgents: ["cto", "devops"],
  },
  // ============================================================================
  // Analytics
  // ============================================================================
  {
    id: "plausible",
    name: "Plausible",
    description: "Privacy-focused web analytics",
    icon: "bar-chart",
    category: "analytics",
    isFree: false,
    isOpenSource: true,
    freeTierLimit: null,
    paidPrice: "$9/month (10K pageviews)",
    paidUrl: "https://plausible.io/pricing",
    setupTimeMinutes: 5,
    setupDifficulty: "easy",
    capabilities: ["web_analytics", "privacy_focused", "simple_dashboard"],
    usedByAgents: ["cmo", "pm"],
  },
  {
    id: "posthog",
    name: "PostHog",
    description: "Open-source product analytics and feature flags",
    icon: "flag",
    category: "analytics",
    isFree: true,
    isOpenSource: true,
    freeTierLimit: "1M events/month (cloud) or self-hosted unlimited",
    paidPrice: "$0.00031/event after free tier",
    paidUrl: "https://posthog.com/pricing",
    setupTimeMinutes: 20,
    setupDifficulty: "medium",
    capabilities: ["product_analytics", "feature_flags", "session_replay", "experiments"],
    usedByAgents: ["cmo", "pm", "engineer"],
  },
  // ============================================================================
  // Customer Support
  // ============================================================================
  {
    id: "zendesk",
    name: "Zendesk",
    description: "Customer support and helpdesk platform",
    icon: "headphones",
    category: "notifications",
    isFree: false,
    isOpenSource: false,
    freeTierLimit: null,
    paidPrice: "$55/agent/month",
    paidUrl: "https://www.zendesk.com/pricing/",
    setupTimeMinutes: 60,
    setupDifficulty: "hard",
    capabilities: ["ticket_management", "knowledge_base", "live_chat", "reporting"],
    usedByAgents: ["support_lead", "cmo"],
  },
  {
    id: "intercom",
    name: "Intercom",
    description: "Customer messaging and support platform",
    icon: "message-square",
    category: "notifications",
    isFree: true,
    isOpenSource: false,
    freeTierLimit: "50 contacts, 100 conversations/month",
    paidPrice: "$29/month",
    paidUrl: "https://www.intercom.com/pricing",
    setupTimeMinutes: 30,
    setupDifficulty: "medium",
    capabilities: ["live_chat", "help_center", "customer_data", "workflows"],
    usedByAgents: ["support_lead", "cmo", "pm"],
  },
]).onConflictDoNothing();

// Seed integration recommendations based on agent roles
// CEO needs Telegram for daily briefs
await db.insert(integrationRecommendations).values({
  companyId: company!.id,
  agentId: ceo!.id,
  agentRole: "ceo",
  integrationId: "telegram",
  integrationName: "Telegram",
  reason: "CEO needs Telegram to send daily briefs",
  useCase: "daily_briefs",
  priority: 2,
  isFree: true,
  isOpenSource: false,
  pricingNotes: "Unlimited messages",
  status: "pending",
}).onConflictDoNothing();

// Engineer needs GitHub for code management
await db.insert(integrationRecommendations).values({
  companyId: company!.id,
  agentId: engineer!.id,
  agentRole: "engineer",
  integrationId: "github",
  integrationName: "GitHub",
  reason: "Engineer needs GitHub for code management",
  useCase: "code_management",
  priority: 1,
  isFree: true,
  isOpenSource: false,
  pricingNotes: "Unlimited public repos, 2000 minutes Actions/month",
  status: "pending",
}).onConflictDoNothing();

console.log("Seed complete");
process.exit(0);
