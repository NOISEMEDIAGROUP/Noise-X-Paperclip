import type {
  ActionTier,
  AgentClass,
  AgentMode,
  CustomerImpactLevel,
  GovernanceActionId,
  PolicyEnvironment,
} from "../constants.js";

export interface AgentRuntimePolicy {
  mode: AgentMode;
  classes: AgentClass[];
  environment: PolicyEnvironment;
  allowedActions: GovernanceActionId[];
  blockedActions: GovernanceActionId[];
  allowedTargets: string[];
  approvalRules: {
    requiredFor: GovernanceActionId[];
    thresholds: {
      spendCents?: number;
      riskScore?: number;
      blastRadius?: number;
      confidenceBelow?: number;
    };
  };
  budgets: {
    monthlyCents: number;
    dailyCents?: number;
    maxSingleRunCents?: number;
    maxRuntimeSec?: number;
  };
  safety: {
    canSelfHeal: boolean;
    canSelfLearn: boolean;
    canUseInternet: boolean;
    requireVerificationAfterAction: boolean;
    requireRollbackPlanForMutation: boolean;
  };
}

export interface ActionCatalogEntry {
  id: GovernanceActionId;
  label: string;
  description: string;
  tier: ActionTier;
  mutation: boolean;
  environments: PolicyEnvironment[];
  requiresApproval: boolean;
  defaultAllowedRoles: string[];
  verificationHint: string;
  rollbackHint: string;
}

export interface GovernanceRiskAssessment {
  actionId: GovernanceActionId;
  tier: ActionTier;
  disposition: "allow" | "allow_with_verification" | "require_approval" | "blocked";
  reason: string;
  riskScore: number;
  confidenceScore: number;
  blastRadiusScore: number;
  reversibilityScore: number;
  moneyImpactCents: number;
  customerImpactLevel: CustomerImpactLevel;
  requiresApproval: boolean;
  verificationRequired: boolean;
}

export interface GovernanceActionProposal {
  agentId: string;
  actionId: GovernanceActionId;
  targetType?: string | null;
  targetIds?: string[];
  targetLabel?: string | null;
  reason: string;
  evidence?: Record<string, unknown>;
  confidenceScore?: number;
  blastRadiusScore?: number;
  reversibilityScore?: number;
  moneyImpactCents?: number;
  customerImpactLevel?: CustomerImpactLevel;
  environment?: PolicyEnvironment;
  rollbackPlan?: string | null;
  verificationPlan?: string | null;
  delayConsequence?: string | null;
}
