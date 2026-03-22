import { z } from "zod";

export const createProductSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().nullable().optional(),
  status: z.enum(["active", "paused", "archived"]).optional().default("active"),
  productType: z.enum(["newsletter", "saas", "api", "mobile_app", "other"]).optional().default("newsletter"),
  primaryChannel: z.enum(["email", "web", "api", "mobile"]).optional().default("email"),
  productUrl: z.string().url().nullable().optional(),
  landingPath: z.string().trim().nullable().optional(),
  healthPath: z.string().trim().nullable().optional(),
  ownerAgentId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().nullable().optional(),
  status: z.enum(["active", "paused", "archived"]).optional(),
  productType: z.enum(["newsletter", "saas", "api", "mobile_app", "other"]).optional(),
  primaryChannel: z.enum(["email", "web", "api", "mobile"]).optional(),
  productUrl: z.string().url().nullable().optional(),
  landingPath: z.string().trim().nullable().optional(),
  healthPath: z.string().trim().nullable().optional(),
  ownerAgentId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
