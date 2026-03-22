import { z } from "zod";

export const objectiveStatusSchema = z.enum(["proposed", "approved", "active", "achieved", "cancelled"]);
export const objectiveTypeSchema = z.enum(["quarterly", "annual", "initiative"]);
export const keyResultStatusSchema = z.enum(["planned", "active", "achieved", "cancelled"]);

export const createKeyResultSchema = z.object({
  title: z.string().trim().min(1),
  status: keyResultStatusSchema.optional().default("planned"),
  targetValue: z.number(),
  currentValue: z.number().optional().default(0),
});

export const updateKeyResultSchema = createKeyResultSchema.partial();

export const createObjectiveSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  objectiveType: objectiveTypeSchema.optional().default("quarterly"),
  status: objectiveStatusSchema.optional().default("proposed"),
  targetValue: z.number().nullable().optional(),
  currentValue: z.number().default(0),
  deadline: z.string().nullable().optional(),
  keyResults: z.array(createKeyResultSchema).optional().default([]),
});

export const updateObjectiveSchema = createObjectiveSchema.partial();
