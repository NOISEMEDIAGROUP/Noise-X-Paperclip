import { readConfigFile } from "./config-file.js";
import { existsSync } from "node:fs";
import { config as loadDotenv } from "dotenv";
import { resolvePaperclipEnvPath } from "./paths.js";
import {
  AUTH_BASE_URL_MODES,
  DEPLOYMENT_EXPOSURES,
  DEPLOYMENT_MODES,
  SECRET_PROVIDERS,
  STORAGE_PROVIDERS,
  type AuthBaseUrlMode,
  type DeploymentExposure,
  type DeploymentMode,
  type SecretProvider,
  type StorageProvider,
} from "@paperclipai/shared";
import {
  resolveDefaultAgentRuntimeDir,
  resolveDefaultBackupDir,
  resolveDefaultEmbeddedPostgresDir,
  resolveDefaultSecretsKeyFilePath,
  resolveDefaultStorageDir,
  resolveHomeAwarePath,
} from "./home-paths.js";
import { normalizeClaudeOauthToken } from "./services/claude-oauth-token.js";

const PAPERCLIP_ENV_FILE_PATH = resolvePaperclipEnvPath();
if (existsSync(PAPERCLIP_ENV_FILE_PATH)) {
  loadDotenv({ path: PAPERCLIP_ENV_FILE_PATH, override: false, quiet: true });
}

type DatabaseMode = "embedded-postgres" | "postgres";

export interface Config {
  deploymentMode: DeploymentMode;
  deploymentExposure: DeploymentExposure;
  host: string;
  port: number;
  allowedHostnames: string[];
  authBaseUrlMode: AuthBaseUrlMode;
  authPublicBaseUrl: string | undefined;
  authDisableSignUp: boolean;
  databaseMode: DatabaseMode;
  databaseUrl: string | undefined;
  embeddedPostgresDataDir: string;
  embeddedPostgresPort: number;
  databaseBackupEnabled: boolean;
  databaseBackupIntervalMinutes: number;
  databaseBackupRetentionDays: number;
  databaseBackupDir: string;
  serveUi: boolean;
  uiDevMiddleware: boolean;
  secretsProvider: SecretProvider;
  secretsStrictMode: boolean;
  secretsMasterKeyFilePath: string;
  storageProvider: StorageProvider;
  storageLocalDiskBaseDir: string;
  storageS3Bucket: string;
  storageS3Region: string;
  storageS3Endpoint: string | undefined;
  storageS3Prefix: string;
  storageS3ForcePathStyle: boolean;
  storageS3AccessKeyId: string | undefined;
  storageS3SecretAccessKey: string | undefined;
  storageS3SessionToken: string | undefined;
  heartbeatSchedulerEnabled: boolean;
  heartbeatSchedulerIntervalMs: number;
  companyDeletionEnabled: boolean;
  agentRuntimeDir: string;
  agentRuntimeSyncEnabled: boolean;
  agentRuntimeSyncIntervalMs: number;
  claudeInstanceUseApiKey: boolean;
  claudeInstanceApiKey: string | undefined;
  claudeInstanceOauthToken: string | undefined;
  codexInstanceUseApiKey: boolean;
  codexInstanceApiKey: string | undefined;
}

