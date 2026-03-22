import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents, companies, companySecrets, skills } from "@paperclipai/db";
import type {
  Agent,
  DepartmentBootstrapResult,
  DepartmentStatusEntry,
  DepartmentStatusSummary,
  EnvBinding,
} from "@paperclipai/shared";
import { agentService } from "./agents.js";
import { notFound } from "../errors.js";

type DepartmentDefinition = {
  key: string;
  label: string;
  role: Agent["role"];
  icon: Agent["icon"];
  defaultName: string;
  defaultTitle: string;
  capabilities: string;
  skillName: string;
  skillLabel: string;
  skillScope: Array<Agent["role"] | "all">;
  skillContent: string;
  heartbeatIntervalSec: number;
  reportsTo?: string | null;
  wakeOnDemand?: boolean;
};

const DEPARTMENT_DEFINITIONS: DepartmentDefinition[] = [
  {
    key: "ceo",
    label: "CEO",
    role: "ceo",
    icon: "crown",
    defaultName: "CEO",
    defaultTitle: "Chief Executive Officer",
    capabilities: "Company strategy, executive direction, board communication, and daily operating review.",
    skillName: "dept_ceo_ops",
    skillLabel: "CEO Operating Rhythm",
    skillScope: ["ceo"],
    skillContent: "Daily executive loop: review objectives, directives, company health, metrics, and approvals; delegate next actions clearly and keep the board informed.",
    heartbeatIntervalSec: 300,
    reportsTo: null,
    wakeOnDemand: true,
  },
  {
    key: "finance",
    label: "Finance",
    role: "cfo",
    icon: "database",
    defaultName: "FinanceLead",
    defaultTitle: "Finance Department Lead",
    capabilities: "Revenue review, cash discipline, KPI interpretation, and board-ready financial reporting.",
    skillName: "dept_finance_ops",
    skillLabel: "Finance Operating Rhythm",
    skillScope: ["cfo"],
    skillContent: "Monitor revenue, margins, cash efficiency, and approval-bound spend; raise clear recommendations and risks to the CEO.",
    heartbeatIntervalSec: 900,
    reportsTo: "ceo",
    wakeOnDemand: true,
  },
  {
    key: "marketing",
    label: "Marketing",
    role: "cmo",
    icon: "sparkles",
    defaultName: "MarketingLead",
    defaultTitle: "Marketing Department Lead",
    capabilities: "Audience growth, content planning, signup conversion, and owned-channel performance.",
    skillName: "dept_marketing_ops",
    skillLabel: "Marketing Operating Rhythm",
    skillScope: ["cmo"],
    skillContent: "Review content, channel performance, signups, and funnel conversion; prioritize tests and content moves that improve growth quality.",
    heartbeatIntervalSec: 1800,
    reportsTo: "ceo",
    wakeOnDemand: true,
  },
  {
    key: "support",
    label: "Support",
    role: "general",
    icon: "message-square",
    defaultName: "SupportLead",
    defaultTitle: "Support Department Lead",
    capabilities: "Inbox triage, user communication, issue creation, and escalation routing.",
    skillName: "dept_support_ops",
    skillLabel: "Support Operating Rhythm",
    skillScope: ["general"],
    skillContent: "Triage inbound issues, convert repeated pain points into tasks, and keep users updated with precise operational context.",
    heartbeatIntervalSec: 600,
    reportsTo: "ceo",
    wakeOnDemand: true,
  },
  {
    key: "security",
    label: "Security",
    role: "qa",
    icon: "shield",
    defaultName: "SecurityLead",
    defaultTitle: "Security Department Lead",
    capabilities: "Risk review, safety checks, incident escalation, and verification discipline.",
    skillName: "dept_security_ops",
    skillLabel: "Security Operating Rhythm",
    skillScope: ["qa"],
    skillContent: "Continuously review risky actions, integration status, and security-sensitive changes; verify, escalate, and document clearly.",
    heartbeatIntervalSec: 450,
    reportsTo: "ceo",
    wakeOnDemand: true,
  },
  {
    key: "reliability",
    label: "Reliability",
    role: "devops",
    icon: "rocket",
    defaultName: "ReliabilityLead",
    defaultTitle: "Reliability Department Lead",
    capabilities: "Service uptime, deployments, webhooks, and circuit-breaker style operational recovery.",
    skillName: "dept_reliability_ops",
    skillLabel: "Reliability Operating Rhythm",
    skillScope: ["devops"],
    skillContent: "Track health signals, queues, and deployment status; auto-recover safe failures and escalate anything with wider blast radius.",
    heartbeatIntervalSec: 300,
    reportsTo: "ceo",
    wakeOnDemand: true,
  },
  {
    key: "developer",
    label: "Developer",
    role: "engineer",
    icon: "code",
    defaultName: "DeveloperLead",
    defaultTitle: "Developer Department Lead",
    capabilities: "Implementation, code review readiness, technical execution, and product delivery support.",
    skillName: "dept_developer_ops",
    skillLabel: "Developer Operating Rhythm",
    skillScope: ["engineer"],
    skillContent: "Execute clearly-scoped engineering work, keep diffs tight, verify behavior changes, and route risky actions through approvals.",
    heartbeatIntervalSec: 600,
    reportsTo: "ceo",
    wakeOnDemand: true,
  },
];

