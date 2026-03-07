import { z } from "zod";
import { AGENT_ROLES } from "../constants.js";

const skillNameRegex = /^[a-z0-9][a-z0-9_-]{1,63}$/;

export const skillScopeSchema = z.union([z.enum(AGENT_ROLES), z.literal("all")]);

export const createSkillSchema = z.object({
  name: z
    .string()
    .trim()
    .toLowerCase()
    .regex(skillNameRegex, "Skill name must be 2-64 chars: lowercase letters, numbers, _ or -")
    .max(64),
  label: z.string().trim().min(1).max(120),
  description: z.string().trim().max(400).optional().nullable(),
  content: z.string().min(1),
  scope: z.array(skillScopeSchema).default(["all"]),
});

export type CreateSkill = z.infer<typeof createSkillSchema>;
