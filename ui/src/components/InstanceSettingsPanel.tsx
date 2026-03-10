import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Database, HardDrive, Server } from "lucide-react";
import { SECRET_PROVIDERS, type UpdateInstanceSettings } from "@paperclipai/shared";
import { instanceSettingsApi } from "../api/instance-settings";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";
import { formatCents } from "../lib/utils";
import { Field, HintIcon } from "./agent-config-primitives";

type InstanceSettingsPanelSection = "all" | "operations" | "agent-auth" | "secrets";

export function InstanceSettingsPanel({
  section = "all",
}: {
  section?: InstanceSettingsPanelSection;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.instance.settings,
    queryFn: () => instanceSettingsApi.get(),
  });

  const [storageProvider, setStorageProvider] = useState<"local_disk" | "s3">("local_disk");
  const [localDiskBaseDir, setLocalDiskBaseDir] = useState("");
  const [s3Bucket, setS3Bucket] = useState("");
  const [s3Region, setS3Region] = useState("");
  const [s3Endpoint, setS3Endpoint] = useState("");
  const [s3Prefix, setS3Prefix] = useState("");
  const [s3ForcePathStyle, setS3ForcePathStyle] = useState(false);
  const [s3AccessKeyId, setS3AccessKeyId] = useState("");
  const [s3SecretAccessKey, setS3SecretAccessKey] = useState("");
  const [s3SessionToken, setS3SessionToken] = useState("");

  const [backupEnabled, setBackupEnabled] = useState(true);
  const [backupIntervalMinutes, setBackupIntervalMinutes] = useState("60");
  const [backupRetentionDays, setBackupRetentionDays] = useState("30");
  const [backupDir, setBackupDir] = useState("");

  const [heartbeatSchedulerEnabled, setHeartbeatSchedulerEnabled] = useState(true);
  const [heartbeatSchedulerIntervalMs, setHeartbeatSchedulerIntervalMs] = useState("30000");
  const [agentRuntimeDir, setAgentRuntimeDir] = useState("");
  const [agentRuntimeSyncEnabled, setAgentRuntimeSyncEnabled] = useState(true);
  const [agentRuntimeSyncIntervalMs, setAgentRuntimeSyncIntervalMs] = useState("300000");

  const [secretsProvider, setSecretsProvider] = useState<(typeof SECRET_PROVIDERS)[number]>("local_encrypted");
  const [secretsStrictMode, setSecretsStrictMode] = useState(false);
  const [secretsKeyFilePath, setSecretsKeyFilePath] = useState("");

  const [claudeUseApiKey, setClaudeUseApiKey] = useState(false);
  const [claudeApiKey, setClaudeApiKey] = useState("");
  const [codexUseApiKey, setCodexUseApiKey] = useState(false);
  const [codexApiKey, setCodexApiKey] = useState("");

  useEffect(() => {
    if (!data) return;

    setStorageProvider(data.storage.configured.provider);
    setLocalDiskBaseDir(data.storage.configured.localDisk.baseDir);
    setS3Bucket(data.storage.configured.s3.bucket);
    setS3Region(data.storage.configured.s3.region);
    setS3Endpoint(data.storage.configured.s3.endpoint ?? "");
    setS3Prefix(data.storage.configured.s3.prefix);
    setS3ForcePathStyle(data.storage.configured.s3.forcePathStyle);
    setS3AccessKeyId("");
    setS3SecretAccessKey("");
    setS3SessionToken("");

    setBackupEnabled(data.database.configuredBackup.enabled);
    setBackupIntervalMinutes(String(data.database.configuredBackup.intervalMinutes));
    setBackupRetentionDays(String(data.database.configuredBackup.retentionDays));
    setBackupDir(data.database.configuredBackup.dir);

    setHeartbeatSchedulerEnabled(data.runtime.configured.heartbeatScheduler.enabled);
    setHeartbeatSchedulerIntervalMs(String(data.runtime.configured.heartbeatScheduler.intervalMs));
    setAgentRuntimeDir(data.runtime.configured.agentRuntime.dir);
    setAgentRuntimeSyncEnabled(data.runtime.configured.agentRuntime.syncEnabled);
    setAgentRuntimeSyncIntervalMs(String(data.runtime.configured.agentRuntime.syncIntervalMs));

    setSecretsProvider(data.secrets.configured.provider);
    setSecretsStrictMode(data.secrets.configured.strictMode);
    setSecretsKeyFilePath(data.secrets.configured.localEncrypted.keyFilePath);

    setClaudeUseApiKey(data.agentAuth.configured.claudeLocal.useApiKey);
    setClaudeApiKey("");
    setCodexUseApiKey(data.agentAuth.configured.codexLocal.useApiKey);
    setCodexApiKey("");
  }, [data]);

  const saveSettings = useMutation({
    mutationFn: (payload: UpdateInstanceSettings) => instanceSettingsApi.update(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.instance.settings });
    },
  });

  const storageDirty = useMemo(() => {
    if (!data) return false;
    const configured = data.storage.configured;
    return (
      storageProvider !== configured.provider ||
      localDiskBaseDir !== configured.localDisk.baseDir ||
      s3Bucket !== configured.s3.bucket ||
      s3Region !== configured.s3.region ||
      s3Endpoint !== (configured.s3.endpoint ?? "") ||
      s3Prefix !== configured.s3.prefix ||
      s3ForcePathStyle !== configured.s3.forcePathStyle ||
      s3AccessKeyId.trim().length > 0 ||
      s3SecretAccessKey.trim().length > 0 ||
      s3SessionToken.trim().length > 0
    );
  }, [
    data,
    localDiskBaseDir,
    s3AccessKeyId,
    s3Bucket,
    s3Endpoint,
    s3ForcePathStyle,
    s3Prefix,
    s3Region,
    s3SecretAccessKey,
    s3SessionToken,
    storageProvider,
  ]);

  const backupDirty = useMemo(() => {
    if (!data) return false;
    const configured = data.database.configuredBackup;
    return (
      backupEnabled !== configured.enabled ||
      backupIntervalMinutes !== String(configured.intervalMinutes) ||
      backupRetentionDays !== String(configured.retentionDays) ||
      backupDir !== configured.dir
    );
  }, [backupDir, backupEnabled, backupIntervalMinutes, backupRetentionDays, data]);

  const runtimeDirty = useMemo(() => {
    if (!data) return false;
    const configured = data.runtime.configured;
    return (
      heartbeatSchedulerEnabled !== configured.heartbeatScheduler.enabled ||
      heartbeatSchedulerIntervalMs !== String(configured.heartbeatScheduler.intervalMs) ||
      agentRuntimeDir !== configured.agentRuntime.dir ||
      agentRuntimeSyncEnabled !== configured.agentRuntime.syncEnabled ||
      agentRuntimeSyncIntervalMs !== String(configured.agentRuntime.syncIntervalMs)
    );
  }, [
    agentRuntimeDir,
    agentRuntimeSyncEnabled,
    agentRuntimeSyncIntervalMs,
    data,
    heartbeatSchedulerEnabled,
    heartbeatSchedulerIntervalMs,
  ]);

  const secretsDirty = useMemo(() => {
    if (!data) return false;
    const configured = data.secrets.configured;
    return (
      secretsProvider !== configured.provider ||
      secretsStrictMode !== configured.strictMode ||
      secretsKeyFilePath !== configured.localEncrypted.keyFilePath
    );
  }, [data, secretsKeyFilePath, secretsProvider, secretsStrictMode]);

  const agentAuthDirty = useMemo(() => {
    if (!data) return false;
    return (
      claudeUseApiKey !== data.agentAuth.configured.claudeLocal.useApiKey ||
      codexUseApiKey !== data.agentAuth.configured.codexLocal.useApiKey ||
      claudeApiKey.trim().length > 0 ||
      codexApiKey.trim().length > 0
    );
  }, [claudeApiKey, claudeUseApiKey, codexApiKey, codexUseApiKey, data]);

  const showOperations = section === "all" || section === "operations";
  const showAgentAuth = section === "all" || section === "agent-auth";
  const showSecrets = section === "all" || section === "secrets";

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Instance Overview
        </div>
        <InfoBanner
          title="What lives here"
          tone="neutral"
          description="These are global Paperclip settings for this installation: file storage, S3, database backups, scheduler behavior, and runtime file sync. They do not belong to a single company or a single agent."
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <MetricTile icon={Server} label="Companies" value={data ? `${data.metrics.activeCompanies}/${data.metrics.totalCompanies}` : isLoading ? "Loading..." : "—"} hint="Active / total" />
          <MetricTile icon={Activity} label="Agents Running" value={data ? `${data.metrics.runningAgents}/${data.metrics.totalAgents}` : isLoading ? "Loading..." : "—"} hint="Running / total" />
          <MetricTile icon={Database} label="Runs 7d" value={data ? String(data.metrics.totalRuns7d) : isLoading ? "Loading..." : "—"} hint="Heartbeat runs" />
          <MetricTile icon={HardDrive} label="Storage" value={data ? data.storage.effective.provider.replace("_", " ") : isLoading ? "Loading..." : "—"} hint="Effective provider" />
          <MetricTile icon={Database} label="Month Spend" value={data ? formatCents(data.metrics.monthSpendCents) : isLoading ? "Loading..." : "—"} hint="Across all companies" />
          <MetricTile icon={Server} label="Deployment" value={data ? data.runtime.deploymentMode : isLoading ? "Loading..." : "—"} hint={data ? data.runtime.deploymentExposure : "Mode"} />
        </div>
        {error && (
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load instance settings"}
          </p>
        )}
      </div>

      {showOperations && (
      <Section title="File Storage & S3">
        <InfoBanner
          title="What this controls"
          tone="neutral"
          description="This section controls where Paperclip stores uploaded files, attachments, and other persisted file assets. Use local disk for simple local setups, or S3/S3-compatible storage for shared or remote storage."
        />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            This is global storage for the whole app, not per company and not per agent.
          </span>
          <HintIcon text="You can keep using the host AWS/IAM auth chain, or store static S3 credentials here for this instance. Static credentials apply immediately to future storage operations." />
        </div>
        {data?.storage.envOverrides.any && (
          <EnvOverrideNotice text="Some storage values are pinned by environment variables. Saving here still updates config.json, but the environment keeps winning until those overrides are removed." />
        )}
        <Field label="Storage backend" hint="Choose where new Paperclip files are written from now on.">
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant={storageProvider === "local_disk" ? "secondary" : "ghost"} onClick={() => setStorageProvider("local_disk")} disabled={data?.storage.envOverrides.provider}>
              Local Disk
            </Button>
            <Button type="button" size="sm" variant={storageProvider === "s3" ? "secondary" : "ghost"} onClick={() => setStorageProvider("s3")} disabled={data?.storage.envOverrides.provider}>
              AWS S3 / S3-compatible
            </Button>
          </div>
        </Field>
        {storageProvider === "local_disk" ? (
          <Field label="Local storage directory" hint="Folder on disk where Paperclip will write files when Local Disk is selected.">
            <input className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm font-mono outline-none" type="text" value={localDiskBaseDir} onChange={(e) => setLocalDiskBaseDir(e.target.value)} disabled={data?.storage.envOverrides.localDiskBaseDir} />
          </Field>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Bucket" hint="Bucket where Paperclip should write files.">
              <input className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none" type="text" value={s3Bucket} onChange={(e) => setS3Bucket(e.target.value)} disabled={data?.storage.envOverrides.s3Bucket} />
            </Field>
            <Field label="Region" hint="AWS region, or the equivalent region name for your S3-compatible provider.">
              <input className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none" type="text" value={s3Region} onChange={(e) => setS3Region(e.target.value)} disabled={data?.storage.envOverrides.s3Region} />
            </Field>
            <Field label="Endpoint" hint="Optional custom endpoint for MinIO, R2, Backblaze, and other S3-compatible services.">
              <input className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none" type="text" value={s3Endpoint} onChange={(e) => setS3Endpoint(e.target.value)} placeholder="https://s3.amazonaws.com" disabled={data?.storage.envOverrides.s3Endpoint} />
            </Field>
            <Field label="Prefix" hint="Optional folder-like prefix inside the bucket, such as paperclip/prod/.">
              <input className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm font-mono outline-none" type="text" value={s3Prefix} onChange={(e) => setS3Prefix(e.target.value)} disabled={data?.storage.envOverrides.s3Prefix} />
            </Field>
            <BooleanField label="Force path-style URLs" hint="Turn this on for providers that require path-style bucket URLs instead of bucket-name subdomains." value={s3ForcePathStyle} onToggle={() => setS3ForcePathStyle((value) => !value)} disabled={data?.storage.envOverrides.s3ForcePathStyle} />
            <Field label="AWS access key id" hint="Optional static key for this Paperclip instance. Leave blank to keep the current stored value or rely on env/IAM credentials instead.">
              <input className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm font-mono outline-none" type="password" value={s3AccessKeyId} onChange={(e) => setS3AccessKeyId(e.target.value)} placeholder={data?.storage.auth.configured.accessKeyIdPreview ?? "AKIA..."} disabled={data?.storage.envOverrides.s3AccessKeyId} />
            </Field>
            <Field label="AWS secret access key" hint="Optional static secret for this Paperclip instance. Leave blank to preserve the stored secret.">
              <input className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm font-mono outline-none" type="password" value={s3SecretAccessKey} onChange={(e) => setS3SecretAccessKey(e.target.value)} placeholder={data?.storage.auth.configured.hasSecretAccessKey ? "Stored secret present" : "Not set"} disabled={data?.storage.envOverrides.s3SecretAccessKey} />
            </Field>
            <Field label="AWS session token" hint="Optional session token when you are using temporary AWS credentials.">
              <input className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm font-mono outline-none" type="password" value={s3SessionToken} onChange={(e) => setS3SessionToken(e.target.value)} placeholder={data?.storage.auth.configured.hasSessionToken ? "Stored token present" : "Optional"} disabled={data?.storage.envOverrides.s3SessionToken} />
            </Field>
          </div>
        )}
        <MutedInfo>
          <div>Effective storage backend: <span className="font-medium text-foreground">{data?.storage.effective.provider.replace("_", " ") ?? "—"}</span></div>
          <div>Effective S3 auth source: <span className="font-medium text-foreground">{data?.storage.auth.effective.source.replaceAll("_", " ") ?? "—"}</span></div>
          <div>Config file: <span className="font-mono">{data?.configPath ?? "—"}</span></div>
          <div>New uploads use the updated storage settings immediately. Existing files stay where they were already written.</div>
        </MutedInfo>
        {storageProvider === "s3" &&
          (data?.storage.auth.configured.hasAccessKeyId ||
            data?.storage.auth.configured.hasSecretAccessKey ||
            data?.storage.auth.configured.hasSessionToken) && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => saveSettings.mutate({ storageAuth: { s3: { clear: true } } })}
              disabled={saveSettings.isPending}
            >
              Clear stored AWS keys
            </Button>
            <span className="text-xs text-muted-foreground">After clearing, Paperclip falls back to env vars, IAM role, or the default AWS auth chain.</span>
          </div>
        )}
        <SaveRow
          dirty={storageDirty}
          pending={saveSettings.isPending}
          success={saveSettings.isSuccess}
          error={saveSettings.error}
          label="Save storage settings"
          onSave={() =>
            saveSettings.mutate({
              storage: {
                provider: storageProvider,
                localDisk: { baseDir: localDiskBaseDir.trim() },
                s3: {
                  bucket: s3Bucket.trim(),
                  region: s3Region.trim(),
                  endpoint: s3Endpoint.trim() || undefined,
                  prefix: s3Prefix,
                  forcePathStyle: s3ForcePathStyle,
                },
              },
              ...(storageProvider === "s3" &&
              (s3AccessKeyId.trim() || s3SecretAccessKey.trim() || s3SessionToken.trim())
                ? {
                    storageAuth: {
                      s3: {
                        ...(s3AccessKeyId.trim() ? { accessKeyId: s3AccessKeyId.trim() } : {}),
                        ...(s3SecretAccessKey.trim() ? { secretAccessKey: s3SecretAccessKey.trim() } : {}),
                        ...(s3SessionToken.trim() ? { sessionToken: s3SessionToken.trim() } : {}),
                      },
                    },
                  }
                : {}),
            })
          }
        />
      </Section>
      )}

      {showOperations && (
      <Section title="Database Backups">
        <InfoBanner
          title="What this controls"
          tone="info"
          description="This section only controls backup snapshots of the Paperclip database. It is about recovery and retention, not S3 file storage."
        />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            These settings decide how often Paperclip writes DB backups and how long they are kept.
          </span>
          <HintIcon text="These settings control Paperclip's automatic DB backup loop. They affect the whole installation." />
        </div>
        {data?.database.envOverrides.any && (
          <EnvOverrideNotice text="Some backup values are pinned by environment variables. Saving here updates config.json, but the environment keeps winning until those overrides are removed." />
        )}
        <BooleanField label="Automatic database backups" hint="Turn scheduled DB snapshot backups on or off for the whole Paperclip instance." value={backupEnabled} onToggle={() => setBackupEnabled((value) => !value)} disabled={data?.database.envOverrides.enabled} />
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Backup interval (minutes)" hint="How often Paperclip should write a new database backup.">
            <input className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm font-mono outline-none" type="number" min={1} value={backupIntervalMinutes} onChange={(e) => setBackupIntervalMinutes(e.target.value)} disabled={data?.database.envOverrides.intervalMinutes} />
          </Field>
          <Field label="Retention (days)" hint="How long old database backups are kept before automatic pruning.">
            <input className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm font-mono outline-none" type="number" min={1} value={backupRetentionDays} onChange={(e) => setBackupRetentionDays(e.target.value)} disabled={data?.database.envOverrides.retentionDays} />
          </Field>
          <Field label="Backup directory" hint="Folder on disk where Paperclip writes backup files.">
            <input className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm font-mono outline-none" type="text" value={backupDir} onChange={(e) => setBackupDir(e.target.value)} disabled={data?.database.envOverrides.dir} />
          </Field>
        </div>
        <MutedInfo>
          <div>Effective backup state: <span className="font-medium text-foreground">{data?.database.effectiveBackup.enabled ? "enabled" : "disabled"}</span></div>
          <div>Effective interval: <span className="font-medium text-foreground">{data?.database.effectiveBackup.intervalMinutes ?? "—"}m</span></div>
          <div>Effective retention: <span className="font-medium text-foreground">{data?.database.effectiveBackup.retentionDays ?? "—"}d</span></div>
        </MutedInfo>
        <SaveRow
          dirty={backupDirty}
          pending={saveSettings.isPending}
          success={saveSettings.isSuccess}
          error={saveSettings.error}
          label="Save backup settings"
          onSave={() =>
            saveSettings.mutate({
              databaseBackup: {
                enabled: backupEnabled,
                intervalMinutes: coercePositiveInt(backupIntervalMinutes, 60),
                retentionDays: coercePositiveInt(backupRetentionDays, 30),
                dir: backupDir.trim(),
              },
            })
          }
        />
      </Section>
      )}

      {showOperations && (
      <Section title="Scheduler & Runtime Files">
        <InfoBanner
          title="What this controls"
          tone="neutral"
          description="This section controls the server loop that wakes agents, plus syncing of agent runtime files. It is operational behavior for the whole instance."
        />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            Use this section for agent wake-up timing and runtime file sync, not for API keys or S3 credentials.
          </span>
          <HintIcon text="These settings affect how the instance wakes agents and syncs runtime files." />
        </div>
        {data?.runtime.envOverrides.any && (
          <EnvOverrideNotice text="Some runtime values are pinned by environment variables. Saving here updates config.json, but the environment keeps winning until those overrides are removed." />
        )}
        <div className="grid gap-3 md:grid-cols-2">
          <BooleanField label="Heartbeat scheduler" hint="Turn the server-side scheduler on or off. This loop is what wakes agents on their configured intervals." value={heartbeatSchedulerEnabled} onToggle={() => setHeartbeatSchedulerEnabled((value) => !value)} disabled={data?.runtime.envOverrides.heartbeatSchedulerEnabled} />
          <Field label="Scheduler interval (ms)" hint="How often the Paperclip scheduler checks for work to dispatch.">
            <input className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm font-mono outline-none" type="number" min={10000} step={1000} value={heartbeatSchedulerIntervalMs} onChange={(e) => setHeartbeatSchedulerIntervalMs(e.target.value)} disabled={data?.runtime.envOverrides.heartbeatSchedulerIntervalMs} />
          </Field>
          <BooleanField label="Runtime file sync" hint="Turn periodic sync of agent runtime files on or off." value={agentRuntimeSyncEnabled} onToggle={() => setAgentRuntimeSyncEnabled((value) => !value)} disabled={data?.runtime.envOverrides.agentRuntimeSyncEnabled} />
          <Field label="Runtime sync interval (ms)" hint="How often Paperclip syncs agent runtime files.">
            <input className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm font-mono outline-none" type="number" min={60000} step={1000} value={agentRuntimeSyncIntervalMs} onChange={(e) => setAgentRuntimeSyncIntervalMs(e.target.value)} disabled={data?.runtime.envOverrides.agentRuntimeSyncIntervalMs} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Agent runtime directory" hint="Base folder on disk where Paperclip keeps agent runtime homes and working state.">
              <input className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm font-mono outline-none" type="text" value={agentRuntimeDir} onChange={(e) => setAgentRuntimeDir(e.target.value)} disabled={data?.runtime.envOverrides.agentRuntimeDir} />
            </Field>
          </div>
        </div>
        <MutedInfo>
          <div>Effective scheduler: <span className="font-medium text-foreground">{formatBoolInterval(data?.runtime.heartbeatSchedulerEnabled ?? false, data?.runtime.heartbeatSchedulerIntervalMs ?? 0)}</span></div>
          <div>Effective runtime sync: <span className="font-medium text-foreground">{formatBoolInterval(data?.runtime.agentRuntimeSyncEnabled ?? false, data?.runtime.agentRuntimeSyncIntervalMs ?? 0)}</span></div>
          <div>Effective runtime dir: <span className="font-mono text-foreground">{data?.runtime.agentRuntimeDir ?? "—"}</span></div>
        </MutedInfo>
        <SaveRow
          dirty={runtimeDirty}
          pending={saveSettings.isPending}
          success={saveSettings.isSuccess}
          error={saveSettings.error}
          label="Save runtime settings"
          onSave={() =>
            saveSettings.mutate({
              runtime: {
                heartbeatScheduler: {
                  enabled: heartbeatSchedulerEnabled,
                  intervalMs: coercePositiveInt(heartbeatSchedulerIntervalMs, 30000),
                },
                agentRuntime: {
                  dir: agentRuntimeDir.trim(),
                  syncEnabled: agentRuntimeSyncEnabled,
                  syncIntervalMs: coercePositiveInt(agentRuntimeSyncIntervalMs, 300000),
                },
              },
            })
          }
        />
      </Section>
      )}

      {showAgentAuth && (
      <Section title="New Agent Auth Defaults">
        <InfoBanner
          title="What this controls"
          tone="neutral"
          description="These are global defaults for new Claude and Codex local agents only. Existing agents keep their own saved auth mode unless you edit them individually."
        />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            Set how new local Claude and Codex agents authenticate by default.
          </span>
          <HintIcon text="This only affects agents created after you save. Existing agents keep their current auth behavior and config." />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-3 rounded-md border border-border px-3 py-3">
            <div className="text-sm font-medium">Claude Code</div>
            <BooleanField
              label="Use instance API key"
              hint="When enabled, new claude_local agents will use the instance Anthropic API key. When disabled, new agents will force subscription/login auth instead."
              value={claudeUseApiKey}
              onToggle={() => setClaudeUseApiKey((value) => !value)}
            />
            <Field label="Anthropic API key" hint="Leave blank to keep the currently stored instance key.">
              <input
                className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm font-mono outline-none"
                type="password"
                value={claudeApiKey}
                onChange={(e) => setClaudeApiKey(e.target.value)}
                placeholder={data?.agentAuth.configured.claudeLocal.apiKeyPreview ?? "No stored key"}
              />
            </Field>
            {data?.agentAuth.configured.claudeLocal.hasApiKey && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => saveSettings.mutate({ agentAuth: { claudeLocal: { useApiKey: claudeUseApiKey, clearApiKey: true } } })}
                disabled={saveSettings.isPending}
              >
                Clear stored Claude key
              </Button>
            )}
          </div>

          <div className="space-y-3 rounded-md border border-border px-3 py-3">
            <div className="text-sm font-medium">Codex</div>
            <BooleanField
              label="Use instance API key"
              hint="When enabled, new codex_local agents will use the instance OpenAI API key. When disabled, new agents will force local Codex login/subscription auth instead."
              value={codexUseApiKey}
              onToggle={() => setCodexUseApiKey((value) => !value)}
            />
            <Field label="OpenAI API key" hint="Leave blank to keep the currently stored instance key.">
              <input
                className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm font-mono outline-none"
                type="password"
                value={codexApiKey}
                onChange={(e) => setCodexApiKey(e.target.value)}
                placeholder={data?.agentAuth.configured.codexLocal.apiKeyPreview ?? "No stored key"}
              />
            </Field>
            {data?.agentAuth.configured.codexLocal.hasApiKey && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => saveSettings.mutate({ agentAuth: { codexLocal: { useApiKey: codexUseApiKey, clearApiKey: true } } })}
                disabled={saveSettings.isPending}
              >
                Clear stored Codex key
              </Button>
            )}
          </div>
        </div>
        <MutedInfo>
          <div>Claude default: <span className="font-medium text-foreground">{claudeUseApiKey ? "instance API key" : "subscription / local login"}</span></div>
          <div>Codex default: <span className="font-medium text-foreground">{codexUseApiKey ? "instance API key" : "subscription / local login"}</span></div>
          <div>New agents get a mode marker in adapter config. Existing agents are not migrated.</div>
        </MutedInfo>
        <SaveRow
          dirty={agentAuthDirty}
          pending={saveSettings.isPending}
          success={saveSettings.isSuccess}
          error={saveSettings.error}
          label="Save agent auth defaults"
          onSave={() =>
            saveSettings.mutate({
              agentAuth: {
                claudeLocal: {
                  useApiKey: claudeUseApiKey,
                  ...(claudeApiKey.trim() ? { apiKey: claudeApiKey.trim() } : {}),
                },
                codexLocal: {
                  useApiKey: codexUseApiKey,
                  ...(codexApiKey.trim() ? { apiKey: codexApiKey.trim() } : {}),
                },
              },
            })
          }
        />
      </Section>
      )}

      {showSecrets && (
      <Section title="Secrets Backend">
        <InfoBanner
          title="What this controls"
          tone="neutral"
          description="This section controls how Paperclip stores and resolves secrets globally. It is separate from S3 storage and separate from per-agent auth mode."
        />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            Configure the default secret provider and strict mode for this instance.
          </span>
          <HintIcon text="Changing the secrets provider affects how new secret material is created and resolved. External providers still require host-side setup." />
        </div>
        {data?.secrets.envOverrides.any && (
          <EnvOverrideNotice text="Some secrets settings are overridden by environment variables. Saving here updates config.json, but env overrides still win." />
        )}
        <Field label="Provider" hint="Default provider used for newly created secrets.">
          <select
            className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none"
            value={secretsProvider}
            onChange={(e) => setSecretsProvider(e.target.value as (typeof SECRET_PROVIDERS)[number])}
            disabled={data?.secrets.envOverrides.provider}
          >
            {SECRET_PROVIDERS.map((provider) => (
              <option key={provider} value={provider}>
                {provider.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <BooleanField label="Strict mode" hint="Require secret references for sensitive env vars instead of inline plaintext values." value={secretsStrictMode} onToggle={() => setSecretsStrictMode((value) => !value)} disabled={data?.secrets.envOverrides.strictMode} />
        <Field label="Local encrypted key file" hint="Key file path used by the local_encrypted secrets provider.">
          <input className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm font-mono outline-none" type="text" value={secretsKeyFilePath} onChange={(e) => setSecretsKeyFilePath(e.target.value)} disabled={data?.secrets.envOverrides.localEncryptedKeyFilePath} />
        </Field>
        <MutedInfo>
          <div>Effective provider: <span className="font-medium text-foreground">{data?.secrets.effective.provider.replaceAll("_", " ") ?? "—"}</span></div>
          <div>Effective strict mode: <span className="font-medium text-foreground">{data?.secrets.effective.strictMode ? "enabled" : "disabled"}</span></div>
          <div>Effective key file: <span className="font-mono text-foreground">{data?.secrets.effective.masterKeyFilePath ?? "—"}</span></div>
        </MutedInfo>
        <SaveRow
          dirty={secretsDirty}
          pending={saveSettings.isPending}
          success={saveSettings.isSuccess}
          error={saveSettings.error}
          label="Save secrets settings"
          onSave={() =>
            saveSettings.mutate({
              secrets: {
                provider: secretsProvider,
                strictMode: secretsStrictMode,
                localEncrypted: {
                  keyFilePath: secretsKeyFilePath.trim(),
                },
              },
            })
          }
        />
      </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</div>
      <div className="space-y-3 rounded-md border border-border px-4 py-4">{children}</div>
    </div>
  );
}

function InfoBanner({
  title,
  description,
  tone = "neutral",
}: {
  title: string;
  description: string;
  tone?: "neutral" | "info";
}) {
  const className =
    tone === "info"
      ? "rounded-md border border-sky-300 bg-sky-50 px-3 py-3 text-sm text-sky-950 dark:border-sky-500/25 dark:bg-sky-950/40 dark:text-sky-100"
      : "rounded-md border border-border bg-muted/20 px-3 py-3 text-sm text-muted-foreground";
  return (
    <div className={className}>
      <div className="font-medium text-foreground">{title}</div>
      <div className="mt-1">{description}</div>
    </div>
  );
}

function EnvOverrideNotice({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/25 dark:bg-amber-950/50 dark:text-amber-100">
      {text}
    </div>
  );
}

function MutedInfo({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-1 rounded-md border border-border/70 bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
      {children}
    </div>
  );
}

function BooleanField({
  label,
  hint,
  value,
  onToggle,
  disabled,
}: {
  label: string;
  hint: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-md border border-border px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{label}</span>
          <HintIcon text={hint} />
        </div>
        <Button type="button" size="sm" variant={value ? "secondary" : "ghost"} onClick={onToggle} disabled={disabled}>
          {value ? "Enabled" : "Disabled"}
        </Button>
      </div>
    </div>
  );
}

function SaveRow({
  dirty,
  pending,
  success,
  error,
  label,
  onSave,
}: {
  dirty: boolean;
  pending: boolean;
  success: boolean;
  error: unknown;
  label: string;
  onSave: () => void;
}) {
  if (!dirty) return null;
  const errorMessage = error instanceof Error ? error.message : error ? "Failed to save" : null;
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={onSave} disabled={pending}>
        {pending ? "Saving..." : label}
      </Button>
      {success && <span className="text-xs text-muted-foreground">Saved</span>}
      {errorMessage && <span className="text-xs text-destructive">{errorMessage}</span>}
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Server;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-md border border-border px-4 py-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function formatBoolInterval(enabled: boolean, intervalMs: number): string {
  if (!enabled) return "disabled";
  const seconds = Math.round(intervalMs / 1000);
  if (seconds < 60) return `enabled · every ${seconds}s`;
  return `enabled · every ${Math.round(seconds / 60)}m`;
}

function coercePositiveInt(value: string, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.round(parsed);
}
