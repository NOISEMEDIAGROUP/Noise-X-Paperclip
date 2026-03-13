import { z } from "zod";

const workflowStepSchema = z.object({
  stepIndex: z.number().int().min(0),
  name: z.string().min(1),
  agentId: z.string().uuid().nullable().optional(),
  conditions: z.record(z.unknown()).optional(),
  requiresApproval: z.boolean().optional(),
});

export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  steps: z.array(workflowStepSchema).min(1),
});
export type CreateWorkflow = z.infer<typeof createWorkflowSchema>;

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  steps: z.array(workflowStepSchema).min(1).optional(),
  enabled: z.enum(["true", "false"]).optional(),
});
export type UpdateWorkflow = z.infer<typeof updateWorkflowSchema>;

export const startWorkflowRunSchema = z.object({
  workflowId: z.string().uuid(),
  issueId: z.string().uuid().optional(),
  initialState: z.record(z.unknown()).optional(),
});
export type StartWorkflowRun = z.infer<typeof startWorkflowRunSchema>;

export const advanceWorkflowRunSchema = z.object({
  resultState: z.record(z.unknown()).optional(),
  outcome: z.string().optional(),
});
export type AdvanceWorkflowRun = z.infer<typeof advanceWorkflowRunSchema>;
