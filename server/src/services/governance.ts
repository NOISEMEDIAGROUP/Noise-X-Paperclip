// @ts-nocheck
import { eq } from "drizzle-orm";
import { agents, approvals } from "@paperclipai/db";
import { agentRuntimePolicySchema } from "@paperclipai/shared";
import { notFound } from "../errors.js";
const ACTION_CATALOG = [
  {
    id: "restart_service",
    label: "Restart service",
    description: "Restart a bounded service or worker after a safe health-check failure.",
    tier: 1,
    mutation: true,
    environments: ["sandbox", "staging", "production"],
    requiresApproval: false,
    defaultAllowedRoles: ["security", "devops", "ceo"],
    verificationHint: "Re-run health checks and confirm uptime recovers.",
    rollbackHint: "Revert to prior process state or pause restart loop."
  },
  {
    id: "retry_failed_job",
    label: "Retry failed job",
    description: "Replay an idempotent failed task or queue item.",
    tier: 1,
    mutation: true,
    environments: ["sandbox", "staging", "production"],
    requiresApproval: false,
    defaultAllowedRoles: ["devops", "engineer", "ceo"],
    verificationHint: "Verify the job succeeds and queue lag drops.",
    rollbackHint: "Cancel the replayed job and restore queue state."
  },
  {
    id: "pause_agent",
    label: "Pause agent",
    description: "Pause an agent to contain risk, budget drift, or incidents.",
    tier: 1,
    mutation: true,
    environments: ["sandbox", "staging", "production"],
    requiresApproval: false,
    defaultAllowedRoles: ["ceo", "security", "devops"],
    verificationHint: "Confirm the agent is paused and no new runs queue.",
    rollbackHint: "Resume the agent after mitigation."
  },
  {
    id: "resume_agent",
    label: "Resume agent",
    description: "Resume a previously paused agent after mitigation.",
    tier: 1,
    mutation: true,
    environments: ["sandbox", "staging", "production"],
    requiresApproval: false,
    defaultAllowedRoles: ["ceo", "devops"],
    verificationHint: "Verify heartbeat runs resume without errors.",
    rollbackHint: "Pause the agent again if the issue reappears."
  },
  {
    id: "open_issue",
    label: "Open issue",
    description: "Create a new tracked task or incident for a follow-up action.",
    tier: 1,
    mutation: true,
    environments: ["sandbox", "staging", "production"],
    requiresApproval: false,
    defaultAllowedRoles: ["ceo", "engineer", "pm", "support", "marketing"],
    verificationHint: "Confirm the issue is created with correct assignee and scope.",
    rollbackHint: "Close or cancel the issue if it is not needed."
  },
  {
    id: "open_pr",
    label: "Open PR",
    description: "Prepare and open a pull request after implementation work is verified.",
    tier: 2,
    mutation: true,
    environments: ["sandbox", "staging"],
    requiresApproval: false,
    defaultAllowedRoles: ["engineer", "cto"],
    verificationHint: "Validate checks, diff scope, and PR summary.",
    rollbackHint: "Close the PR or revert the source branch changes."
  },
  {
    id: "deploy_staging",
    label: "Deploy staging",
    description: "Deploy a verified change to staging for validation.",
    tier: 2,
    mutation: true,
    environments: ["staging"],
    requiresApproval: false,
    defaultAllowedRoles: ["devops", "engineer", "cto"],
    verificationHint: "Run smoke tests and confirm staging health.",
    rollbackHint: "Redeploy the previous known-good build."
  },
  {
    id: "assign_issue",
    label: "Assign issue",
    description: "Assign work to a specific agent or team owner.",
    tier: 1,
    mutation: true,
    environments: ["sandbox", "staging", "production"],
    requiresApproval: false,
    defaultAllowedRoles: ["ceo", "pm"],
    verificationHint: "Confirm the assignee is correct and notified.",
    rollbackHint: "Reassign the issue to the prior owner."
  },
  {
    id: "send_telegram_alert",
    label: "Send Telegram alert",
    description: "Send an operational alert or brief through Telegram.",
    tier: 1,
    mutation: true,
    environments: ["sandbox", "staging", "production"],
    requiresApproval: false,
    defaultAllowedRoles: ["ceo", "security", "devops", "finance"],
    verificationHint: "Confirm the alert is delivered to the intended chat.",
    rollbackHint: "Send a correction follow-up if the content was wrong."
  },
  {
    id: "send_email_alert",
    label: "Send email alert",
    description: "Send an operational email alert.",
    tier: 1,
    mutation: true,
    environments: ["sandbox", "staging", "production"],
    requiresApproval: false,
    defaultAllowedRoles: ["ceo", "support", "finance"],
    verificationHint: "Confirm delivery and recipient targeting.",
    rollbackHint: "Send a correction or suppress follow-up sends."
  },
  {
    id: "sync_metrics",
    label: "Sync metrics",
    description: "Ingest or refresh metrics from configured systems.",
    tier: 0,
    mutation: false,
    environments: ["sandbox", "staging", "production"],
    requiresApproval: false,
    defaultAllowedRoles: ["ceo", "cfo", "security", "devops"],
    verificationHint: "Confirm metrics timestamps advance and values are sane.",
    rollbackHint: "Recompute from the last good snapshot."
  },
  {
    id: "recompute_kpis",
    label: "Recompute KPIs",
    description: "Recalculate company KPIs from source data.",
    tier: 1,
    mutation: true,
    environments: ["sandbox", "staging", "production"],
    requiresApproval: false,
    defaultAllowedRoles: ["ceo", "cfo"],
    verificationHint: "Compare KPI deltas to expected source-of-truth changes.",
    rollbackHint: "Restore the last valid KPI snapshot."
  },
  {
    id: "replay_webhook",
    label: "Replay webhook",
    description: "Replay a missed or failed webhook event.",
    tier: 1,
    mutation: true,
    environments: ["sandbox", "staging", "production"],
    requiresApproval: false,
    defaultAllowedRoles: ["devops", "security", "finance"],
    verificationHint: "Confirm downstream state matches the replayed event.",
    rollbackHint: "Reverse the replayed mutation if the event was invalid."
  },
  {
    id: "post_content",
    label: "Post content",
    description: "Publish prepared marketing or product content.",
    tier: 2,
    mutation: true,
    environments: ["staging", "production"],
    requiresApproval: false,
    defaultAllowedRoles: ["cmo", "marketing", "ceo"],
    verificationHint: "Confirm content copy, links, and destination channel.",
    rollbackHint: "Delete the post or publish a correction."
  },
  {
    id: "create_objective",
    label: "Create objective",
    description: "Create a new OKR objective proposal.",
    tier: 2,
    mutation: true,
    environments: ["sandbox", "staging", "production"],
    requiresApproval: false,
    defaultAllowedRoles: ["ceo", "pm"],
    verificationHint: "Confirm objective scope, owner, and deadline.",
    rollbackHint: "Archive the objective if it is incorrect."
  },
  {
    id: "update_objective_progress",
    label: "Update objective progress",
    description: "Update an objective or key-result progress value.",
    tier: 1,
    mutation: true,
    environments: ["sandbox", "staging", "production"],
    requiresApproval: false,
    defaultAllowedRoles: ["ceo", "pm", "engineer", "cfo"],
    verificationHint: "Validate the progress source and resulting percentage.",
    rollbackHint: "Restore the previous progress value."
  },
  {
    id: "request_human_approval",
    label: "Request human approval",
    description: "Escalate a proposed action to the Board.",
    tier: 3,
    mutation: true,
    environments: ["sandbox", "staging", "production"],
    requiresApproval: true,
    defaultAllowedRoles: ["ceo", "security", "devops", "engineer"],
    verificationHint: "Ensure the approval packet includes evidence and rollback.",
    rollbackHint: "Cancel the approval if the action is no longer needed."
  }
];
const ACTION_LOOKUP = new Map(ACTION_CATALOG.map((entry) => [entry.id, entry]));
function unique(values) {
  return Array.from(new Set(values));
}
function defaultClassesForRole(role) {
  switch (role) {
    case "ceo":
      return ["observer", "advisor", "operator", "guardian"];
    case "engineer":
    case "cto":
      return ["advisor", "executor", "operator"];
    case "cfo":
      return ["observer", "advisor", "guardian"];
    case "cmo":
      return ["advisor", "operator", "learner"];
    case "qa":
    case "devops":
      return ["observer", "operator", "guardian"];
    default:
      return ["advisor", "operator"];
  }
}
function recommendedMonthlyBudget(role, currentBudgetCents) {
  if (currentBudgetCents > 0) return currentBudgetCents;
  switch (role) {
    case "ceo":
      return 500;
    case "cto":
    case "engineer":
      return 1200;
    case "cfo":
      return 400;
    case "cmo":
      return 800;
    case "qa":
      return 200;
    case "devops":
      return 100;
    default:
      return 300;
  }
}
function defaultAllowedActionsForRole(role) {
  switch (role) {
    case "ceo":
      return [
        "open_issue",
        "assign_issue",
        "sync_metrics",
        "recompute_kpis",
        "send_telegram_alert",
        "create_objective",
        "update_objective_progress",
        "request_human_approval",
        "pause_agent",
        "resume_agent"
      ];
    case "cto":
    case "engineer":
      return [
        "open_issue",
        "open_pr",
        "deploy_staging",
        "retry_failed_job",
        "replay_webhook",
        "request_human_approval"
      ];
    case "cfo":
      return [
        "sync_metrics",
        "recompute_kpis",
        "send_email_alert",
        "send_telegram_alert",
        "update_objective_progress",
        "request_human_approval"
      ];
    case "cmo":
      return ["open_issue", "post_content", "send_email_alert", "request_human_approval"];
    case "qa":
    case "devops":
      return [
        "restart_service",
        "retry_failed_job",
        "pause_agent",
        "resume_agent",
        "replay_webhook",
        "send_telegram_alert",
        "request_human_approval"
      ];
    default:
      return ["open_issue", "request_human_approval"];
  }
}
function recommendedRequiredFor(role) {
  const baseline = ["request_human_approval"];
  if (role === "ceo" || role === "cfo" || role === "cmo") {
    baseline.push("post_content", "create_objective");
  }
  if (role === "cto" || role === "engineer") {
    baseline.push("open_pr", "deploy_staging");
  }
  return unique(baseline);
}
function mergePolicy(base, override) {
  if (!override) return base;
  const parsed = agentRuntimePolicySchema.parse({
    ...base,
    ...override,
    approvalRules: {
      ...base.approvalRules,
      ...override.approvalRules ?? {},
      thresholds: {
        ...base.approvalRules.thresholds,
        ...override.approvalRules?.thresholds ?? {}
      }
    },
    budgets: {
      ...base.budgets,
      ...override.budgets ?? {}
    },
    safety: {
      ...base.safety,
      ...override.safety ?? {}
    }
  });
  parsed.allowedActions = unique(parsed.allowedActions);
  parsed.blockedActions = unique(parsed.blockedActions);
  parsed.allowedTargets = unique(parsed.allowedTargets);
  parsed.classes = unique(parsed.classes);
  parsed.approvalRules.requiredFor = unique(parsed.approvalRules.requiredFor);
  return parsed;
}
function recommendedRuntimePolicy(input) {
  const base = agentRuntimePolicySchema.parse({
    mode: input.mode ?? "hybrid",
    classes: input.classes && input.classes.length > 0 ? input.classes : defaultClassesForRole(input.role),
    environment: input.runtimeEnvironment ?? "sandbox",
    allowedActions: defaultAllowedActionsForRole(input.role),
    blockedActions: [],
    allowedTargets: [],
    approvalRules: {
      requiredFor: recommendedRequiredFor(input.role),
      thresholds: {
        spendCents: 5e3,
        riskScore: 70,
        blastRadius: 50,
        confidenceBelow: 65
      }
    },
    budgets: {
      monthlyCents: recommendedMonthlyBudget(input.role, input.budgetMonthlyCents),
      dailyCents: Math.max(50, Math.round(recommendedMonthlyBudget(input.role, input.budgetMonthlyCents) / 30)),
      maxSingleRunCents: Math.max(25, Math.round(recommendedMonthlyBudget(input.role, input.budgetMonthlyCents) / 10)),
      maxRuntimeSec: 900
    },
    safety: {
      canSelfHeal: input.role === "devops" || input.role === "qa",
      canSelfLearn: input.role === "cmo" || input.role === "ceo",
      canUseInternet: input.role === "ceo" || input.role === "cmo" || input.role === "researcher",
      requireVerificationAfterAction: true,
      requireRollbackPlanForMutation: true
    }
  });
  return mergePolicy(base, input.runtimePolicy);
}
function normalizeGovernanceFields(input) {
  const policy = recommendedRuntimePolicy({
    role: input.role,
    budgetMonthlyCents: input.budgetMonthlyCents,
    mode: input.mode ?? void 0,
    classes: input.classes ?? void 0,
    runtimeEnvironment: input.runtimeEnvironment ?? void 0,
    runtimePolicy: input.runtimePolicy ?? void 0
  });
  return {
    mode: policy.mode,
    classes: policy.classes,
    runtimeEnvironment: policy.environment,
    runtimePolicy: policy
  };
}
function baseRiskForTier(tier) {
  switch (tier) {
    case 0:
      return 5;
    case 1:
      return 30;
    case 2:
      return 55;
    default:
      return 80;
  }
}
function customerImpactRisk(level) {
  switch (level) {
    case "low":
      return 5;
    case "medium":
      return 15;
    case "high":
      return 25;
    default:
      return 0;
  }
}
function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
function assessGovernedAction(agent, proposal) {
  const action = ACTION_LOOKUP.get(proposal.actionId);
  if (!action) {
    throw notFound("Action not found in catalog");
  }
  const policy = normalizeGovernanceFields(agent).runtimePolicy;
  const environment = proposal.environment ?? policy.environment;
  const moneyImpactCents = Math.max(0, proposal.moneyImpactCents ?? 0);
  const blastRadiusScore = clampScore(
    proposal.blastRadiusScore ?? Math.min(100, Math.max(0, ((proposal.targetIds?.length ?? 1) - 1) * 20))
  );
  const reversibilityScore = clampScore(
    proposal.reversibilityScore ?? (action.tier <= 1 ? 90 : action.tier === 2 ? 60 : 25)
  );
  const confidenceScore = clampScore(proposal.confidenceScore ?? (action.tier <= 1 ? 85 : 70));
  const customerImpactLevel = proposal.customerImpactLevel ?? "none";
  const riskScore = clampScore(
    baseRiskForTier(action.tier) + customerImpactRisk(customerImpactLevel) + (environment === "production" && action.mutation ? 20 : 0) + (moneyImpactCents >= 1e4 ? 15 : moneyImpactCents >= 5e3 ? 10 : 0) + Math.max(0, Math.round(blastRadiusScore / 5)) - Math.round(reversibilityScore / 10)
  );
  if (policy.blockedActions.includes(proposal.actionId)) {
    return {
      actionId: proposal.actionId,
      tier: action.tier,
      disposition: "blocked",
      reason: "Blocked by agent runtime policy.",
      riskScore,
      confidenceScore,
      blastRadiusScore,
      reversibilityScore,
      moneyImpactCents,
      customerImpactLevel,
      requiresApproval: false,
      verificationRequired: false
    };
  }
  if (!action.environments.includes(environment)) {
    return {
      actionId: proposal.actionId,
      tier: action.tier,
      disposition: "blocked",
      reason: `Action is not allowed in ${environment}.`,
      riskScore,
      confidenceScore,
      blastRadiusScore,
      reversibilityScore,
      moneyImpactCents,
      customerImpactLevel,
      requiresApproval: false,
      verificationRequired: false
    };
  }
  if (!policy.allowedActions.includes(proposal.actionId)) {
    return {
      actionId: proposal.actionId,
      tier: action.tier,
      disposition: "blocked",
      reason: "Action is outside the agent's allowed action set.",
      riskScore,
      confidenceScore,
      blastRadiusScore,
      reversibilityScore,
      moneyImpactCents,
      customerImpactLevel,
      requiresApproval: false,
      verificationRequired: false
    };
  }
  const thresholds = policy.approvalRules.thresholds;
  const requiresApproval = action.requiresApproval || policy.mode === "manual" || policy.approvalRules.requiredFor.includes(proposal.actionId) || thresholds.spendCents !== void 0 && moneyImpactCents >= thresholds.spendCents || thresholds.riskScore !== void 0 && riskScore >= thresholds.riskScore || thresholds.blastRadius !== void 0 && blastRadiusScore >= thresholds.blastRadius || thresholds.confidenceBelow !== void 0 && confidenceScore < thresholds.confidenceBelow || policy.safety.requireRollbackPlanForMutation && action.mutation && !proposal.rollbackPlan || environment === "production" && action.mutation;
  const verificationRequired = action.mutation && policy.safety.requireVerificationAfterAction;
  return {
    actionId: proposal.actionId,
    tier: action.tier,
    disposition: requiresApproval ? "require_approval" : verificationRequired ? "allow_with_verification" : "allow",
    reason: requiresApproval ? "Thresholds or policy require Board approval before execution." : verificationRequired ? "Action is allowed but must be verified after execution." : "Action is allowed within current policy.",
    riskScore,
    confidenceScore,
    blastRadiusScore,
    reversibilityScore,
    moneyImpactCents,
    customerImpactLevel,
    requiresApproval,
    verificationRequired
  };
}
function governanceService(db) {
  return {
    actionCatalog: () => ACTION_CATALOG,
    getAgentPolicy: async (agentId) => {
      const agent = await db.select().from(agents).where(eq(agents.id, agentId)).then((rows) => rows[0] ?? null);
      if (!agent) throw notFound("Agent not found");
      return normalizeGovernanceFields(agent);
    },
    evaluateAction: async (companyId, proposal) => {
      const agent = await db.select().from(agents).where(eq(agents.id, proposal.agentId)).then((rows) => rows[0] ?? null);
      if (!agent || agent.companyId !== companyId) throw notFound("Agent not found");
      return assessGovernedAction({ ...agent, ...normalizeGovernanceFields(agent) }, proposal);
    },
    createApprovalForProposal: async (companyId, proposal) => {
      const agent = await db.select().from(agents).where(eq(agents.id, proposal.agentId)).then((rows) => rows[0] ?? null);
      if (!agent || agent.companyId !== companyId) throw notFound("Agent not found");
      const normalizedAgent = { ...agent, ...normalizeGovernanceFields(agent) };
      const assessment = assessGovernedAction(normalizedAgent, proposal);
      const approval = await db.insert(approvals).values({
        companyId,
        type: "governed_action",
        actionId: proposal.actionId,
        requestedByAgentId: proposal.agentId,
        requestedByUserId: null,
        status: "pending",
        riskScore: assessment.riskScore,
        confidenceScore: assessment.confidenceScore,
        blastRadiusScore: assessment.blastRadiusScore,
        reversibilityScore: assessment.reversibilityScore,
        moneyImpactCents: assessment.moneyImpactCents,
        customerImpactLevel: assessment.customerImpactLevel,
        payload: {
          proposal,
          assessment,
          policy: normalizedAgent.runtimePolicy
        },
        evidence: proposal.evidence ?? {},
        rollbackPlan: proposal.rollbackPlan ?? null,
        verificationPlan: proposal.verificationPlan ?? null,
        delayConsequence: proposal.delayConsequence ?? null,
        decisionNote: null,
        decidedByUserId: null,
        decidedAt: null,
        updatedAt: /* @__PURE__ */ new Date()
      }).returning().then((rows) => rows[0]);
      return { approval, assessment, agent: normalizedAgent };
    }
  };
}
export {
  assessGovernedAction,
  governanceService,
  normalizeGovernanceFields,
  recommendedRuntimePolicy
};
