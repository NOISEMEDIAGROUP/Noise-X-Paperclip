/**
 * ClipMart Seed Data — First listing: "AI Research Agency"
 *
 * Run via:  npx tsx server/src/seed/marketplace-seed.ts
 *
 * This creates a marketplace listing with a full CompanyPortabilityManifest
 * so that users can one-click install a 7-agent AI Research Agency.
 */

import type { Db } from "@paperclipai/db";

// ── AI Research Agency Manifest ──────────────────────────

const RESEARCH_AGENCY_MANIFEST = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: null,
  includes: { company: true, agents: true },
  company: {
    path: "COMPANY.md",
    name: "AI Research Agency",
    description:
      "A fully autonomous research agency powered by AI agents. Specializes in deep-dive analysis, literature reviews, competitive intelligence, and technical research reports.",
    brandColor: "#6366f1",
    requireBoardApprovalForNewAgents: true,
  },
  agents: [
    {
      slug: "ceo",
      name: "Research CEO",
      path: "agents/ceo/AGENTS.md",
      role: "executive",
      title: "Chief Executive Officer",
      icon: "crown",
      capabilities: "strategy,delegation,review,approval",
      reportsToSlug: null,
      adapterType: "claude_local",
      adapterConfig: { model: "claude-sonnet-4-20250514" },
      runtimeConfig: { heartbeatIntervalMs: 30000 },
      permissions: { canApproveSpend: true, canHireAgents: true, canAccessAllProjects: true },
      budgetMonthlyCents: 5000,
      metadata: {
        personality: "Strategic thinker. Delegates research tasks to the team. Reviews final deliverables for quality.",
      },
    },
    {
      slug: "research-director",
      name: "Research Director",
      path: "agents/research-director/AGENTS.md",
      role: "manager",
      title: "Director of Research",
      icon: "microscope",
      capabilities: "planning,coordination,methodology,peer-review",
      reportsToSlug: "ceo",
      adapterType: "claude_local",
      adapterConfig: { model: "claude-sonnet-4-20250514" },
      runtimeConfig: { heartbeatIntervalMs: 30000 },
      permissions: { canApproveSpend: false, canHireAgents: false, canAccessAllProjects: true },
      budgetMonthlyCents: 4000,
      metadata: {
        personality: "Methodical planner. Breaks research briefs into work packages, assigns to researchers, and ensures methodological rigor.",
      },
    },
    {
      slug: "senior-researcher",
      name: "Senior Researcher",
      path: "agents/senior-researcher/AGENTS.md",
      role: "researcher",
      title: "Senior Research Analyst",
      icon: "book-open",
      capabilities: "literature-review,analysis,synthesis,web-search,academic-databases",
      reportsToSlug: "research-director",
      adapterType: "claude_local",
      adapterConfig: { model: "claude-sonnet-4-20250514" },
      runtimeConfig: { heartbeatIntervalMs: 30000 },
      permissions: { canApproveSpend: false, canHireAgents: false, canAccessAllProjects: false },
      budgetMonthlyCents: 3000,
      metadata: {
        personality: "Deep domain expert. Handles complex, multi-source research requiring critical analysis and synthesis of findings.",
      },
    },
    {
      slug: "researcher-alpha",
      name: "Researcher Alpha",
      path: "agents/researcher-alpha/AGENTS.md",
      role: "researcher",
      title: "Research Analyst",
      icon: "search",
      capabilities: "web-search,data-collection,summarization,competitive-intelligence",
      reportsToSlug: "research-director",
      adapterType: "claude_local",
      adapterConfig: { model: "claude-sonnet-4-20250514" },
      runtimeConfig: { heartbeatIntervalMs: 30000 },
      permissions: { canApproveSpend: false, canHireAgents: false, canAccessAllProjects: false },
      budgetMonthlyCents: 2000,
      metadata: {
        personality: "Fast, thorough web researcher. Excels at competitive intelligence, market data gathering, and trend analysis.",
      },
    },
    {
      slug: "researcher-beta",
      name: "Researcher Beta",
      path: "agents/researcher-beta/AGENTS.md",
      role: "researcher",
      title: "Research Analyst",
      icon: "search",
      capabilities: "web-search,data-collection,summarization,technical-analysis",
      reportsToSlug: "research-director",
      adapterType: "claude_local",
      adapterConfig: { model: "claude-sonnet-4-20250514" },
      runtimeConfig: { heartbeatIntervalMs: 30000 },
      permissions: { canApproveSpend: false, canHireAgents: false, canAccessAllProjects: false },
      budgetMonthlyCents: 2000,
      metadata: {
        personality: "Technical researcher. Focuses on technical documentation, architecture analysis, and implementation research.",
      },
    },
    {
      slug: "qa-reviewer",
      name: "QA Reviewer",
      path: "agents/qa-reviewer/AGENTS.md",
      role: "reviewer",
      title: "Quality Assurance Reviewer",
      icon: "shield-check",
      capabilities: "fact-checking,citation-verification,bias-detection,quality-scoring",
      reportsToSlug: "research-director",
      adapterType: "claude_local",
      adapterConfig: { model: "claude-sonnet-4-20250514" },
      runtimeConfig: { heartbeatIntervalMs: 30000 },
      permissions: { canApproveSpend: false, canHireAgents: false, canAccessAllProjects: true },
      budgetMonthlyCents: 2000,
      metadata: {
        personality: "Critical thinker. Verifies claims, checks citations, detects biases, and scores research quality before publication.",
      },
    },
    {
      slug: "report-writer",
      name: "Report Writer",
      path: "agents/report-writer/AGENTS.md",
      role: "writer",
      title: "Technical Report Writer",
      icon: "file-text",
      capabilities: "writing,formatting,visualization,executive-summaries",
      reportsToSlug: "research-director",
      adapterType: "claude_local",
      adapterConfig: { model: "claude-sonnet-4-20250514" },
      runtimeConfig: { heartbeatIntervalMs: 30000 },
      permissions: { canApproveSpend: false, canHireAgents: false, canAccessAllProjects: true },
      budgetMonthlyCents: 2000,
      metadata: {
        personality: "Polished communicator. Transforms raw research into clear, well-structured reports with executive summaries and visualizations.",
      },
    },
  ],
  requiredSecrets: [
    {
      key: "ANTHROPIC_API_KEY",
      description: "Anthropic API key for Claude models",
      agentSlug: null,
      providerHint: "anthropic",
    },
  ],
};

