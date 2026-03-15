import { z } from "zod";
import {
  ADAPTER_CONTRACT_DETERMINISM_LEVELS,
  ADAPTER_EXECUTION_POLICY_SCOPES,
  ADAPTER_PRESSURE_ROUTES,
  ADAPTER_TOOL_CONTRACT_STATUSES,
} from "../constants.js";

const jsonObjectSchema = z.record(z.unknown());

export const adapterToolContractSchema = z.object({
  adapterType: z.string().min(1),
  toolName: z.string().min(1),
  version: z.number().int().positive().default(1),
  requestSchemaJson: jsonObjectSchema.default({}),
  responseSchemaJson: jsonObjectSchema.default({}),
  timeoutMs: z.number().int().positive().nullable().optional(),
  retryPolicyJson: jsonObjectSchema.default({}),
  determinismLevel: z.enum(ADAPTER_CONTRACT_DETERMINISM_LEVELS).default("best_effort"),
  status: z.enum(ADAPTER_TOOL_CONTRACT_STATUSES).default("active"),
}).strict();

export const updateAdapterToolContractSchema = adapterToolContractSchema
  .partial()
  .extend({
    adapterType: z.string().min(1).optional(),
    toolName: z.string().min(1).optional(),
  })
  .strict();

export type AdapterToolContractInput = z.infer<typeof adapterToolContractSchema>;
export type UpdateAdapterToolContractInput = z.infer<typeof updateAdapterToolContractSchema>;

const adapterExecutionPolicyBaseSchema = z.object({
  policyScope: z.enum(ADAPTER_EXECUTION_POLICY_SCOPES).default("global"),
  roleKey: z.string().min(1).nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  maxParallelRuns: z.number().int().min(1).max(100).default(1),
  maxRetryAttempts: z.number().int().min(0).max(20).default(1),
  costPressureThreshold: z.number().min(0).max(1).default(0.9),
  errorPressureThreshold: z.number().min(0).max(1).default(0.25),
  routeOnPressure: z.enum(ADAPTER_PRESSURE_ROUTES).default("degrade"),
});

export const adapterExecutionPolicySchema = adapterExecutionPolicyBaseSchema.superRefine((value, ctx) => {
  if (value.policyScope === "role" && !value.roleKey) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["roleKey"],
      message: "roleKey is required when policyScope is role",
    });
  }
  if (value.policyScope === "project" && !value.projectId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["projectId"],
      message: "projectId is required when policyScope is project",
    });
  }
});

export const updateAdapterExecutionPolicySchema = adapterExecutionPolicyBaseSchema.partial();

export type AdapterExecutionPolicyInput = z.infer<typeof adapterExecutionPolicySchema>;
export type UpdateAdapterExecutionPolicyInput = z.infer<typeof updateAdapterExecutionPolicySchema>;