function parseRequiredSkills(agent: typeof agents.$inferSelect) {
  const result = new Set<string>();
  const adapterConfig = (agent.adapterConfig ?? {}) as Record<string, unknown>;
  const explicit = Array.isArray(adapterConfig.requiredSkills) ? adapterConfig.requiredSkills : [];
  for (const value of explicit) {
    if (typeof value === "string" && value.trim()) result.add(value.trim());
  }
  const env =
    typeof adapterConfig.env === "object" && adapterConfig.env !== null && !Array.isArray(adapterConfig.env)
      ? (adapterConfig.env as Record<string, EnvBinding>)
      : {};
  const binding = env.PAPERCLIP_REQUIRED_SKILLS;
  if (binding && typeof binding === "object" && "value" in binding && typeof binding.value === "string") {
    for (const value of binding.value.split(",").map((entry) => entry.trim()).filter(Boolean)) {
      result.add(value);
    }
  }
  return Array.from(result);
}

function upsertSkillEnv(env: Record<string, EnvBinding>, requiredSkills: string[]) {
  const next = { ...env };
  if (requiredSkills.length > 0) {
    next.PAPERCLIP_REQUIRED_SKILLS = { type: "plain", value: requiredSkills.join(",") };
  }
  return next;
}

function buildDepartmentMetadata(definition: DepartmentDefinition, requiredSkills: string[]) {
  return {
    departmentKey: definition.key,
    departmentLabel: definition.label,
    departmentSkillName: definition.skillName,
    phase7Managed: true,
    requiredSkills,
    cadenceSec: definition.heartbeatIntervalSec,
  };
}

function buildSystemPrompt(definition: DepartmentDefinition) {
  return `You are the ${definition.defaultTitle} for the company. Focus on ${definition.capabilities} Stay within company policies, heartbeat cadence, and governance rules.`;
}

function preferredExistingAgent(definition: DepartmentDefinition, existingAgents: Array<typeof agents.$inferSelect>) {
  return (
    existingAgents.find((agent) => {
      const metadata = (agent.metadata ?? {}) as Record<string, unknown>;
      return metadata.departmentKey === definition.key;
    }) ??
    existingAgents.find((agent) => agent.role === definition.role && agent.status !== "terminated") ??
    null
  );
}

