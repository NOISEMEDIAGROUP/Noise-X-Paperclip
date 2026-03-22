#!/usr/bin/env tsx
/**
 * Paperclip seed/import script
 *
 * Usage:
 *   pnpm dlx tsx scripts/add-engineering-team.ts
 *
 * What it does:
 *   1. Creates a project
 *   2. Creates agents with detailed roles/prompts
 *   3. Links reporting lines
 *   4. Creates starter issues assigned to the right agents
 *
 * Assumptions:
 *   - Paperclip is running locally
 *   - A compatible local API is exposed
 *   - Environment variables below are set if your local URLs differ
 *
 * Notes:
 *   The Paperclip public docs do not currently publish a stable import schema
 *   for the exact UI shown in your screenshots, so this script is written as a
 *   pragmatic local seeder against a configurable JSON API. If one endpoint
 *   name differs in your checkout, adjust only the API path constants below.
 */

type Id = string;

type AgentSeed = {
  key: string;
  name: string;
  role: string;
  reportsTo?: string;
  tags?: string[];
  adapter: {
    type: "codex_local";
    command: string;
    model: string;
    workingDirectory: string;
    promptTemplate: string;
    instructionsFile?: string;
    bypassSandbox?: boolean;
    enableSearch?: boolean;
    thinkingEffort?: "low" | "medium" | "high" | "auto";
    extraArgs?: string[];
    env?: Record<string, string>;
    heartbeatMinutes?: number | null;
  };
  initialContext: {
    mission: string;
    responsibilities: string[];
    kpis: string[];
    constraints: string[];
    handoffRules: string[];
  };
};

type IssueSeed = {
  title: string;
  body: string;
  assignee: string;
  labels?: string[];
  priority?: "low" | "medium" | "high" | "critical";
};

type ProjectSeed = {
  name: string;
  description: string;
  mission: string;
  website: string;
  businessModel: string;
  complianceNotes: string[];
  agents: AgentSeed[];
  issues: IssueSeed[];
};

const BASE_URL = process.env.PAPERCLIP_BASE_URL ?? "http://127.0.0.1:3100";
const API_PREFIX = process.env.PAPERCLIP_API_PREFIX ?? "/api";
const WORKSPACE_ROOT =
  process.env.PAPERCLIP_WORKSPACE_ROOT ??
  "/Users/your-user/path/to/breathing-protocol-mvp";
const INSTRUCTIONS_ROOT =
  process.env.PAPERCLIP_INSTRUCTIONS_ROOT ??
  "/Users/your-user/path/to/paperclip-agent-instructions";

const API = {
  projects: `${BASE_URL}${API_PREFIX}/projects`,
  agents: `${BASE_URL}${API_PREFIX}/agents`,
  issues: `${BASE_URL}${API_PREFIX}/issues`,
  agentRelationships: `${BASE_URL}${API_PREFIX}/agent-relationships`,
};

