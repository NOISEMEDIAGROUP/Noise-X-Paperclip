import type {
  DatabaseBackupConfig,
  RuntimeConfig,
  SecretsConfig,
  StorageConfig,
} from "../config-schema.js";
import type { DeploymentExposure, DeploymentMode, SecretProvider, StorageProvider } from "../constants.js";

export interface InstanceSettingsStorageEnvOverrides {
  provider: boolean;
  localDiskBaseDir: boolean;
  s3Bucket: boolean;
  s3Region: boolean;
  s3Endpoint: boolean;
  s3Prefix: boolean;
  s3ForcePathStyle: boolean;
  s3AccessKeyId: boolean;
  s3SecretAccessKey: boolean;
  s3SessionToken: boolean;
  any: boolean;
}

export interface InstanceSettingsSecretsEnvOverrides {
  provider: boolean;
  strictMode: boolean;
  localEncryptedKeyFilePath: boolean;
  any: boolean;
}

export interface InstanceSettingsDatabaseBackupEnvOverrides {
  enabled: boolean;
  intervalMinutes: boolean;
  retentionDays: boolean;
  dir: boolean;
  any: boolean;
}

export interface InstanceSettingsRuntimeEnvOverrides {
  heartbeatSchedulerEnabled: boolean;
  heartbeatSchedulerIntervalMs: boolean;
  agentRuntimeDir: boolean;
  agentRuntimeSyncEnabled: boolean;
  agentRuntimeSyncIntervalMs: boolean;
  any: boolean;
}

export interface InstanceSettingsMetrics {
  totalCompanies: number;
  activeCompanies: number;
  totalAgents: number;
  runningAgents: number;
  totalRuns7d: number;
  monthSpendCents: number;
}

export interface InstanceSettingsRedactedStorageConfig {
  provider: StorageConfig["provider"];
  localDisk: StorageConfig["localDisk"];
  s3: Omit<StorageConfig["s3"], never>;
}

export interface InstanceSettingsStorageAuthStatus {
  hasAccessKeyId: boolean;
  hasSecretAccessKey: boolean;
  hasSessionToken: boolean;
  accessKeyIdPreview: string | null;
}

export interface InstanceSettingsAgentAuthProfile {
  useApiKey: boolean;
  hasApiKey: boolean;
  apiKeyPreview: string | null;
}

export interface InstanceSettingsResponse {
  configPath: string;
  storage: {
    configured: InstanceSettingsRedactedStorageConfig;
    effective: {
      provider: StorageProvider;
      localDiskBaseDir: string;
      s3Bucket: string;
      s3Region: string;
      s3Endpoint: string | null;
      s3Prefix: string;
      s3ForcePathStyle: boolean;
    };
    auth: {
      configured: InstanceSettingsStorageAuthStatus;
      effective: InstanceSettingsStorageAuthStatus & {
        source: "instance_config" | "environment" | "default_chain";
      };
    };
    envOverrides: InstanceSettingsStorageEnvOverrides;
  };
  secrets: {
    configured: SecretsConfig;
    effective: {
      provider: SecretProvider;
      strictMode: boolean;
      masterKeyFilePath: string;
    };
    envOverrides: InstanceSettingsSecretsEnvOverrides;
  };
  database: {
    configuredBackup: DatabaseBackupConfig;
    effectiveBackup: DatabaseBackupConfig;
    envOverrides: InstanceSettingsDatabaseBackupEnvOverrides;
  };
  runtime: {
    configured: RuntimeConfig;
    deploymentMode: DeploymentMode;
    deploymentExposure: DeploymentExposure;
    databaseMode: "embedded-postgres" | "postgres";
    heartbeatSchedulerEnabled: boolean;
    heartbeatSchedulerIntervalMs: number;
    agentRuntimeSyncEnabled: boolean;
    agentRuntimeSyncIntervalMs: number;
    agentRuntimeDir: string;
    envOverrides: InstanceSettingsRuntimeEnvOverrides;
  };
  agentAuth: {
    configured: {
      claudeLocal: InstanceSettingsAgentAuthProfile;
      codexLocal: InstanceSettingsAgentAuthProfile;
    };
  };
  metrics: InstanceSettingsMetrics;
}

export interface UpdateInstanceStorageAuthSettings {
  s3?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    clear?: boolean;
  };
}

export interface UpdateInstanceAgentAuthSettings {
  claudeLocal?: {
    useApiKey: boolean;
    apiKey?: string;
    clearApiKey?: boolean;
  };
  codexLocal?: {
    useApiKey: boolean;
    apiKey?: string;
    clearApiKey?: boolean;
  };
}
