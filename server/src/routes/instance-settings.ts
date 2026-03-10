import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { agents, companies, costEvents, heartbeatRuns } from "@paperclipai/db";
import { eq, gte, ne, sql } from "drizzle-orm";
import {
  type InstanceSettingsResponse,
  updateInstanceSettingsSchema,
} from "@paperclipai/shared";
import { createDefaultConfigFile, readConfigFile, writeConfigFile } from "../config-file.js";
import { loadConfig } from "../config.js";
import { validate } from "../middleware/validate.js";
import { resolvePaperclipConfigPath } from "../paths.js";
import { assertBoard } from "./authz.js";

const effectiveCostCentsExpr = sql<number>`case
  when ${costEvents.billingType} = 'api'
    and ${costEvents.costCents} = 0
    and ${costEvents.calculatedCostCents} is not null
  then ${costEvents.calculatedCostCents}
  else ${costEvents.costCents}
end`;

function currentStorageEnvOverrides() {
  const flags = {
    provider: process.env.PAPERCLIP_STORAGE_PROVIDER !== undefined,
    localDiskBaseDir: process.env.PAPERCLIP_STORAGE_LOCAL_DIR !== undefined,
    s3Bucket: process.env.PAPERCLIP_STORAGE_S3_BUCKET !== undefined,
    s3Region: process.env.PAPERCLIP_STORAGE_S3_REGION !== undefined,
    s3Endpoint: process.env.PAPERCLIP_STORAGE_S3_ENDPOINT !== undefined,
    s3Prefix: process.env.PAPERCLIP_STORAGE_S3_PREFIX !== undefined,
    s3ForcePathStyle: process.env.PAPERCLIP_STORAGE_S3_FORCE_PATH_STYLE !== undefined,
    s3AccessKeyId: process.env.AWS_ACCESS_KEY_ID !== undefined,
    s3SecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY !== undefined,
    s3SessionToken: process.env.AWS_SESSION_TOKEN !== undefined,
    any: false,
  };
  flags.any = Object.values(flags).some((value) => value === true);
  return flags;
}

function currentSecretsEnvOverrides() {
  const flags = {
    provider: process.env.PAPERCLIP_SECRETS_PROVIDER !== undefined,
    strictMode: process.env.PAPERCLIP_SECRETS_STRICT_MODE !== undefined,
    localEncryptedKeyFilePath: process.env.PAPERCLIP_SECRETS_MASTER_KEY_FILE !== undefined,
    any: false,
  };
  flags.any = Object.values(flags).some((value) => value === true);
  return flags;
}

function currentDatabaseBackupEnvOverrides() {
  const flags = {
    enabled: process.env.PAPERCLIP_DB_BACKUP_ENABLED !== undefined,
    intervalMinutes: process.env.PAPERCLIP_DB_BACKUP_INTERVAL_MINUTES !== undefined,
    retentionDays: process.env.PAPERCLIP_DB_BACKUP_RETENTION_DAYS !== undefined,
    dir: process.env.PAPERCLIP_DB_BACKUP_DIR !== undefined,
    any: false,
  };
  flags.any = Object.values(flags).some((value) => value === true);
  return flags;
}

function currentRuntimeEnvOverrides() {
  const flags = {
    heartbeatSchedulerEnabled: process.env.HEARTBEAT_SCHEDULER_ENABLED !== undefined,
    heartbeatSchedulerIntervalMs: process.env.HEARTBEAT_SCHEDULER_INTERVAL_MS !== undefined,
    agentRuntimeDir: process.env.PAPERCLIP_AGENT_RUNTIME_DIR !== undefined,
    agentRuntimeSyncEnabled: process.env.PAPERCLIP_AGENT_RUNTIME_SYNC_ENABLED !== undefined,
    agentRuntimeSyncIntervalMs: process.env.PAPERCLIP_AGENT_RUNTIME_SYNC_INTERVAL_MS !== undefined,
    any: false,
  };
  flags.any = Object.values(flags).some((value) => value === true);
  return flags;
}

function previewSecret(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 8) return `${trimmed.slice(0, 2)}...${trimmed.slice(-2)}`;
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