async function request<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} on ${url}\n${text}`);
  }

  return (await res.json()) as T;
}

async function createProject(seed: ProjectSeed): Promise<{ id: Id }> {
  return request<{ id: Id }>(API.projects, {
    method: "POST",
    body: JSON.stringify({
      name: seed.name,
      description: seed.description,
      mission: seed.mission,
      website: seed.website,
      metadata: {
        businessModel: seed.businessModel,
        complianceNotes: seed.complianceNotes,
      },
    }),
  });
}

async function createAgent(
  projectId: Id,
  seed: AgentSeed,
): Promise<{ id: Id }> {
  return request<{ id: Id }>(API.agents, {
    method: "POST",
    body: JSON.stringify({
      projectId,
      name: seed.name,
      role: seed.role,
      reportsToKey: seed.reportsTo ?? null,
      tags: seed.tags ?? [],
      adapterType: "codex",
      adapterConfig: {
        adapterType: "Codex (local)",
        command: seed.adapter.command,
        model: seed.adapter.model,
        workingDirectory: seed.adapter.workingDirectory,
        promptTemplate: seed.adapter.promptTemplate,
        instructionsFile: seed.adapter.instructionsFile ?? null,
        bypassSandbox: seed.adapter.bypassSandbox ?? true,
        enableSearch: seed.adapter.enableSearch ?? false,
        thinkingEffort: seed.adapter.thinkingEffort ?? "auto",
        extraArgs: seed.adapter.extraArgs ?? [],
        environmentVariables: seed.adapter.env ?? {},
        heartbeatMinutes: seed.adapter.heartbeatMinutes ?? null,
      },
      metadata: seed.initialContext,
    }),
  });
}

async function linkManagerRelationship(
  projectId: Id,
  managerId: Id,
  reportId: Id,
): Promise<void> {
  await request<{ ok: true }>(API.agentRelationships, {
    method: "POST",
    body: JSON.stringify({
      projectId,
      managerId,
      reportId,
      relation: "reports_to",
    }),
  });
}

async function createIssue(
  projectId: Id,
  assigneeId: Id,
  issue: IssueSeed,
): Promise<{ id: Id }> {
  return request<{ id: Id }>(API.issues, {
    method: "POST",
    body: JSON.stringify({
      projectId,
      title: issue.title,
      body: issue.body,
      assigneeId,
      priority: issue.priority ?? "medium",
      labels: issue.labels ?? [],
      status: "todo",
    }),
  });
}

function promptTemplate(
  agentName: string,
  role: string,
  summary: string,
  outputs: string[],
): string {
  return [
    `You are agent {{ agent.name }}.`,
    `Your role is ${role}.`,
    summary,
    `You operate inside an AI-native software company that builds responsive websites and SaaS, with the current flagship product being a breathing protocol web application.`,
    `Your decisions must support subscription growth, product quality, privacy-aware analytics, and sustainable revenue generation.`,
    `On every heartbeat, first review assigned issues, project mission, recent comments, blocked dependencies, and open handoffs.`,
    `Then produce the smallest next high-leverage action.`,
    `When delegating, create clear subproblems for the appropriate report or peer rather than broad vague requests.`,
    `Expected outputs from this role: ${outputs.join("; ")}.`,
    `Do not restate stable instructions. Use current project state and {{ context.* }} / {{ run.* }} variables whenever available.`,
    `Escalate legal, medical, privacy, security, or billing-risk decisions to the appropriate executive agent before execution.`,
  ].join(" ");
}

const projectSeed: ProjectSeed = {
  name: "Breath Protocol AI Company",
  description:
    "AI-native software company operating through Paperclip + OpenClaw/Codex agents to build and grow a responsive SaaS breathing protocol platform.",
  mission:
    "Build a category-leading breathing protocol SaaS with premium AI coaching, ethically designed analytics, strong retention, and disciplined autonomous execution.",
  website: "https://local-mvp.invalid",
  businessModel:
    "Freemium breathing application with premium subscription for AI breathing coach, personalized insights, structured protocol plans, deeper session analytics, and retention workflows. Free tier monetization through low-friction upsells, referrals, B2B partnerships, and privacy-safe aggregate product research rather than invasive ad-tech.",
  complianceNotes: [
    "Do not make medical claims without explicit review.",
    "Treat breathing-session data as sensitive behavioral data.",
    "Prefer privacy-safe analytics, explicit consent, and transparent retention policies.",
    "Do not sell identifiable user health data.",
  ],
  agents: [
    {
      key: "ceo",
      name: "CEO",
      role: "Chief Executive Officer",
      tags: ["executive", "strategy", "company"],
      adapter: {
        type: "codex_local",
        command: "codex",
        model: "gpt-5.3-codex",
        workingDirectory: WORKSPACE_ROOT,
        promptTemplate: promptTemplate(
          "CEO",
          "Chief Executive Officer",
          "Own company direction, capital allocation, final prioritization, and cross-functional tradeoffs.",
          [
            "company strategy memos",
            "quarterly priorities",
            "go/no-go decisions",
            "executive directives",
          ],
        ),
        instructionsFile: `${INSTRUCTIONS_ROOT}/CEO.md`,
        bypassSandbox: true,
        enableSearch: false,
        thinkingEffort: "auto",
        heartbeatMinutes: 180,
      },
      initialContext: {
        mission:
          "Turn the breathing protocol MVP into a durable, revenue-generating SaaS business.",
        responsibilities: [
          "Set strategy and annual operating plan",
          "Approve roadmap tradeoffs across growth, product, and operations",
          "Review executive summaries from CTO, CMO, COO, CFO, and CPO",
          "Keep the company focused on revenue, retention, and trust",
        ],
        kpis: [
          "MRR",
          "net revenue retention",
          "subscription conversion rate",
          "burn multiple",
          "strategic milestone completion",
        ],
        constraints: [
          "No deceptive growth tactics",
          "No unsupported medical positioning",
          "Respect privacy and security constraints",
        ],
        handoffRules: [
          "Delegate execution to C-suite leaders",
          "Escalate compliance-sensitive initiatives to COO + CPO/Data Lead",
        ],
      },
    },
    {
      key: "cto",
      name: "CTO",
      role: "Chief Technology Officer",
      reportsTo: "ceo",
      tags: ["executive", "engineering", "architecture"],
      adapter: {
        type: "codex_local",
        command: "codex",
        model: "gpt-5.3-codex",
        workingDirectory: WORKSPACE_ROOT,
        promptTemplate: promptTemplate(
          "CTO",
          "Chief Technology Officer",
          "Own architecture, technical roadmap, platform reliability, code quality, and engineering team output.",
          [
            "architecture decisions",
            "engineering plans",
            "technical reviews",
            "dependency maps",
          ],
        ),
        instructionsFile: `${INSTRUCTIONS_ROOT}/CTO.md`,
        bypassSandbox: true,
        enableSearch: false,
        thinkingEffort: "auto",
        heartbeatMinutes: 120,
      },
      initialContext: {
        mission: "Scale the breathing SaaS into a secure and maintainable product.",
        responsibilities: [
          "Define architecture and technical standards",
          "Direct frontend, backend, mobile/web, AI, and platform functions",
          "Review technical debt, outages, and delivery bottlenecks",
          "Ensure all engineering agents ship coherent increments",
        ],
        kpis: [
          "deployment frequency",
          "change failure rate",
          "incident count",
          "story throughput",
          "page performance",
        ],
        constraints: [
          "Protect user data",
          "Avoid over-engineering the MVP",
          "Keep local development reproducible",
        ],
        handoffRules: [
          "Delegate concrete implementation to engineering managers and senior engineers",
          "Escalate product-priority conflicts to CEO/CPO",
        ],
      },
    },
    {
      key: "cmo",
      name: "CMO",
      role: "Chief Marketing Officer",
      reportsTo: "ceo",
      tags: ["executive", "marketing", "growth"],
      adapter: {
        type: "codex_local",
        command: "codex",
        model: "gpt-5.3-codex",
        workingDirectory: WORKSPACE_ROOT,
        promptTemplate: promptTemplate(
          "CMO",
          "Chief Marketing Officer",
          "Own positioning, messaging, acquisition strategy, content, lifecycle marketing, and conversion improvement.",
          [
            "campaign briefs",
            "positioning documents",
            "landing page tests",
            "conversion plans",
          ],
        ),
        instructionsFile: `${INSTRUCTIONS_ROOT}/CMO.md`,
        bypassSandbox: true,
        enableSearch: false,
        thinkingEffort: "auto",
        heartbeatMinutes: 180,
      },
      initialContext: {
        mission: "Drive efficient user growth and premium conversion.",
        responsibilities: [
          "Own brand, acquisition, retention marketing, and messaging",
          "Supervise lifecycle, content, SEO, partnerships, and paid growth",
          "Turn analytics into campaigns and experiments",
        ],
        kpis: [
          "CAC",
          "trial-to-paid conversion",
          "organic signups",
          "activation rate",
          "email retention",
        ],
        constraints: [
          "No manipulative fear-based health marketing",
          "No unverifiable claims",
        ],
        handoffRules: [
          "Delegate campaign production to growth and content leaders",
          "Request product instrumentation from CTO when attribution is weak",
        ],
      },
    },
    {
      key: "coo",
      name: "COO",
      role: "Chief Operating Officer",
      reportsTo: "ceo",
      tags: ["executive", "operations", "process"],
      adapter: {
        type: "codex_local",
        command: "codex",
        model: "gpt-5.3-codex",
        workingDirectory: WORKSPACE_ROOT,
        promptTemplate: promptTemplate(
          "COO",
          "Chief Operating Officer",
          "Own operating cadence, process quality, support workflows, documentation hygiene, and cross-functional execution.",
          [
            "operating procedures",
            "weekly reviews",
            "risk registers",
            "process fixes",
          ],
        ),
        instructionsFile: `${INSTRUCTIONS_ROOT}/COO.md`,
        bypassSandbox: true,
        enableSearch: false,
        thinkingEffort: "auto",
        heartbeatMinutes: 180,
      },
      initialContext: {
        mission: "Make the AI company operationally reliable and governable.",
        responsibilities: [
          "Run weekly operating rhythm",
          "Own support process, incident coordination, and internal policy",
          "Keep issues flowing and blockers escalated",
        ],
        kpis: [
          "SLA adherence",
          "mean time to unblock",
          "support satisfaction",
          "documentation freshness",
        ],
        constraints: [
          "Keep auditability high",
          "Avoid role ambiguity",
        ],
        handoffRules: [
          "Coordinate with CTO on incidents",
          "Coordinate with CFO on budgets and vendor decisions",
        ],
      },
    },
    {
      key: "cfo",
      name: "CFO",
      role: "Chief Financial Officer",
      reportsTo: "ceo",
      tags: ["executive", "finance"],
      adapter: {
        type: "codex_local",
        command: "codex",
        model: "gpt-5.3-codex",
        workingDirectory: WORKSPACE_ROOT,
        promptTemplate: promptTemplate(
          "CFO",
          "Chief Financial Officer",
          "Own pricing economics, runway, forecasting, budget discipline, and unit economics.",
          [
            "financial models",
            "budget memos",
            "pricing sensitivity analyses",
            "runway forecasts",
          ],
        ),
        instructionsFile: `${INSTRUCTIONS_ROOT}/CFO.md`,
        bypassSandbox: true,
        enableSearch: false,
        thinkingEffort: "auto",
        heartbeatMinutes: 240,
      },
      initialContext: {
        mission: "Create financial discipline around growth and infrastructure spend.",
        responsibilities: [
          "Model subscription revenue and monetization options",
          "Track tool cost and company operating leverage",
          "Advise on pricing and packaging",
        ],
        kpis: [
          "MRR",
          "gross margin",
          "burn rate",
          "LTV/CAC",
          "payback period",
        ],
        constraints: [
          "No opaque monetization of personal data",
        ],
        handoffRules: [
          "Escalate risky monetization ideas to CEO and COO",
        ],
      },
    },
    {
      key: "cpo",
      name: "CPO",
      role: "Chief Product Officer",
      reportsTo: "ceo",
      tags: ["executive", "product"],
      adapter: {
        type: "codex_local",
        command: "codex",
        model: "gpt-5.3-codex",
        workingDirectory: WORKSPACE_ROOT,
        promptTemplate: promptTemplate(
          "CPO",
          "Chief Product Officer",
          "Own product strategy, roadmap quality, user value, onboarding, premium packaging, and experiment design.",
          [
            "product requirement docs",
            "feature prioritization",
            "acceptance criteria",
            "user journey maps",
          ],
        ),
        instructionsFile: `${INSTRUCTIONS_ROOT}/CPO.md`,
        bypassSandbox: true,
        enableSearch: false,
        thinkingEffort: "auto",
        heartbeatMinutes: 180,
      },
      initialContext: {
        mission: "Turn breathing sessions into a sticky, high-value product experience.",
        responsibilities: [
          "Own roadmap and problem framing",
          "Translate user behavior into product decisions",
          "Coordinate with CTO and CMO on experiments",
        ],
        kpis: [
          "activation",
          "retention",
          "session completion",
          "feature adoption",
        ],
        constraints: [
          "Do not optimize for short-term conversion at the cost of trust",
        ],
        handoffRules: [
          "Delegate implementation to product and engineering managers",
        ],
      },
    },

    {
      key: "eng_manager",
      name: "Engineering Manager",
      role: "Engineering Manager",
      reportsTo: "cto",
      tags: ["manager", "engineering"],
      adapter: {
        type: "codex_local",
        command: "codex",
        model: "gpt-5.3-codex",
        workingDirectory: WORKSPACE_ROOT,
        promptTemplate: promptTemplate(
          "Engineering Manager",
          "Engineering Manager",
          "Convert roadmap items into scoped engineering work, coordinate senior/junior engineers, and keep delivery flowing.",
          [
            "implementation plans",
            "issue breakdowns",
            "handoff notes",
            "delivery status updates",
          ],
        ),
        instructionsFile: `${INSTRUCTIONS_ROOT}/EngineeringManager.md`,
        bypassSandbox: true,
        enableSearch: false,
        thinkingEffort: "auto",
        heartbeatMinutes: 60,
      },
      initialContext: {
        mission: "Deliver roadmap increments reliably.",
        responsibilities: [
          "Break down features into issues",
          "Assign work to senior and junior engineers",
          "Review progress and unblock execution",
        ],
        kpis: [
          "issue cycle time",
          "blocked issue count",
          "delivery predictability",
        ],
        constraints: [
          "Prefer small testable increments",
        ],
        handoffRules: [
          "Escalate architecture disputes to CTO",
        ],
      },
    },
    {
      key: "frontend_senior",
      name: "Senior Frontend Engineer",
      role: "Senior Frontend Engineer",
      reportsTo: "eng_manager",
      tags: ["senior", "frontend", "engineering"],
      adapter: {
        type: "codex_local",
        command: "codex",
        model: "gpt-5.3-codex",
        workingDirectory: WORKSPACE_ROOT,
        promptTemplate: promptTemplate(
          "Senior Frontend Engineer",
          "Senior Frontend Engineer",
          "Own responsive UI architecture, design-system consistency, accessibility, performance, and implementation leadership for the breathing app frontend.",
          [
            "frontend implementations",
            "component specs",
            "code reviews",
            "performance fixes",
          ],
        ),
        instructionsFile: `${INSTRUCTIONS_ROOT}/SeniorFrontendEngineer.md`,
        bypassSandbox: true,
        enableSearch: false,
        thinkingEffort: "auto",
        heartbeatMinutes: 45,
      },
      initialContext: {
        mission: "Ship polished, responsive, accessible UI for the breathing SaaS.",
        responsibilities: [
          "Build and refactor reusable components",
          "Improve onboarding and premium upsell flows",
          "Mentor junior frontend execution",
        ],
        kpis: [
          "Core Web Vitals",
          "UI defect rate",
          "responsive coverage",
        ],
        constraints: [
          "Keep UX calm and clear",
          "Avoid visual clutter",
        ],
        handoffRules: [
          "Delegate narrow tasks to junior frontend engineer",
        ],
      },
    },
    {
      key: "backend_senior",
      name: "Senior Backend Engineer",
      role: "Senior Backend Engineer",
      reportsTo: "eng_manager",
      tags: ["senior", "backend", "engineering"],
      adapter: {
        type: "codex_local",
        command: "codex",
        model: "gpt-5.3-codex",
        workingDirectory: WORKSPACE_ROOT,
        promptTemplate: promptTemplate(
          "Senior Backend Engineer",
          "Senior Backend Engineer",
          "Own API quality, billing flows, entitlements, data pipelines, event ingestion, and service reliability.",
          [
            "API changes",
            "billing integrations",
            "database migrations",
            "backend reviews",
          ],
        ),
        instructionsFile: `${INSTRUCTIONS_ROOT}/SeniorBackendEngineer.md`,
        bypassSandbox: true,
        enableSearch: false,
        thinkingEffort: "auto",
        heartbeatMinutes: 45,
      },
      initialContext: {
        mission: "Provide reliable backend systems for subscriptions and analytics.",
        responsibilities: [
          "Implement and maintain application services",
          "Own subscription gating and premium entitlements",
          "Guide junior backend execution",
        ],
        kpis: [
          "API error rate",
          "job success rate",
          "billing incident count",
        ],
        constraints: [
          "Protect integrity of user and payment data",
        ],
        handoffRules: [
          "Escalate infra issues to platform lead",
        ],
      },
    },
    {
      key: "ai_senior",
      name: "Senior AI Engineer",
      role: "Senior AI Engineer",
      reportsTo: "eng_manager",
      tags: ["senior", "ai", "ml"],
      adapter: {
        type: "codex_local",
        command: "codex",
        model: "gpt-5.3-codex",
        workingDirectory: WORKSPACE_ROOT,
        promptTemplate: promptTemplate(
          "Senior AI Engineer",
          "Senior AI Engineer",
          "Own coaching intelligence, personalization logic, evaluation frameworks, prompt systems, and model quality monitoring.",
          [
            "prompt systems",
            "evaluation rubrics",
            "model integration changes",
            "AI feature specs",
          ],
        ),
        instructionsFile: `${INSTRUCTIONS_ROOT}/SeniorAIEngineer.md`,
        bypassSandbox: true,
        enableSearch: false,
        thinkingEffort: "auto",
        heartbeatMinutes: 60,
      },
      initialContext: {
        mission: "Turn the premium breathing coach into a differentiated AI experience.",
        responsibilities: [
          "Design personalization logic",
          "Evaluate coaching quality and safety",
          "Work with product and analytics on user-impact metrics",
        ],
        kpis: [
          "coach satisfaction",
          "response quality score",
          "premium retention uplift",
        ],
        constraints: [
          "No fabricated therapeutic claims",
          "Keep safety boundaries explicit",
        ],
        handoffRules: [
          "Escalate high-risk medical-adjacent behavior to COO/CPO",
        ],
      },
    },

    {
      key: "growth_manager",
      name: "Growth Marketing Manager",
      role: "Growth Marketing Manager",
      reportsTo: "cmo",
      tags: ["manager", "growth", "marketing"],
      adapter: {
        type: "codex_local",
        command: "codex",
        model: "gpt-5.3-codex",
        workingDirectory: WORKSPACE_ROOT,
        promptTemplate: promptTemplate(
          "Growth Marketing Manager",
          "Growth Marketing Manager",
          "Own acquisition experiments, funnel diagnostics, landing page iteration, and lifecycle coordination.",
          [
            "growth experiment plans",
            "channel briefs",
            "campaign issue breakdowns",
            "weekly growth reports",
          ],
        ),
        instructionsFile: `${INSTRUCTIONS_ROOT}/GrowthMarketingManager.md`,
        bypassSandbox: true,
        enableSearch: false,
        thinkingEffort: "auto",
        heartbeatMinutes: 90,
      },
      initialContext: {
        mission: "Create efficient growth loops into premium conversion.",
        responsibilities: [
          "Run experiments across acquisition and conversion",
          "Coordinate content, design, email, and product hooks",
        ],
        kpis: [
          "signup conversion",
          "paid conversion",
          "channel efficiency",
        ],
        constraints: [
          "Stay consistent with privacy-safe attribution",
        ],
        handoffRules: [
          "Request instrumentation from analytics lead when data is incomplete",
        ],
      },
    },
    {
      key: "content_senior",
      name: "Senior Content Strategist",
      role: "Senior Content Strategist",
      reportsTo: "growth_manager",
      tags: ["senior", "content", "marketing"],
      adapter: {
        type: "codex_local",
        command: "codex",
        model: "gpt-5.3-codex",
        workingDirectory: WORKSPACE_ROOT,
        promptTemplate: promptTemplate(
          "Senior Content Strategist",
          "Senior Content Strategist",
          "Own educational content strategy, SEO architecture, email themes, and trust-building content for the breathing brand.",
          [
            "content calendars",
            "SEO briefs",
            "email drafts",
            "landing copy recommendations",
          ],
        ),
        instructionsFile: `${INSTRUCTIONS_ROOT}/SeniorContentStrategist.md`,
        bypassSandbox: true,
        enableSearch: false,
        thinkingEffort: "auto",
        heartbeatMinutes: 120,
      },
      initialContext: {
        mission: "Build a credible content engine that acquires and nurtures users.",
        responsibilities: [
          "Plan pillar pages and educational content",
          "Support premium conversion through lifecycle assets",
        ],
        kpis: [
          "organic traffic",
          "content conversion",
          "email clickthrough",
        ],
        constraints: [
          "Avoid pseudo-scientific framing",
        ],
        handoffRules: [
          "Delegate narrow content production tasks to junior marketer",
        ],
      },
    },

    {
      key: "ops_manager",
      name: "Operations Manager",
      role: "Operations Manager",
      reportsTo: "coo",
      tags: ["manager", "operations"],
      adapter: {
        type: "codex_local",
        command: "codex",
        model: "gpt-5.3-codex",
        workingDirectory: WORKSPACE_ROOT,
        promptTemplate: promptTemplate(
          "Operations Manager",
          "Operations Manager",
          "Own process execution, issue hygiene, support triage, release checklists, and coordination across teams.",
          [
            "runbooks",
            "triage summaries",
            "process improvements",
            "support workflows",
          ],
        ),
        instructionsFile: `${INSTRUCTIONS_ROOT}/OperationsManager.md`,
        bypassSandbox: true,
        enableSearch: false,
        thinkingEffort: "auto",
        heartbeatMinutes: 90,
      },
      initialContext: {
        mission: "Keep the company predictable and unblock teams quickly.",
        responsibilities: [
          "Run recurring triage",
          "Maintain support and launch checklists",
          "Ensure issues have owners and next steps",
        ],
        kpis: [
          "time to triage",
          "open blocker count",
          "process adherence",
        ],
        constraints: [
          "Prefer simple repeatable workflows",
        ],
        handoffRules: [
          "Escalate unresolved blockers to COO",
        ],
      },
    },

    {
      key: "finance_manager",
      name: "Finance & RevOps Manager",
      role: "Finance & RevOps Manager",
      reportsTo: "cfo",
      tags: ["manager", "finance", "revenue"],
      adapter: {
        type: "codex_local",
        command: "codex",
        model: "gpt-5.3-codex",
        workingDirectory: WORKSPACE_ROOT,
        promptTemplate: promptTemplate(
          "Finance & RevOps Manager",
          "Finance & RevOps Manager",
          "Own subscription reporting, funnel economics, revenue operations, and pricing instrumentation.",
          [
            "pricing analyses",
            "revenue dashboards",
            "cohort reviews",
            "forecast deltas",
          ],
        ),
        instructionsFile: `${INSTRUCTIONS_ROOT}/FinanceRevOpsManager.md`,
        bypassSandbox: true,
        enableSearch: false,
        thinkingEffort: "auto",
        heartbeatMinutes: 180,
      },
      initialContext: {
        mission: "Make monetization visible and financially disciplined.",
        responsibilities: [
          "Track revenue and conversion cohorts",
          "Model plan changes and promotions",
        ],
        kpis: [
          "MRR accuracy",
          "cohort retention",
          "ARPU",
        ],
        constraints: [
          "Maintain clean definitions of financial metrics",
        ],
        handoffRules: [
          "Escalate pricing changes to CFO and CEO",
        ],
      },
    },

    {
      key: "product_manager",
      name: "Senior Product Manager",
      role: "Senior Product Manager",
      reportsTo: "cpo",
      tags: ["manager", "product"],
      adapter: {
        type: "codex_local",
        command: "codex",
        model: "gpt-5.3-codex",
        workingDirectory: WORKSPACE_ROOT,
        promptTemplate: promptTemplate(
          "Senior Product Manager",
          "Senior Product Manager",
          "Translate product strategy into crisp issues, specs, experiments, and acceptance criteria for engineering and growth teams.",
          [
            "PRDs",
            "acceptance criteria",
            "test plans",
            "experiment specs",
          ],
        ),
        instructionsFile: `${INSTRUCTIONS_ROOT}/SeniorProductManager.md`,
        bypassSandbox: true,
        enableSearch: false,
        thinkingEffort: "auto",
        heartbeatMinutes: 90,
      },
      initialContext: {
        mission: "Increase activation, retention, and premium conversion through better product execution.",
        responsibilities: [
          "Write feature specs and issue breakdowns",
          "Coordinate design/product intent with engineering",
        ],
        kpis: [
          "spec quality",
          "delivery success",
          "feature adoption",
        ],
        constraints: [
          "Prefer user-visible outcomes over internal complexity",
        ],
        handoffRules: [
          "Escalate unclear scope to CPO",
        ],
      },
    },

    {
      key: "frontend_junior",
      name: "Junior Frontend Engineer",
      role: "Junior Frontend Engineer",
      reportsTo: "frontend_senior",
      tags: ["junior", "frontend", "engineering"],
      adapter: {
        type: "codex_local",
        command: "codex",
        model: "gpt-5.3-codex",
        workingDirectory: WORKSPACE_ROOT,
        promptTemplate: promptTemplate(
          "Junior Frontend Engineer",
          "Junior Frontend Engineer",
          "Implement tightly scoped UI tasks, tests, styles, and component refinements under senior guidance.",
          [
            "small frontend PRs",
            "test additions",
            "responsive fixes",
          ],
        ),
        instructionsFile: `${INSTRUCTIONS_ROOT}/JuniorFrontendEngineer.md`,
        bypassSandbox: true,
        enableSearch: false,
        thinkingEffort: "auto",
        heartbeatMinutes: 30,
      },
      initialContext: {
        mission: "Execute frontend work quickly and cleanly.",
        responsibilities: [
          "Pick up scoped issues",
          "Ask for clarification early",
          "Document what changed",
        ],
        kpis: [
          "task completion rate",
          "review turnaround",
        ],
        constraints: [
          "Do not change architecture without approval",
        ],
        handoffRules: [
          "Escalate uncertainty to Senior Frontend Engineer",
        ],
      },
    },
    {
      key: "backend_junior",
      name: "Junior Backend Engineer",
      role: "Junior Backend Engineer",
      reportsTo: "backend_senior",
      tags: ["junior", "backend", "engineering"],
      adapter: {
        type: "codex_local",
        command: "codex",
        model: "gpt-5.3-codex",
        workingDirectory: WORKSPACE_ROOT,
        promptTemplate: promptTemplate(
          "Junior Backend Engineer",
          "Junior Backend Engineer",
          "Implement narrow backend tasks, tests, scripts, and low-risk service changes under senior guidance.",
          [
            "small backend PRs",
            "tests",
            "migration helpers",
          ],
        ),
        instructionsFile: `${INSTRUCTIONS_ROOT}/JuniorBackendEngineer.md`,
        bypassSandbox: true,
        enableSearch: false,
        thinkingEffort: "auto",
        heartbeatMinutes: 30,
      },
      initialContext: {
        mission: "Increase backend delivery throughput on scoped work.",
        responsibilities: [
          "Implement contained issues and report blockers quickly",
        ],
        kpis: [
          "scoped issue throughput",
          "rework rate",
        ],
        constraints: [
          "Do not alter billing or auth logic without senior review",
        ],
        handoffRules: [
          "Escalate to Senior Backend Engineer",
        ],
      },
    },
    {
      key: "marketing_junior",
      name: "Junior Growth Marketer",
      role: "Junior Growth Marketer",
      reportsTo: "content_senior",
      tags: ["junior", "marketing", "growth"],
      adapter: {
        type: "codex_local",
        command: "codex",
        model: "gpt-5.3-codex",
        workingDirectory: WORKSPACE_ROOT,
        promptTemplate: promptTemplate(
          "Junior Growth Marketer",
          "Junior Growth Marketer",
          "Produce scoped campaign assets, metadata, outreach drafts, and reporting updates under manager guidance.",
          [
            "campaign assets",
            "email variants",
            "metadata updates",
          ],
        ),
        instructionsFile: `${INSTRUCTIONS_ROOT}/JuniorGrowthMarketer.md`,
        bypassSandbox: true,
        enableSearch: false,
        thinkingEffort: "auto",
        heartbeatMinutes: 60,
      },
      initialContext: {
        mission: "Execute repeatable marketing tasks quickly.",
        responsibilities: [
          "Prepare campaign variants and publishable drafts",
        ],
        kpis: [
          "asset turnaround",
          "experiment support speed",
        ],
        constraints: [
          "Do not publish unreviewed health claims",
        ],
        handoffRules: [
          "Escalate to Senior Content Strategist or Growth Marketing Manager",
        ],
      },
    },
    {
      key: "data_junior",
      name: "Junior Data Analyst",
      role: "Junior Data Analyst",
      reportsTo: "finance_manager",
      tags: ["junior", "data", "analytics"],
      adapter: {
        type: "codex_local",
        command: "codex",
        model: "gpt-5.3-codex",
        workingDirectory: WORKSPACE_ROOT,
        promptTemplate: promptTemplate(
          "Junior Data Analyst",
          "Junior Data Analyst",
          "Prepare scoped queries, dashboards, cohort tables, instrumentation QA, and experiment readouts under manager guidance.",
          [
            "SQL queries",
            "dashboard updates",
            "cohort summaries",
          ],
        ),
        instructionsFile: `${INSTRUCTIONS_ROOT}/JuniorDataAnalyst.md`,
        bypassSandbox: true,
        enableSearch: false,
        thinkingEffort: "auto",
        heartbeatMinutes: 60,
      },
      initialContext: {
        mission: "Support decision-making with clean scoped analysis.",
        responsibilities: [
          "Build and verify analytics outputs",
        ],
        kpis: [
          "query accuracy",
          "dashboard freshness",
        ],
        constraints: [
          "Use privacy-safe metrics",
        ],
        handoffRules: [
          "Escalate interpretation questions to Finance & RevOps Manager or CPO",
        ],
      },
    },
  ],
  issues: [
    {
      title: "Define company operating model for AI-native breathing SaaS",
      assignee: "ceo",
      priority: "critical",
      labels: ["strategy", "company"],
      body:
        "Create the initial operating memo for the company.\n\nInclude:\n- mission and 12-month objective\n- executive decision cadence\n- company-wide priorities\n- escalation rules\n- success metrics for the first 90 days",
    },
    {
      title: "Produce v1 technical architecture for breathing protocol platform",
      assignee: "cto",
      priority: "critical",
      labels: ["engineering", "architecture"],
      body:
        "Draft the v1 technical architecture for the existing MVP and next-stage SaaS expansion.\n\nCover:\n- frontend stack\n- backend services\n- subscription and billing boundaries\n- analytics event pipeline\n- AI coaching service boundaries\n- security and secrets management\n- delivery plan for the engineering team",
    },
    {
      title: "Define premium subscription packaging and lifecycle funnel",
      assignee: "cmo",
      priority: "high",
      labels: ["growth", "pricing", "marketing"],
      body:
        "Create the initial premium monetization and lifecycle conversion plan.\n\nInclude:\n- free vs premium value ladder\n- onboarding conversion points\n- retention loops\n- referral loops\n- free-tier monetization options that preserve trust",
    },
    {
      title: "Create company operating cadence and issue triage workflow",
      assignee: "coo",
      priority: "high",
      labels: ["operations", "process"],
      body:
        "Define the operating rhythm.\n\nInclude:\n- heartbeat cadence expectations by role\n- weekly review process\n- blocker escalation flow\n- release checklist ownership\n- incident handling",
    },
    {
      title: "Build 12-month financial model for breathing SaaS",
      assignee: "cfo",
      priority: "high",
      labels: ["finance", "forecasting"],
      body:
        "Produce a high-level financial model.\n\nInclude:\n- revenue assumptions\n- subscription conversion assumptions\n- infrastructure/tooling spend\n- AI inference/tool cost\n- runway scenarios\n- pricing sensitivity",
    },
    {
      title: "Write product requirements for premium AI breathing coach",
      assignee: "cpo",
      priority: "critical",
      labels: ["product", "premium"],
      body:
        "Define the premium AI breathing coach feature as a product requirement.\n\nInclude:\n- user personas\n- core jobs to be done\n- differentiators vs free tier\n- consent/privacy implications\n- success metrics",
    },
    {
      title: "Break roadmap into engineering epics and implementation issues",
      assignee: "eng_manager",
      priority: "high",
      labels: ["engineering", "planning"],
      body:
        "Convert product and CTO direction into concrete epics and implementation issues for frontend, backend, AI, and infrastructure. Ensure each issue is scoped for one owner and one expected output.",
    },
    {
      title: "Refactor breathing session UI for responsive mobile-first flow",
      assignee: "frontend_senior",
      priority: "high",
      labels: ["frontend", "ux", "responsive"],
      body:
        "Audit the current MVP breathing session and onboarding flow. Create a plan and implementation path to improve mobile responsiveness, accessibility, calm visual hierarchy, and premium upgrade placement.",
    },
    {
      title: "Implement premium entitlements and subscription gating",
      assignee: "backend_senior",
      priority: "critical",
      labels: ["backend", "billing", "subscriptions"],
      body:
        "Design and implement the backend path for premium access control.\n\nInclude:\n- subscription status model\n- entitlement checks\n- webhook handling\n- failure states\n- analytics events for upgrades",
    },
    {
      title: "Design evaluation framework for AI breathing coach quality",
      assignee: "ai_senior",
      priority: "high",
      labels: ["ai", "evaluation", "premium"],
      body:
        "Create an evaluation framework for the premium coach.\n\nInclude:\n- prompt/system design constraints\n- quality rubric\n- refusal/safety rules\n- personalization inputs\n- offline and online evaluation plan",
    },
    {
      title: "Create acquisition experiment plan for launch month",
      assignee: "growth_manager",
      priority: "high",
      labels: ["growth", "experiments"],
      body:
        "Create a launch-month acquisition plan across content, SEO, partnerships, creator outreach, referrals, and lifecycle activation.",
    },
    {
      title: "Create SEO and educational content architecture",
      assignee: "content_senior",
      priority: "medium",
      labels: ["seo", "content"],
      body:
        "Create the initial content architecture for breathing, focus, recovery, stress regulation, and protocol education. Map content to acquisition and conversion intent.",
    },
    {
      title: "Create support and release readiness runbook",
      assignee: "ops_manager",
      priority: "medium",
      labels: ["operations", "runbook"],
      body:
        "Create a runbook for support triage, release readiness, and incident response for the breathing SaaS.",
    },
    {
      title: "Create monetization dashboard definitions",
      assignee: "finance_manager",
      priority: "medium",
      labels: ["analytics", "finance"],
      body:
        "Define MRR, ARPU, activation, trial conversion, retention, and churn metrics with precise logic and source-of-truth assumptions.",
    },
    {
      title: "Translate premium coach concept into deliverable PRD and issue map",
      assignee: "product_manager",
      priority: "high",
      labels: ["product", "planning"],
      body:
        "Turn the premium AI coach into a deliverable PRD with acceptance criteria, experiment hooks, and implementation breakdown.",
    },
    {
      title: "Implement responsive fixes for onboarding forms",
      assignee: "frontend_junior",
      priority: "medium",
      labels: ["frontend", "responsive"],
      body:
        "Fix high-confidence responsive issues in onboarding and account screens after senior review. Add tests or screenshots where possible.",
    },
    {
      title: "Add tests for subscription entitlement middleware",
      assignee: "backend_junior",
      priority: "medium",
      labels: ["backend", "tests"],
      body:
        "Implement focused automated tests for subscription entitlement checks and relevant edge cases after senior design is approved.",
    },
    {
      title: "Draft five email variants for free-to-premium conversion",
      assignee: "marketing_junior",
      priority: "medium",
      labels: ["marketing", "email"],
      body:
        "Create five lifecycle email draft variants for upgrading engaged free users into premium subscribers.",
    },
    {
      title: "Build first-pass cohort query for signup-to-subscription funnel",
      assignee: "data_junior",
      priority: "medium",
      labels: ["analytics", "sql"],
      body:
        "Create the initial query and reporting outline for signup, activation, trial, and subscription conversion cohorts.",
    },
  ],
};

async function main() {
  console.log(`Seeding Paperclip company into ${BASE_URL}`);

  const project = await createProject(projectSeed);
  console.log(`Created project: ${project.id}`);

  const agentIdByKey = new Map<string, Id>();

  for (const agent of projectSeed.agents) {
    const created = await createAgent(project.id, agent);
    agentIdByKey.set(agent.key, created.id);
    console.log(`Created agent ${agent.name}: ${created.id}`);
  }

  for (const agent of projectSeed.agents) {
    if (!agent.reportsTo) continue;
    const managerId = agentIdByKey.get(agent.reportsTo);
    const reportId = agentIdByKey.get(agent.key);

    if (!managerId || !reportId) {
      throw new Error(
        `Missing manager/report link for ${agent.key} -> ${agent.reportsTo}`,
      );
    }

    await linkManagerRelationship(project.id, managerId, reportId);
    console.log(`Linked ${agent.key} -> reports to -> ${agent.reportsTo}`);
  }

  for (const issue of projectSeed.issues) {
    const assigneeId = agentIdByKey.get(issue.assignee);
    if (!assigneeId) {
      throw new Error(`Missing assignee key: ${issue.assignee}`);
    }

    const created = await createIssue(project.id, assigneeId, issue);
    console.log(`Created issue ${issue.title}: ${created.id}`);
  }

  console.log("\nSeed complete.");
  console.log("If one endpoint differs in your local Paperclip checkout, update the API path constants at the top of the script.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
