export const queryKeys = {
  companies: {
    all: ["companies"] as const,
    detail: (id: string) => ["companies", id] as const,
    stats: ["companies", "stats"] as const,
  },
  agents: {
    list: (companyId: string) => ["agents", companyId] as const,
    detail: (id: string) => ["agents", "detail", id] as const,
    runtimeState: (id: string) => ["agents", "runtime-state", id] as const,
    taskSessions: (id: string) => ["agents", "task-sessions", id] as const,
    keys: (agentId: string) => ["agents", "keys", agentId] as const,
    configRevisions: (agentId: string) => ["agents", "config-revisions", agentId] as const,
  },
  issues: {
    list: (companyId: string) => ["issues", companyId] as const,
    search: (companyId: string, q: string, projectId?: string) =>
      ["issues", companyId, "search", q, projectId ?? "__all-projects__"] as const,
    listAssignedToMe: (companyId: string) => ["issues", companyId, "assigned-to-me"] as const,
    labels: (companyId: string) => ["issues", companyId, "labels"] as const,
    listByProject: (companyId: string, projectId: string) =>
      ["issues", companyId, "project", projectId] as const,
    detail: (id: string) => ["issues", "detail", id] as const,
    comments: (issueId: string) => ["issues", "comments", issueId] as const,
    attachments: (issueId: string) => ["issues", "attachments", issueId] as const,
    activity: (issueId: string) => ["issues", "activity", issueId] as const,
    runs: (issueId: string) => ["issues", "runs", issueId] as const,
    approvals: (issueId: string) => ["issues", "approvals", issueId] as const,
    liveRuns: (issueId: string) => ["issues", "live-runs", issueId] as const,
    activeRun: (issueId: string) => ["issues", "active-run", issueId] as const,
  },
  projects: {
    list: (companyId: string) => ["projects", companyId] as const,
    detail: (id: string) => ["projects", "detail", id] as const,
  },
  goals: {
    list: (companyId: string) => ["goals", companyId] as const,
    detail: (id: string) => ["goals", "detail", id] as const,
  },
  approvals: {
    list: (companyId: string, status?: string) =>
      ["approvals", companyId, status] as const,
    detail: (approvalId: string) => ["approvals", "detail", approvalId] as const,
    comments: (approvalId: string) => ["approvals", "comments", approvalId] as const,
    issues: (approvalId: string) => ["approvals", "issues", approvalId] as const,
  },
  access: {
    joinRequests: (companyId: string, status: string = "pending_approval") =>
      ["access", "join-requests", companyId, status] as const,
    invite: (token: string) => ["access", "invite", token] as const,
  },
  auth: {
    session: ["auth", "session"] as const,
  },
  health: ["health"] as const,
  secrets: {
    list: (companyId: string) => ["secrets", companyId] as const,
    providers: (companyId: string) => ["secret-providers", companyId] as const,
  },
  skills: {
    list: (companyId: string) => ["skills", companyId] as const,
    detail: (companyId: string, skillId: string) => ["skills", companyId, skillId] as const,
  },
  dashboard: (companyId: string) => ["dashboard", companyId] as const,
  sidebarBadges: (companyId: string) => ["sidebar-badges", companyId] as const,
  activity: (companyId: string) => ["activity", companyId] as const,
  costs: (companyId: string, from?: string, to?: string) =>
    ["costs", companyId, from, to] as const,
  heartbeats: (companyId: string, agentId?: string) =>
    ["heartbeats", companyId, agentId] as const,
  liveRuns: (companyId: string) => ["live-runs", companyId] as const,
  runIssues: (runId: string) => ["run-issues", runId] as const,
  org: (companyId: string) => ["org", companyId] as const,
  // Department query keys
  departments: {
    status: (companyId: string) => ["departments", "status", companyId] as const,
  },
  // Product query keys
  products: {
    list: (companyId: string) => ["products", companyId] as const,
    analytics: (companyId: string, productId: string) => ["products", "analytics", companyId, productId] as const,
  },
  // Newsletter query keys
  newsletter: {
    subscribers: (companyId: string) => ["newsletter", "subscribers", companyId] as const,
    summary: (companyId: string) => ["newsletter", "summary", companyId] as const,
    landing: (companyId: string) => ["newsletter", "landing", companyId] as const,
  },
  // Objectives query keys
  objectives: {
    list: (companyId: string) => ["objectives", companyId] as const,
  },
  // Business OS query keys
  businessOs: {
    kpis: (companyId: string) => ["businessOs", "kpis", companyId] as const,
    costs: (companyId: string) => ["businessOs", "costs", companyId] as const,
    users: (companyId: string) => ["businessOs", "users", companyId] as const,
    notifications: (companyId: string) => ["businessOs", "notifications", companyId] as const,
    finance: (companyId: string) => ["businessOs", "finance", companyId] as const,
    health: (companyId: string) => ["businessOs", "health", companyId] as const,
    revenue: (companyId: string) => ["businessOs", "revenue", companyId] as const,
    integrationStatus: (companyId: string) => ["businessOs", "integrationStatus", companyId] as const,
    config: (companyId: string) => ["businessOs", "config", companyId] as const,
  },
// Portfolio query keys
  portfolio: ["portfolio"] as const,
  // Governance query keys
  governance: {
    policies: (companyId: string) => ["governance", "policies", companyId] as const,
    catalog: (companyId: string) => ["governance", "catalog", companyId] as const,
  },
  // Integration recommendation query keys
  integrationBlocks: (companyId: string) => ["integration-blocks", companyId] as const,
  integrationRecommendations: (companyId: string) => ["integration-recommendations", companyId] as const,
  integrationCatalog: ["integration-catalog"] as const,
};