function buildStorageAuthStatus(input: {
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
}) {
  return {
    hasAccessKeyId: Boolean(input.accessKeyId?.trim()),
    hasSecretAccessKey: Boolean(input.secretAccessKey?.trim()),
    hasSessionToken: Boolean(input.sessionToken?.trim()),
    accessKeyIdPreview: previewSecret(input.accessKeyId),
  };
}

function buildAgentAuthProfile(input: { useApiKey: boolean; apiKey?: string }) {
  return {
    useApiKey: input.useApiKey,
    hasApiKey: Boolean(input.apiKey?.trim()),
    apiKeyPreview: previewSecret(input.apiKey),
  };
}

export function instanceSettingsRoutes(db: Db) {
  const router = Router();

  async function buildResponse(): Promise<InstanceSettingsResponse> {
    const fileConfig = readConfigFile() ?? createDefaultConfigFile();
    const runtimeConfig = loadConfig();
    const storageEnvOverrides = currentStorageEnvOverrides();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalCompanies,
      activeCompanies,
      totalAgents,
      runningAgents,
      totalRuns7d,
      monthSpendCents,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(companies).then((rows) => Number(rows[0]?.count ?? 0)),
      db.select({ count: sql<number>`count(*)` }).from(companies).where(ne(companies.status, "archived")).then((rows) => Number(rows[0]?.count ?? 0)),
      db.select({ count: sql<number>`count(*)` }).from(agents).then((rows) => Number(rows[0]?.count ?? 0)),
      db.select({ count: sql<number>`count(*)` }).from(agents).where(eq(agents.status, "running")).then((rows) => Number(rows[0]?.count ?? 0)),
      db.select({ count: sql<number>`count(*)` }).from(heartbeatRuns).where(gte(heartbeatRuns.createdAt, sevenDaysAgo)).then((rows) => Number(rows[0]?.count ?? 0)),
      db.select({ total: sql<number>`coalesce(sum(${effectiveCostCentsExpr}), 0)::int` }).from(costEvents).where(gte(costEvents.occurredAt, monthStart)).then((rows) => Number(rows[0]?.total ?? 0)),
    ]);

    return {
      configPath: resolvePaperclipConfigPath(),
      storage: {
        configured: {
          provider: fileConfig.storage.provider,
          localDisk: fileConfig.storage.localDisk,
          s3: {
            bucket: fileConfig.storage.s3.bucket,
            region: fileConfig.storage.s3.region,
            endpoint: fileConfig.storage.s3.endpoint,
            prefix: fileConfig.storage.s3.prefix,
            forcePathStyle: fileConfig.storage.s3.forcePathStyle,
          },
        },
        effective: {
          provider: runtimeConfig.storageProvider,
          localDiskBaseDir: runtimeConfig.storageLocalDiskBaseDir,
          s3Bucket: runtimeConfig.storageS3Bucket,
          s3Region: runtimeConfig.storageS3Region,
          s3Endpoint: runtimeConfig.storageS3Endpoint ?? null,
          s3Prefix: runtimeConfig.storageS3Prefix,
          s3ForcePathStyle: runtimeConfig.storageS3ForcePathStyle,
        },
        auth: {
          configured: buildStorageAuthStatus(fileConfig.storageAuth.s3),
          effective: {
            ...buildStorageAuthStatus({
              accessKeyId: runtimeConfig.storageS3AccessKeyId,
              secretAccessKey: runtimeConfig.storageS3SecretAccessKey,
              sessionToken: runtimeConfig.storageS3SessionToken,
            }),
            source:
              runtimeConfig.storageS3AccessKeyId && runtimeConfig.storageS3SecretAccessKey
                ? storageEnvOverrides.s3AccessKeyId || storageEnvOverrides.s3SecretAccessKey
                  ? "environment"
                  : "instance_config"
                : "default_chain",
          },
        },
        envOverrides: storageEnvOverrides,
      },
      secrets: {
        configured: fileConfig.secrets,
        effective: {
          provider: runtimeConfig.secretsProvider,
          strictMode: runtimeConfig.secretsStrictMode,
          masterKeyFilePath: runtimeConfig.secretsMasterKeyFilePath,
        },
        envOverrides: currentSecretsEnvOverrides(),
      },
      database: {
        configuredBackup: fileConfig.database.backup,
        effectiveBackup: {
          enabled: runtimeConfig.databaseBackupEnabled,
          intervalMinutes: runtimeConfig.databaseBackupIntervalMinutes,
          retentionDays: runtimeConfig.databaseBackupRetentionDays,
          dir: runtimeConfig.databaseBackupDir,
        },
        envOverrides: currentDatabaseBackupEnvOverrides(),
      },
      runtime: {
        configured: fileConfig.runtime,
        deploymentMode: runtimeConfig.deploymentMode,
        deploymentExposure: runtimeConfig.deploymentExposure,
        databaseMode: runtimeConfig.databaseMode,
        heartbeatSchedulerEnabled: runtimeConfig.heartbeatSchedulerEnabled,
        heartbeatSchedulerIntervalMs: runtimeConfig.heartbeatSchedulerIntervalMs,
        agentRuntimeSyncEnabled: runtimeConfig.agentRuntimeSyncEnabled,
        agentRuntimeSyncIntervalMs: runtimeConfig.agentRuntimeSyncIntervalMs,
        agentRuntimeDir: runtimeConfig.agentRuntimeDir,
        envOverrides: currentRuntimeEnvOverrides(),
      },
      agentAuth: {
        configured: {
          claudeLocal: buildAgentAuthProfile(fileConfig.agentAuth.claudeLocal),
          codexLocal: buildAgentAuthProfile(fileConfig.agentAuth.codexLocal),
        },
      },
      metrics: {
        totalCompanies,
        activeCompanies,
        totalAgents,
        runningAgents,
        totalRuns7d,
        monthSpendCents,
      },
    };
  }

  router.get("/instance/settings", async (req, res) => {
    assertBoard(req);
    res.json(await buildResponse());
  });

  router.patch("/instance/settings", validate(updateInstanceSettingsSchema), async (req, res) => {
    assertBoard(req);
    const current = readConfigFile() ?? createDefaultConfigFile();
    writeConfigFile({
      ...current,
      $meta: {
        ...current.$meta,
        updatedAt: new Date().toISOString(),
        source: "configure",
      },
      storage: req.body.storage ?? current.storage,
      storageAuth: req.body.storageAuth?.s3
        ? {
            ...current.storageAuth,
            s3: req.body.storageAuth.s3.clear
              ? {}
              : {
                  ...current.storageAuth.s3,
                  ...(req.body.storageAuth.s3.accessKeyId !== undefined
                    ? { accessKeyId: req.body.storageAuth.s3.accessKeyId.trim() }
                    : {}),
                  ...(req.body.storageAuth.s3.secretAccessKey !== undefined
                    ? { secretAccessKey: req.body.storageAuth.s3.secretAccessKey.trim() }
                    : {}),
                  ...(req.body.storageAuth.s3.sessionToken !== undefined
                    ? { sessionToken: req.body.storageAuth.s3.sessionToken.trim() }
                    : {}),
                },
          }
        : current.storageAuth,
      secrets: req.body.secrets ?? current.secrets,
      database: {
        ...current.database,
        ...(req.body.databaseBackup ? { backup: req.body.databaseBackup } : {}),
      },
      runtime: req.body.runtime ?? current.runtime,
      agentAuth: {
        ...current.agentAuth,
        ...(req.body.agentAuth?.claudeLocal
          ? {
              claudeLocal: {
                ...current.agentAuth.claudeLocal,
                useApiKey: req.body.agentAuth.claudeLocal.useApiKey,
                ...(req.body.agentAuth.claudeLocal.clearApiKey
                  ? { apiKey: undefined }
                  : req.body.agentAuth.claudeLocal.apiKey !== undefined
                    ? { apiKey: req.body.agentAuth.claudeLocal.apiKey.trim() }
                    : {}),
              },
            }
          : {}),
        ...(req.body.agentAuth?.codexLocal
          ? {
              codexLocal: {
                ...current.agentAuth.codexLocal,
                useApiKey: req.body.agentAuth.codexLocal.useApiKey,
                ...(req.body.agentAuth.codexLocal.clearApiKey
                  ? { apiKey: undefined }
                  : req.body.agentAuth.codexLocal.apiKey !== undefined
                    ? { apiKey: req.body.agentAuth.codexLocal.apiKey.trim() }
                    : {}),
              },
            }
          : {}),
      },
    });
    res.json({
      ok: true,
      settings: await buildResponse(),
    });
  });

  return router;
}