// ── Seed Data ─────────────────────────────────────────────

export const SEED_LISTINGS = [
  {
    slug: "ai-research-agency",
    type: "team_blueprint" as const,
    title: "AI Research Agency",
    tagline: "A fully autonomous 7-agent research team that produces publication-quality reports",
    description: `The AI Research Agency is a pre-built company blueprint with 7 specialized agents organized in a clear hierarchy:

• **Research CEO** — Strategic oversight, task delegation, final review
• **Research Director** — Methodology planning, work breakdown, coordination
• **Senior Researcher** — Deep analysis, literature reviews, complex synthesis
• **Researcher Alpha** — Competitive intelligence, market data, trend analysis
• **Researcher Beta** — Technical documentation, architecture analysis
• **QA Reviewer** — Fact-checking, citation verification, bias detection
• **Report Writer** — Professional reports, executive summaries, visualizations

**How it works:**
1. Create a research issue (e.g. "Analyze the AI agent framework landscape")
2. The CEO delegates to the Research Director
3. The Director breaks the brief into work packages for researchers
4. Researchers gather data from web, papers, and databases
5. QA Reviewer verifies claims and checks for bias
6. Report Writer compiles everything into a polished deliverable
7. CEO reviews and approves the final output

Perfect for market research, competitive analysis, technical due diligence, literature reviews, and trend reports.`,
    readmeMarkdown: `# AI Research Agency

## Quick Start

1. Click **Install** to create the agency as a new company
2. Set your \`ANTHROPIC_API_KEY\` in Company Settings → Secrets
3. Create an issue describing your research topic
4. Watch the 7-agent team collaborate to produce your report

## Agent Hierarchy

\`\`\`
Research CEO
└── Research Director
    ├── Senior Researcher
    ├── Researcher Alpha
    ├── Researcher Beta
    ├── QA Reviewer
    └── Report Writer
\`\`\`

## Customization

- **Add more researchers**: Clone Researcher Alpha/Beta with different specializations
- **Change models**: Update adapter configs in agent settings
- **Adjust budgets**: Set per-agent monthly spend limits
- **Add skills**: Attach custom skills for domain-specific research

## Use Cases

- Market research & competitive intelligence
- Technical due diligence & architecture reviews
- Academic literature surveys
- Industry trend analysis
- Product research & feature benchmarking

## Requirements

- Anthropic API key (Claude Sonnet 4)
- Paperclip v0.1.0+
`,
    priceCents: 0,
    currency: "usd",
    categories: ["Research & Analysis", "General Purpose"],
    tags: ["research", "analysis", "reports", "competitive-intelligence", "literature-review", "autonomous", "team"],
    agentCount: 7,
    compatibleAdapters: ["claude_local"],
    requiredModels: ["claude-sonnet-4-20250514"],
    paperclipVersionMin: "0.1.0",
    installCount: 0,
    starCount: 0,
    reviewCount: 0,
    status: "published" as const,
    manifest: RESEARCH_AGENCY_MANIFEST,
    version: "1.0.0",
    changelog: "Initial release — 7-agent AI Research Agency with CEO, Research Director, 3 Researchers, QA Reviewer, and Report Writer.",
  },
  {
    slug: "ai-dev-team",
    type: "team_blueprint" as const,
    title: "AI Software Dev Team",
    tagline: "Ship features autonomously with a 5-agent engineering team",
    description: `A lean software development team blueprint with 5 agents:

• **Engineering Lead** — Architecture decisions, code review, sprint planning
• **Senior Developer** — Complex feature implementation, system design
• **Developer** — Feature development, bug fixes, test writing
• **QA Engineer** — Test strategy, integration testing, regression checks
• **DevOps Agent** — CI/CD, deployment, infrastructure management

Built for teams that want to automate software delivery end-to-end.`,
    readmeMarkdown: `# AI Software Dev Team

## Quick Start
1. Install the blueprint
2. Set your API keys
3. Create issues and watch them get built

## Agent Roles
- Engineering Lead: Reviews PRs, plans sprints
- Senior Dev: Architects complex features
- Developer: Implements features and fixes
- QA: Writes and runs tests
- DevOps: Manages CI/CD pipelines
`,
    priceCents: 0,
    currency: "usd",
    categories: ["Software Development"],
    tags: ["development", "engineering", "ci-cd", "testing", "devops", "autonomous"],
    agentCount: 5,
    compatibleAdapters: ["claude_local", "codex_local"],
    requiredModels: ["claude-sonnet-4-20250514"],
    paperclipVersionMin: "0.1.0",
    installCount: 0,
    starCount: 0,
    reviewCount: 0,
    status: "published" as const,
    manifest: {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      source: null,
      includes: { company: true, agents: true },
      company: {
        path: "COMPANY.md",
        name: "AI Dev Team",
        description: "Autonomous software development team",
        brandColor: "#10b981",
        requireBoardApprovalForNewAgents: true,
      },
      agents: [
        {
          slug: "eng-lead",
          name: "Engineering Lead",
          path: "agents/eng-lead/AGENTS.md",
          role: "manager",
          title: "Engineering Lead",
          icon: "code",
          capabilities: "architecture,code-review,planning,delegation",
          reportsToSlug: null,
          adapterType: "claude_local",
          adapterConfig: { model: "claude-sonnet-4-20250514" },
          runtimeConfig: { heartbeatIntervalMs: 30000 },
          permissions: { canApproveSpend: true, canHireAgents: false, canAccessAllProjects: true },
          budgetMonthlyCents: 4000,
          metadata: null,
        },
        {
          slug: "senior-dev",
          name: "Senior Developer",
          path: "agents/senior-dev/AGENTS.md",
          role: "engineer",
          title: "Senior Software Engineer",
          icon: "terminal",
          capabilities: "coding,system-design,debugging,refactoring",
          reportsToSlug: "eng-lead",
          adapterType: "claude_local",
          adapterConfig: { model: "claude-sonnet-4-20250514" },
          runtimeConfig: { heartbeatIntervalMs: 30000 },
          permissions: { canApproveSpend: false, canHireAgents: false, canAccessAllProjects: true },
          budgetMonthlyCents: 3000,
          metadata: null,
        },
        {
          slug: "developer",
          name: "Developer",
          path: "agents/developer/AGENTS.md",
          role: "engineer",
          title: "Software Engineer",
          icon: "code",
          capabilities: "coding,testing,bug-fixing",
          reportsToSlug: "eng-lead",
          adapterType: "claude_local",
          adapterConfig: { model: "claude-sonnet-4-20250514" },
          runtimeConfig: { heartbeatIntervalMs: 30000 },
          permissions: { canApproveSpend: false, canHireAgents: false, canAccessAllProjects: false },
          budgetMonthlyCents: 2000,
          metadata: null,
        },
        {
          slug: "qa-engineer",
          name: "QA Engineer",
          path: "agents/qa-engineer/AGENTS.md",
          role: "tester",
          title: "Quality Assurance Engineer",
          icon: "shield-check",
          capabilities: "testing,test-automation,regression,integration-testing",
          reportsToSlug: "eng-lead",
          adapterType: "claude_local",
          adapterConfig: { model: "claude-sonnet-4-20250514" },
          runtimeConfig: { heartbeatIntervalMs: 30000 },
          permissions: { canApproveSpend: false, canHireAgents: false, canAccessAllProjects: true },
          budgetMonthlyCents: 2000,
          metadata: null,
        },
        {
          slug: "devops",
          name: "DevOps Agent",
          path: "agents/devops/AGENTS.md",
          role: "operations",
          title: "DevOps Engineer",
          icon: "server",
          capabilities: "ci-cd,deployment,monitoring,infrastructure",
          reportsToSlug: "eng-lead",
          adapterType: "claude_local",
          adapterConfig: { model: "claude-sonnet-4-20250514" },
          runtimeConfig: { heartbeatIntervalMs: 30000 },
          permissions: { canApproveSpend: false, canHireAgents: false, canAccessAllProjects: true },
          budgetMonthlyCents: 2000,
          metadata: null,
        },
      ],
      requiredSecrets: [
        { key: "ANTHROPIC_API_KEY", description: "Anthropic API key", agentSlug: null, providerHint: "anthropic" },
      ],
    },
    version: "1.0.0",
    changelog: "Initial release — 5-agent engineering team.",
  },
  {
    slug: "content-marketing-agency",
    type: "team_blueprint" as const,
    title: "Content Marketing Agency",
    tagline: "Produce blog posts, social media content, and SEO strategy autonomously",
    description: `A 4-agent content marketing team:

• **Content Strategist** — Editorial calendar, SEO strategy, content planning
• **Copywriter** — Blog posts, landing pages, email sequences
• **Social Media Manager** — Platform-specific content, scheduling, engagement
• **SEO Analyst** — Keyword research, on-page optimization, performance tracking`,
    readmeMarkdown: `# Content Marketing Agency\n\nAutomate your content pipeline with 4 specialized AI agents.`,
    priceCents: 0,
    currency: "usd",
    categories: ["Marketing & Growth", "Content & Media"],
    tags: ["marketing", "content", "seo", "social-media", "copywriting", "blog"],
    agentCount: 4,
    compatibleAdapters: ["claude_local"],
    requiredModels: ["claude-sonnet-4-20250514"],
    paperclipVersionMin: "0.1.0",
    installCount: 0,
    starCount: 0,
    reviewCount: 0,
    status: "published" as const,
    manifest: {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      source: null,
      includes: { company: true, agents: true },
      company: {
        path: "COMPANY.md",
        name: "Content Marketing Agency",
        description: "Autonomous content marketing team",
        brandColor: "#f59e0b",
        requireBoardApprovalForNewAgents: true,
      },
      agents: [
        {
          slug: "content-strategist", name: "Content Strategist", path: "agents/content-strategist/AGENTS.md",
          role: "manager", title: "Content Strategist", icon: "layout",
          capabilities: "seo-strategy,editorial-planning,content-audit,keyword-research",
          reportsToSlug: null, adapterType: "claude_local",
          adapterConfig: { model: "claude-sonnet-4-20250514" }, runtimeConfig: { heartbeatIntervalMs: 30000 },
          permissions: { canApproveSpend: true, canHireAgents: false, canAccessAllProjects: true },
          budgetMonthlyCents: 3000, metadata: null,
        },
        {
          slug: "copywriter", name: "Copywriter", path: "agents/copywriter/AGENTS.md",
          role: "writer", title: "Senior Copywriter", icon: "pen-tool",
          capabilities: "blog-writing,email-copy,landing-pages,editing",
          reportsToSlug: "content-strategist", adapterType: "claude_local",
          adapterConfig: { model: "claude-sonnet-4-20250514" }, runtimeConfig: { heartbeatIntervalMs: 30000 },
          permissions: { canApproveSpend: false, canHireAgents: false, canAccessAllProjects: false },
          budgetMonthlyCents: 2000, metadata: null,
        },
        {
          slug: "social-media-mgr", name: "Social Media Manager", path: "agents/social-media-mgr/AGENTS.md",
          role: "marketer", title: "Social Media Manager", icon: "share-2",
          capabilities: "social-media,content-scheduling,engagement,analytics",
          reportsToSlug: "content-strategist", adapterType: "claude_local",
          adapterConfig: { model: "claude-sonnet-4-20250514" }, runtimeConfig: { heartbeatIntervalMs: 30000 },
          permissions: { canApproveSpend: false, canHireAgents: false, canAccessAllProjects: false },
          budgetMonthlyCents: 2000, metadata: null,
        },
        {
          slug: "seo-analyst", name: "SEO Analyst", path: "agents/seo-analyst/AGENTS.md",
          role: "analyst", title: "SEO Analyst", icon: "trending-up",
          capabilities: "keyword-research,on-page-seo,technical-seo,reporting",
          reportsToSlug: "content-strategist", adapterType: "claude_local",
          adapterConfig: { model: "claude-sonnet-4-20250514" }, runtimeConfig: { heartbeatIntervalMs: 30000 },
          permissions: { canApproveSpend: false, canHireAgents: false, canAccessAllProjects: true },
          budgetMonthlyCents: 2000, metadata: null,
        },
      ],
      requiredSecrets: [
        { key: "ANTHROPIC_API_KEY", description: "Anthropic API key", agentSlug: null, providerHint: "anthropic" },
      ],
    },
    version: "1.0.0",
    changelog: "Initial release — 4-agent content marketing team.",
  },
];