export function departmentService(db: Db) {
  const agentSvc = agentService(db);

  async function buildStatus(companyId: string): Promise<DepartmentStatusSummary> {
    const company = await db.select().from(companies).where(eq(companies.id, companyId)).then((rows) => rows[0] ?? null);
    if (!company) throw notFound("Company not found");

    const existingAgents = await db.select().from(agents).where(eq(agents.companyId, companyId));
    const existingSkills = await db
      .select({ name: skills.name })
      .from(skills)
      .where(eq(skills.companyId, companyId))
      .then((rows) => new Set(rows.map((row) => row.name)));

    const entries: DepartmentStatusEntry[] = DEPARTMENT_DEFINITIONS.map((definition) => {
      const agent = preferredExistingAgent(definition, existingAgents);
      const reasons: string[] = [];
      if (!agent) {
        reasons.push("No department agent assigned yet.");
      }
      if (!existingSkills.has(definition.skillName)) {
        reasons.push("Department skill profile is missing.");
      }
      if (agent) {
        const requiredSkills = parseRequiredSkills(agent);
        if (!requiredSkills.includes(definition.skillName)) {
          reasons.push("Agent is missing the department skill requirement.");
        }
        const heartbeat = ((agent.runtimeConfig ?? {}) as Record<string, unknown>).heartbeat as Record<string, unknown> | undefined;
        if (!heartbeat || heartbeat.enabled === false) {
          reasons.push("Heartbeat is disabled.");
        } else if (Number(heartbeat.intervalSec ?? 0) !== definition.heartbeatIntervalSec) {
          reasons.push(`Heartbeat cadence is not ${definition.heartbeatIntervalSec}s.`);
        }
        const metadata = (agent.metadata ?? {}) as Record<string, unknown>;
        if (metadata.departmentKey !== definition.key) {
          reasons.push("Department metadata is not applied.");
        }
      }
      const status = !agent ? "missing" : reasons.length === 0 ? "ready" : "partial";
      return {
        key: definition.key,
        label: definition.label,
        role: definition.role,
        title: definition.defaultTitle,
        skillName: definition.skillName,
        heartbeatIntervalSec: definition.heartbeatIntervalSec,
        existingAgentId: agent?.id ?? null,
        existingAgentName: agent?.name ?? null,
        status,
        reasons,
      };
    });

    return {
      companyId,
      companyName: company.name,
      readyCount: entries.filter((entry) => entry.status === "ready").length,
      partialCount: entries.filter((entry) => entry.status === "partial").length,
      missingCount: entries.filter((entry) => entry.status === "missing").length,
      entries,
    };
  }

  return {
    definitions: () => DEPARTMENT_DEFINITIONS,

    status: buildStatus,

    bootstrap: async (companyId: string): Promise<DepartmentBootstrapResult> => {
      const company = await db.select().from(companies).where(eq(companies.id, companyId)).then((rows) => rows[0] ?? null);
      if (!company) throw notFound("Company not found");

      const existingAgents = await db.select().from(agents).where(eq(agents.companyId, companyId));
      const existingSkills = await db.select().from(skills).where(eq(skills.companyId, companyId));
      const createdSkills: string[] = [];
      const createdAgents: Array<{ id: string; name: string; departmentKey: string }> = [];
      const updatedAgents: Array<{ id: string; name: string; departmentKey: string }> = [];

      for (const definition of DEPARTMENT_DEFINITIONS) {
        if (!existingSkills.some((skill) => skill.name === definition.skillName)) {
          await db.insert(skills).values({
            companyId,
            name: definition.skillName,
            label: definition.skillLabel,
            description: `${definition.label} department operating profile`,
            content: definition.skillContent,
            scope: definition.skillScope,
          });
          createdSkills.push(definition.skillName);
        }
      }

      const secretRows = await db
        .select({ id: companySecrets.id, name: companySecrets.name })
        .from(companySecrets)
        .where(and(eq(companySecrets.companyId, companyId), inArray(companySecrets.name, ["provider-alibaba-api-key", "alibaba-api-key"])));
      const alibabaSecret = secretRows[0] ?? null;

      const templateProcessAgent = existingAgents.find((agent) => agent.adapterType === "process") ?? null;
      const templateEnv =
        templateProcessAgent && typeof templateProcessAgent.adapterConfig === "object" && templateProcessAgent.adapterConfig !== null && !Array.isArray(templateProcessAgent.adapterConfig)
          ? ((templateProcessAgent.adapterConfig as Record<string, unknown>).env as Record<string, EnvBinding> | undefined) ?? {}
          : {};

      const applied = new Map<string, string>();
      for (const definition of DEPARTMENT_DEFINITIONS) {
        const reportsToId = definition.reportsTo ? applied.get(definition.reportsTo) ?? preferredExistingAgent(DEPARTMENT_DEFINITIONS.find((entry) => entry.key === definition.reportsTo)!, existingAgents)?.id ?? null : null;
        const existing = preferredExistingAgent(definition, existingAgents);
        const requiredSkills = Array.from(new Set(["paperclip", definition.skillName]));

        const heartbeat = {
          enabled: true,
          intervalSec: definition.heartbeatIntervalSec,
          wakeOnDemand: definition.wakeOnDemand ?? true,
          cooldownSec: 10,
          maxConcurrentRuns: 1,
        };

        const env: Record<string, EnvBinding> = upsertSkillEnv({ ...templateEnv }, requiredSkills);
        if (!env.MODEL_NAME) {
          env.MODEL_NAME = { type: "plain", value: definition.role === "ceo" ? "MiniMax-M2.5" : "qwen3-coder-plus" };
        }
        if (!env.MODEL_BASE_URL) {
          env.MODEL_BASE_URL = { type: "plain", value: "https://coding-intl.dashscope.aliyuncs.com/v1" };
        }
        if (!env.MAX_TOOL_TURNS) {
          env.MAX_TOOL_TURNS = { type: "plain", value: "10" };
        }
        if (!env.ENABLE_TOOL_USE) {
          env.ENABLE_TOOL_USE = { type: "plain", value: "true" };
        }
        if (!env.ALIBABA_API_KEY && alibabaSecret) {
          env.ALIBABA_API_KEY = { type: "secret_ref", secretId: alibabaSecret.id, version: "latest" } as EnvBinding;
        }
        env.AGENT_SYSTEM_PROMPT = { type: "plain", value: buildSystemPrompt(definition) };

        const metadata = buildDepartmentMetadata(definition, requiredSkills);

        if (existing) {
          const adapterConfig = (existing.adapterConfig ?? {}) as Record<string, unknown>;
          const existingRequiredSkills = parseRequiredSkills(existing);
          const mergedSkills = Array.from(new Set([...existingRequiredSkills, ...requiredSkills]));
          await agentSvc.update(existing.id, {
            title: existing.title ?? definition.defaultTitle,
            icon: existing.icon ?? definition.icon,
            reportsTo: definition.key === "ceo" ? null : existing.reportsTo ?? reportsToId,
            capabilities: existing.capabilities ?? definition.capabilities,
            adapterType: existing.adapterType || "process",
            adapterConfig: {
              ...adapterConfig,
              requiredSkills: mergedSkills,
              env: upsertSkillEnv((adapterConfig.env as Record<string, EnvBinding> | undefined) ?? env, mergedSkills),
            },
            runtimeConfig: {
              ...((existing.runtimeConfig ?? {}) as Record<string, unknown>),
              heartbeat,
            },
            metadata: {
              ...((existing.metadata ?? {}) as Record<string, unknown>),
              ...metadata,
            },
          });
          updatedAgents.push({ id: existing.id, name: existing.name, departmentKey: definition.key });
          applied.set(definition.key, existing.id);
          continue;
        }

        const created = await agentSvc.create(companyId, {
          name: definition.defaultName,
          role: definition.role,
          title: definition.defaultTitle,
          icon: definition.icon,
          reportsTo: reportsToId,
          capabilities: definition.capabilities,
          adapterType: "process",
          adapterConfig: {
            env,
            requiredSkills,
            command: "python3",
            args: ["/Users/jonathannugroho/.paperclip/workers/multi_model_worker.py"],
          },
          runtimeConfig: { heartbeat },
          budgetMonthlyCents: 500,
          metadata,
          status: "idle",
        });
        createdAgents.push({ id: created.id, name: created.name, departmentKey: definition.key });
        applied.set(definition.key, created.id);
      }

      const status = await buildStatus(companyId);
      return { companyId, createdAgents, updatedAgents, createdSkills, status };
    },
  };
}