export function loadConfig(): Config {
  const fileConfig = readConfigFile();
  const fileDatabaseMode =
    (fileConfig?.database.mode === "postgres" ? "postgres" : "embedded-postgres") as DatabaseMode;

  const fileDbUrl =
    fileDatabaseMode === "postgres"
      ? fileConfig?.database.connectionString
      : undefined;
  const fileDatabaseBackup = fileConfig?.database.backup;
  const fileSecrets = fileConfig?.secrets;
  const fileStorage = fileConfig?.storage;
  const fileStorageAuth = fileConfig?.storageAuth;
  const fileRuntime = fileConfig?.runtime;
  const fileAgentAuth = fileConfig?.agentAuth;
  const strictModeFromEnv = process.env.PAPERCLIP_SECRETS_STRICT_MODE;
  const secretsStrictMode =
    strictModeFromEnv !== undefined
      ? strictModeFromEnv === "true"
      : (fileSecrets?.strictMode ?? false);

  const providerFromEnvRaw = process.env.PAPERCLIP_SECRETS_PROVIDER;
  const providerFromEnv =
    providerFromEnvRaw && SECRET_PROVIDERS.includes(providerFromEnvRaw as SecretProvider)
      ? (providerFromEnvRaw as SecretProvider)
      : null;
  const providerFromFile = fileSecrets?.provider;
  const secretsProvider: SecretProvider = providerFromEnv ?? providerFromFile ?? "local_encrypted";

  const storageProviderFromEnvRaw = process.env.PAPERCLIP_STORAGE_PROVIDER;
  const storageProviderFromEnv =
    storageProviderFromEnvRaw && STORAGE_PROVIDERS.includes(storageProviderFromEnvRaw as StorageProvider)
      ? (storageProviderFromEnvRaw as StorageProvider)
      : null;
  const storageProvider: StorageProvider = storageProviderFromEnv ?? fileStorage?.provider ?? "local_disk";
  const storageLocalDiskBaseDir = resolveHomeAwarePath(
    process.env.PAPERCLIP_STORAGE_LOCAL_DIR ??
      fileStorage?.localDisk?.baseDir ??
      resolveDefaultStorageDir(),
  );
  const storageS3Bucket = process.env.PAPERCLIP_STORAGE_S3_BUCKET ?? fileStorage?.s3?.bucket ?? "paperclip";
  const storageS3Region = process.env.PAPERCLIP_STORAGE_S3_REGION ?? fileStorage?.s3?.region ?? "us-east-1";
  const storageS3Endpoint = process.env.PAPERCLIP_STORAGE_S3_ENDPOINT ?? fileStorage?.s3?.endpoint ?? undefined;
  const storageS3Prefix = process.env.PAPERCLIP_STORAGE_S3_PREFIX ?? fileStorage?.s3?.prefix ?? "";
  const storageS3ForcePathStyle =
    process.env.PAPERCLIP_STORAGE_S3_FORCE_PATH_STYLE !== undefined
      ? process.env.PAPERCLIP_STORAGE_S3_FORCE_PATH_STYLE === "true"
      : (fileStorage?.s3?.forcePathStyle ?? false);
  const storageS3AccessKeyId =
    process.env.AWS_ACCESS_KEY_ID?.trim() ||
    fileStorageAuth?.s3?.accessKeyId?.trim() ||
    undefined;
  const storageS3SecretAccessKey =
    process.env.AWS_SECRET_ACCESS_KEY?.trim() ||
    fileStorageAuth?.s3?.secretAccessKey?.trim() ||
    undefined;
  const storageS3SessionToken =
    process.env.AWS_SESSION_TOKEN?.trim() ||
    fileStorageAuth?.s3?.sessionToken?.trim() ||
    undefined;
  const claudeInstanceUseApiKey = fileAgentAuth?.claudeLocal?.useApiKey ?? false;
  const claudeInstanceApiKey = fileAgentAuth?.claudeLocal?.apiKey?.trim() || undefined;
  const claudeInstanceOauthToken = normalizeClaudeOauthToken(fileAgentAuth?.claudeLocal?.oauthToken);
  const codexInstanceUseApiKey = fileAgentAuth?.codexLocal?.useApiKey ?? false;
  const codexInstanceApiKey = fileAgentAuth?.codexLocal?.apiKey?.trim() || undefined;

  const deploymentModeFromEnvRaw = process.env.PAPERCLIP_DEPLOYMENT_MODE;
  const deploymentModeFromEnv =
    deploymentModeFromEnvRaw && DEPLOYMENT_MODES.includes(deploymentModeFromEnvRaw as DeploymentMode)
      ? (deploymentModeFromEnvRaw as DeploymentMode)
      : null;
  const deploymentMode: DeploymentMode = deploymentModeFromEnv ?? fileConfig?.server.deploymentMode ?? "local_trusted";
  const deploymentExposureFromEnvRaw = process.env.PAPERCLIP_DEPLOYMENT_EXPOSURE;
  const deploymentExposureFromEnv =
    deploymentExposureFromEnvRaw &&
    DEPLOYMENT_EXPOSURES.includes(deploymentExposureFromEnvRaw as DeploymentExposure)
      ? (deploymentExposureFromEnvRaw as DeploymentExposure)
      : null;
  const deploymentExposure: DeploymentExposure =
    deploymentMode === "local_trusted"
      ? "private"
      : (deploymentExposureFromEnv ?? fileConfig?.server.exposure ?? "private");
  const authBaseUrlModeFromEnvRaw = process.env.PAPERCLIP_AUTH_BASE_URL_MODE;
  const authBaseUrlModeFromEnv =
    authBaseUrlModeFromEnvRaw &&
    AUTH_BASE_URL_MODES.includes(authBaseUrlModeFromEnvRaw as AuthBaseUrlMode)
      ? (authBaseUrlModeFromEnvRaw as AuthBaseUrlMode)
      : null;
  const publicUrlFromEnv = process.env.PAPERCLIP_PUBLIC_URL;
  const authPublicBaseUrlRaw =
    process.env.PAPERCLIP_AUTH_PUBLIC_BASE_URL ??
    process.env.BETTER_AUTH_URL ??
    process.env.BETTER_AUTH_BASE_URL ??
    publicUrlFromEnv ??
    fileConfig?.auth?.publicBaseUrl;
  const authPublicBaseUrl = authPublicBaseUrlRaw?.trim() || undefined;
  const authBaseUrlMode: AuthBaseUrlMode =
    authBaseUrlModeFromEnv ??
    fileConfig?.auth?.baseUrlMode ??
    (authPublicBaseUrl ? "explicit" : "auto");
  const disableSignUpFromEnv = process.env.PAPERCLIP_AUTH_DISABLE_SIGN_UP;
  const authDisableSignUp: boolean =
    disableSignUpFromEnv !== undefined
      ? disableSignUpFromEnv === "true"
      : (fileConfig?.auth?.disableSignUp ?? false);
  const allowedHostnamesFromEnvRaw = process.env.PAPERCLIP_ALLOWED_HOSTNAMES;
  const allowedHostnamesFromEnv = allowedHostnamesFromEnvRaw
    ? allowedHostnamesFromEnvRaw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0)
    : null;
  const publicUrlHostname = authPublicBaseUrl
    ? (() => {
      try {
        return new URL(authPublicBaseUrl).hostname.trim().toLowerCase();
      } catch {
        return null;
      }
    })()
    : null;
  const allowedHostnames = Array.from(
    new Set(
      [
        ...(allowedHostnamesFromEnv ?? fileConfig?.server.allowedHostnames ?? []),
        ...(publicUrlHostname ? [publicUrlHostname] : []),
      ]
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
  const companyDeletionEnvRaw = process.env.PAPERCLIP_ENABLE_COMPANY_DELETION;
  const companyDeletionEnabled =
    companyDeletionEnvRaw !== undefined
      ? companyDeletionEnvRaw === "true"
      : deploymentMode === "local_trusted";
  const databaseBackupEnabled =
    process.env.PAPERCLIP_DB_BACKUP_ENABLED !== undefined
      ? process.env.PAPERCLIP_DB_BACKUP_ENABLED === "true"
      : (fileDatabaseBackup?.enabled ?? true);
  const databaseBackupIntervalMinutes = Math.max(
    1,
    Number(process.env.PAPERCLIP_DB_BACKUP_INTERVAL_MINUTES) ||
      fileDatabaseBackup?.intervalMinutes ||
      60,
  );
  const databaseBackupRetentionDays = Math.max(
    1,
    Number(process.env.PAPERCLIP_DB_BACKUP_RETENTION_DAYS) ||
      fileDatabaseBackup?.retentionDays ||
      30,
  );
  const databaseBackupDir = resolveHomeAwarePath(
    process.env.PAPERCLIP_DB_BACKUP_DIR ??
      fileDatabaseBackup?.dir ??
      resolveDefaultBackupDir(),
  );

  return {
    deploymentMode,
    deploymentExposure,
    host: process.env.HOST ?? fileConfig?.server.host ?? "127.0.0.1",
    port: Number(process.env.PORT) || fileConfig?.server.port || 3100,
    allowedHostnames,
    authBaseUrlMode,
    authPublicBaseUrl,
    authDisableSignUp,
    databaseMode: fileDatabaseMode,
    databaseUrl: process.env.DATABASE_URL ?? fileDbUrl,
    embeddedPostgresDataDir: resolveHomeAwarePath(
      fileConfig?.database.embeddedPostgresDataDir ?? resolveDefaultEmbeddedPostgresDir(),
    ),
    embeddedPostgresPort: fileConfig?.database.embeddedPostgresPort ?? 54329,
    databaseBackupEnabled,
    databaseBackupIntervalMinutes,
    databaseBackupRetentionDays,
    databaseBackupDir,
    serveUi:
      process.env.SERVE_UI !== undefined
        ? process.env.SERVE_UI === "true"
        : fileConfig?.server.serveUi ?? true,
    uiDevMiddleware: process.env.PAPERCLIP_UI_DEV_MIDDLEWARE === "true",
    secretsProvider,
    secretsStrictMode,
    secretsMasterKeyFilePath:
      resolveHomeAwarePath(
        process.env.PAPERCLIP_SECRETS_MASTER_KEY_FILE ??
          fileSecrets?.localEncrypted.keyFilePath ??
          resolveDefaultSecretsKeyFilePath(),
      ),
    storageProvider,
    storageLocalDiskBaseDir,
    storageS3Bucket,
    storageS3Region,
    storageS3Endpoint,
    storageS3Prefix,
    storageS3ForcePathStyle,
    storageS3AccessKeyId,
    storageS3SecretAccessKey,
    storageS3SessionToken,
    heartbeatSchedulerEnabled:
      process.env.HEARTBEAT_SCHEDULER_ENABLED !== undefined
        ? process.env.HEARTBEAT_SCHEDULER_ENABLED !== "false"
        : (fileRuntime?.heartbeatScheduler.enabled ?? true),
    heartbeatSchedulerIntervalMs: Math.max(
      10000,
      Number(process.env.HEARTBEAT_SCHEDULER_INTERVAL_MS) ||
        fileRuntime?.heartbeatScheduler.intervalMs ||
        30000,
    ),
    companyDeletionEnabled,
    agentRuntimeDir: resolveHomeAwarePath(
      process.env.PAPERCLIP_AGENT_RUNTIME_DIR ??
        fileRuntime?.agentRuntime.dir ??
        resolveDefaultAgentRuntimeDir(),
    ),
    agentRuntimeSyncEnabled:
      process.env.PAPERCLIP_AGENT_RUNTIME_SYNC_ENABLED !== undefined
        ? process.env.PAPERCLIP_AGENT_RUNTIME_SYNC_ENABLED !== "false"
        : (fileRuntime?.agentRuntime.syncEnabled ?? true),
    agentRuntimeSyncIntervalMs: Math.max(
      60000,
      Number(process.env.PAPERCLIP_AGENT_RUNTIME_SYNC_INTERVAL_MS) ||
        fileRuntime?.agentRuntime.syncIntervalMs ||
        5 * 60 * 1000,
    ),
    claudeInstanceUseApiKey,
    claudeInstanceApiKey,
    claudeInstanceOauthToken,
    codexInstanceUseApiKey,
    codexInstanceApiKey,
  };
}
