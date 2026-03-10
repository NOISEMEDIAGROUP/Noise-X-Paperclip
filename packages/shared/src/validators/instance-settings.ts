import { z } from "zod";
import {
  databaseBackupConfigSchema,
  runtimeConfigSchema,
  secretsConfigSchema,
  storageConfigSchema,
} from "../config-schema.js";

export const updateInstanceSettingsSchema = z.object({
  storage: storageConfigSchema.optional(),
  storageAuth: z.object({
    s3: z.object({
      accessKeyId: z.string().optional(),
      secretAccessKey: z.string().optional(),
      sessionToken: z.string().optional(),
      clear: z.boolean().optional(),
    }).optional(),
  }).optional(),
  databaseBackup: databaseBackupConfigSchema.optional(),
  secrets: secretsConfigSchema.optional(),
  runtime: runtimeConfigSchema.optional(),
  agentAuth: z.object({
    claudeLocal: z.object({
      useApiKey: z.boolean(),
      apiKey: z.string().optional(),
      clearApiKey: z.boolean().optional(),
    }).optional(),
    codexLocal: z.object({
      useApiKey: z.boolean(),
      apiKey: z.string().optional(),
      clearApiKey: z.boolean().optional(),
    }).optional(),
  }).optional(),
});

export type UpdateInstanceSettings = z.infer<typeof updateInstanceSettingsSchema>;