// ── Seed Runner ───────────────────────────────────────────

export async function seedMarketplace(db: Db) {
  // Dynamic import to avoid circular deps at top level
  const { marketplaceService } = await import("../services/marketplace.js");
  const svc = marketplaceService(db);

  // Create a system creator for seed data
  const creator = await svc.getOrCreateCreator("system", "Paperclip Team");

  for (const seed of SEED_LISTINGS) {
    // Check if already seeded
    const existing = await svc.getListingBySlug(seed.slug);
    if (existing) {
      console.log(`  ⏭  Listing "${seed.slug}" already exists, skipping`);
      continue;
    }

    const { manifest, version, changelog, ...listingData } = seed;

    const listing = await svc.createListing({
      ...listingData,
      creatorId: creator.id,
    });

    await svc.createVersion({
      listingId: listing.id,
      version,
      changelog,
      artifactUrl: `seed://${seed.slug}/v${version}`,
      manifest: manifest as Record<string, unknown>,
      agentCount: seed.agentCount,
      compatibleAdapters: seed.compatibleAdapters,
      requiredModels: seed.requiredModels,
    });

    console.log(`  ✅ Seeded "${seed.title}" (${seed.agentCount} agents)`);
  }

  console.log(`\n🏪 ClipMart seed complete — ${SEED_LISTINGS.length} listings`);
}
