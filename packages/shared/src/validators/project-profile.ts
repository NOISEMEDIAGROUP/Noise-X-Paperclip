import { z } from "zod";

const techStackSchema = z.object({
  framework: z.string(),
  runtime: z.string(),
  css: z.string(),
  stateManagement: z.string().optional(),
  orm: z.string().optional(),
  additionalLibs: z.array(z.string()).optional(),
});

const moduleStatsSchema = z.object({
  pages: z.number().int().optional(),
  apiEndpoints: z.number().int().optional(),
  hooks: z.number().int().optional(),
  queries: z.number().int().optional(),
  parsers: z.number().int().optional(),
  schemas: z.number().int().optional(),
});

const iosCompanionSchema = z.object({
  repoName: z.string(),
  framework: z.string(),
  minVersion: z.string().optional(),
});

const profileFields = {
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  customerName: z.string().optional().nullable(),
  customerContact: z.string().optional().nullable(),
  businessModel: z.string().optional().nullable(),
  productionUrl: z.string().optional().nullable(),
  stagingUrl: z.string().optional().nullable(),
  hostPort: z.number().int().positive().optional().nullable(),
  vpsDirectory: z.string().optional().nullable(),
  dbSchema: z.string().optional().nullable(),
  techStack: techStackSchema.optional().nullable(),
  moduleStats: moduleStatsSchema.optional().nullable(),
  iosCompanion: iosCompanionSchema.optional().nullable(),
  features: z.record(z.unknown()).optional().nullable(),
  phase: z.enum(["production", "beta", "development", "archived"]).optional().default("development"),
  launchedAt: z.string().optional().nullable(),
};

export const upsertProjectProfileSchema = z.object(profileFields);
export type UpsertProjectProfile = z.infer<typeof upsertProjectProfileSchema>;

export const updateProjectProfileSchema = z.object(profileFields).partial();
export type UpdateProjectProfile = z.infer<typeof updateProjectProfileSchema>;

export const createProjectIntegrationSchema = z.object({
  integrationType: z.string().min(1),
  name: z.string().min(1),
  config: z.record(z.unknown()).optional().nullable(),
  status: z.string().optional().default("active"),
});
export type CreateProjectIntegration = z.infer<typeof createProjectIntegrationSchema>;

export const createProjectScraperSchema = z.object({
  name: z.string().min(1),
  port: z.number().int().positive().optional().nullable(),
  vpsDirectory: z.string().optional().nullable(),
  status: z.string().optional().default("active"),
  healthCheckUrl: z.string().url().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});
export type CreateProjectScraper = z.infer<typeof createProjectScraperSchema>;
