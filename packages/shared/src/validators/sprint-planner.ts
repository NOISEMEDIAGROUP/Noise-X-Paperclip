import { z } from "zod";

export const sprintPlannerTaskPrioritySchema = z.enum(["critical", "high", "medium", "low"]);

export const createSprintPlannerTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: sprintPlannerTaskPrioritySchema.optional().default("medium"),
  estimatedPoints: z.number().int().positive().optional(),
  sprintId: z.string().optional(),
  epicId: z.string().optional(),
});
export type CreateSprintPlannerTask = z.infer<typeof createSprintPlannerTaskSchema>;

export const updateSprintPlannerTaskStatusSchema = z.object({
  status: z.string().min(1),
  note: z.string().optional(),
});
export type UpdateSprintPlannerTaskStatus = z.infer<typeof updateSprintPlannerTaskStatusSchema>;

export const createSprintPlannerTicketSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  priority: sprintPlannerTaskPrioritySchema.optional().default("medium"),
  category: z.string().optional().default("general"),
  assigneeId: z.string().optional(),
});
export type CreateSprintPlannerTicket = z.infer<typeof createSprintPlannerTicketSchema>;

export const addSprintPlannerCommentSchema = z.object({
  content: z.string().min(1),
  isInternal: z.boolean().optional().default(false),
});
export type AddSprintPlannerComment = z.infer<typeof addSprintPlannerCommentSchema>;

export const createSprintPlannerKnowledgeItemSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  category: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
});
export type CreateSprintPlannerKnowledgeItem = z.infer<typeof createSprintPlannerKnowledgeItemSchema>;

export const sprintPlannerConfigSchema = z.object({
  apiUrl: z.string().url(),
  token: z.string().min(1),
  aiTeamId: z.string().min(1),
});
export type SprintPlannerConfigInput = z.infer<typeof sprintPlannerConfigSchema>;
