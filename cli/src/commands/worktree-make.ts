import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import * as p from "@clack/prompts";
import pc from "picocolors";
import type { PaperclipConfig } from "../config/schema.js";
import { readConfig, writeConfig } from "../config/store.js";
import {
  describeLocalInstancePaths,
  resolveDefaultEmbeddedPostgresDir,
  resolveDefaultLogsDir,
  resolveDefaultSecretsKeyFilePath,
  resolveDefaultStorageDir,
  resolvePaperclipInstanceId,
} from "../config/home.js";

function defaultWorktreeConfig(instanceId: string): PaperclipConfig {
  const paths = describeLocalInstancePaths(instanceId);
  return {
    $meta: {
      version: 1,
      updatedAt: new Date().toISOString(),
      source: "configure",
    },
    database: {
      mode: "embedded-postgres",
      embeddedPostgresDataDir: paths.embeddedPostgresDataDir,
      embeddedPostgresPort: 54329,
    },
    logging: {
      mode: "file",
      logDir: paths.logDir,
    },
    server: {
      deploymentMode: "local_trusted",
      exposure: "private",
      host: "127.0.0.1",
      port: 3100,
      allowedHostnames: [],
      serveUi: true,
      heartbeatSchedulerEnabled: true,
      heartbeatSchedulerIntervalMs: 30000,
    },
    auth: {
      baseUrlMode: "auto",
      disableSignUp: false,
    },
    uploads: {
      allowedAttachmentTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"],
    },
    storage: {
      provider: "local_disk",
      localDisk: { baseDir: paths.storageDir },
      s3: { bucket: "paperclip", region: "us-east-1", prefix: "", forcePathStyle: false },
    },
    secrets: {
      provider: "local_encrypted",
      strictMode: false,
      localEncrypted: { keyFilePath: paths.secretsKeyFilePath },
    },
  };
}

type WorktreeMakeOptions = {
  config?: string;
  dataDir?: string;
  path?: string;
  branch?: string;
  startPoint?: string;
};

function git(args: string[], cwd: string): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

export async function worktreeMake(name: string, opts: WorktreeMakeOptions): Promise<void> {
  const instanceId = resolvePaperclipInstanceId(`worktree-${name}`);
  const sourceConfig = readConfig(opts.config) ?? defaultWorktreeConfig(instanceId);

  const repoRoot = git(["rev-parse", "--show-toplevel"], process.cwd());
  const branch = opts.branch?.trim() || `paperclip/${name}`;
  const startPoint = opts.startPoint?.trim() || "HEAD";
  const targetPath = path.resolve(opts.path || path.join(path.dirname(repoRoot), `${path.basename(repoRoot)}-${name}`));

  p.intro(pc.bgCyan(pc.black(" paperclipai worktree make ")));
  p.log.message(pc.dim(`Repo: ${repoRoot}`));
  p.log.message(pc.dim(`Target: ${targetPath}`));
  p.log.message(pc.dim(`Branch: ${branch} (from ${startPoint})`));

  if (!fs.existsSync(targetPath)) {
    git(["worktree", "add", "-b", branch, targetPath, startPoint], repoRoot);
  }

  const targetConfigPath = path.join(targetPath, ".paperclip", "config.json");
  const targetEnvPath = path.join(targetPath, ".paperclip", ".env");
  fs.mkdirSync(path.dirname(targetConfigPath), { recursive: true });

  const nextConfig: PaperclipConfig = {
    ...sourceConfig,
    $meta: {
      ...sourceConfig.$meta,
      updatedAt: new Date().toISOString(),
      source: "configure",
    },
    database: {
      ...sourceConfig.database,
      embeddedPostgresDataDir: resolveDefaultEmbeddedPostgresDir(instanceId),
    },
    logging: {
      ...sourceConfig.logging,
      logDir: resolveDefaultLogsDir(instanceId),
    },
    secrets: {
      ...sourceConfig.secrets,
      localEncrypted: {
        ...sourceConfig.secrets.localEncrypted,
        keyFilePath: resolveDefaultSecretsKeyFilePath(instanceId),
      },
    },
    storage: {
      ...sourceConfig.storage,
      localDisk: {
        ...sourceConfig.storage.localDisk,
        baseDir: resolveDefaultStorageDir(instanceId),
      },
    },
  };

  writeConfig(nextConfig, targetConfigPath);
  fs.writeFileSync(
    targetEnvPath,
    `PAPERCLIP_INSTANCE_ID=${instanceId}\nPAPERCLIP_CONFIG=${targetConfigPath}\n`,
    { mode: 0o600 },
  );

  const paths = describeLocalInstancePaths(instanceId);
  p.note(
    [
      `Worktree created at ${targetPath}`,
      `Config: ${targetConfigPath}`,
      `Instance: ${instanceId}`,
      `DB: ${paths.embeddedPostgresDataDir}`,
      `Logs: ${paths.logDir}`,
      `Storage: ${paths.storageDir}`,
      `Secrets: ${paths.secretsKeyFilePath}`,
      "",
      `Next:`,
      `  cd ${targetPath}`,
      `  pnpm install`,
      `  pnpm dev`,
    ].join("\n"),
    "Worktree ready",
  );
}
