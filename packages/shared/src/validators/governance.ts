import { z } from "zod";
import {
  AGENT_CLASSES,
  AGENT_MODES,
  CUSTOMER_IMPACT_LEVELS,
  GOVERNANCE_ACTION_IDS,
  POLICY_ENVIRONMENTS,
} from "../constants.js";

export const agentRuntimePolicySchema = z.object({
  mode: z.enum(AGENT_MODES).default("hybrid"),
  classes: z.array(z.enum(AGENT_CLASSES)).default([]),
  environment: z.enum(POLICY_ENVIRONMENTS).default("sandbox"),
  allowedActions: z.array(z.enum(GOVERNANCE_ACTION_IDS)).default([]),
  blockedActions: z.array(z.enum(GOVERNANCE_ACTION_IDS)).default([]),
  allowedTargets: z.array(z.string()).default([]),
  approvalRules: z.object({
    requiredFor: z.array(z.enum(GOVERNANCE_ACTION_IDS)).default([]),
    thresholds: z.object({
      spendCents: z.number().int().nonnegative().optional(),
      riskScore: z.number().int().min(0).max(100).optional(),
      blastRadius: z.number().int().min(0).max(100).optional(),
      confidenceBelow: z.number().int().min(0).max(100).optional(),
    }).default({}),
  }).default({ requiredFor: [], thresholds: {} }),
  budgets: z.object({
    monthlyCents: z.number().int().nonnegative().default(0),
    dailyCents: z.number().int().nonnegative().optional(),
    maxSingleRunCents: z.number().int().nonnegative().optional(),
    maxRuntimeSec: z.number().int().positive().optional(),
  }).default({ monthlyCents: 0 }),
  safety: z.object({
    canSelfHeal: z.boolean().default(false),
    canSelfLearn: z.boolean().default(false),
    canUseInternet: z.boolean().default(false),
    requireVerificationAfterAction: z.boolean().default(true),
    requireRollbackPlanForMutation: z.boolean().default(true),
  }).default({
    canSelfHeal: false,
    canSelfLearn: false,
    canUseInternet: false,
    requireVerificationAfterAction: true,
    requireRollbackPlanForMutation: true,
  }),
});

export const governanceActionProposalSchema = z.object({
  agentId: z.string().uuid(),
  actionId: z.enum(GOVERNANCE_ACTION_IDS),
  targetType: z.string().trim().min(1).nullable().optional(),
  targetIds: z.array(z.string().min(1)).default([]),
  targetLabel: z.string().trim().min(1).nullable().optional(),
  reason: z.string().trim().min(1),
  evidence: z.record(z.unknown()).default({}),
  confidenceScore: z.number().int().min(0).max(100).optional(),
  blastRadiusScore: z.number().int().min(0).max(100).optional(),
  reversibilityScore: z.number().int().min(0).max(100).optional(),
  moneyImpactCents: z.number().int().nonnegative().optional(),
  customerImpactLevel: z.enum(CUSTOMER_IMPACT_LEVELS).optional().default("none"),
  environment: z.enum(POLICY_ENVIRONMENTS).optional(),
  rollbackPlan: z.string().trim().min(1).nullable().optional(),
  verificationPlan: z.string().trim().min(1).nullable().optional(),
  delayConsequence: z.string().trim().min(1).nullable().optional(),
});

export type AgentRuntimePolicyInput = z.infer<typeof agentRuntimePolicySchema>;
export type GovernanceActionProposalInput = z.infer<typeof governanceActionProposalSchema>;
