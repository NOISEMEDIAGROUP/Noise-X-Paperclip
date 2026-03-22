// @ts-nocheck
import { Router } from "express";
import { paperclipConfigSchema } from "@paperclipai/shared";
import { readConfigFile, writeConfigFile } from "../config-file.js";
import { loadConfig } from "../config.js";
import { assertBoard } from "./authz.js";
function instanceSettingsRoutes(_db) {
  const router = Router();
  function currentConfigAsFile() {
    const config = loadConfig();
    return paperclipConfigSchema.parse({
      $meta: {
        version: 1,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        source: "configure"
      },
      database: {
        mode: config.databaseMode,
        connectionString: config.databaseUrl,
        embeddedPostgresDataDir: config.embeddedPostgresDataDir,
        embeddedPostgresPort: config.embeddedPostgresPort
      },
      logging: {
        mode: "file",
        logDir: config.storageLocalDiskBaseDir
      },
      server: {
        deploymentMode: config.deploymentMode,
        exposure: config.deploymentExposure,
        host: config.host,
        port: config.port,
        allowedHostnames: config.allowedHostnames,
        serveUi: config.serveUi,
        heartbeatSchedulerEnabled: config.heartbeatSchedulerEnabled,
        heartbeatSchedulerIntervalMs: config.heartbeatSchedulerIntervalMs
      },
      auth: {
        baseUrlMode: config.authBaseUrlMode,
        publicBaseUrl: config.authPublicBaseUrl,
        disableSignUp: config.authDisableSignUp
      },
      uploads: {
        allowedAttachmentTypes: config.allowedAttachmentTypes
      },
      storage: {
        provider: config.storageProvider,
        localDisk: {
          baseDir: config.storageLocalDiskBaseDir
        },
        s3: {
          bucket: config.storageS3Bucket,
          region: config.storageS3Region,
          endpoint: config.storageS3Endpoint,
          prefix: config.storageS3Prefix,
          forcePathStyle: config.storageS3ForcePathStyle
        }
      },
      secrets: {
        provider: config.secretsProvider,
        strictMode: config.secretsStrictMode,
        localEncrypted: {
          keyFilePath: config.secretsMasterKeyFilePath
        }
      }
    });
  }
  router.get("/instance/settings/heartbeat", (req, res) => {
    assertBoard(req);
    const config = loadConfig();
    res.json({
      enabled: config.heartbeatSchedulerEnabled,
      intervalMs: config.heartbeatSchedulerIntervalMs
    });
  });
  router.patch("/instance/settings/heartbeat", (req, res) => {
    assertBoard(req);
    const current = readConfigFile() ?? currentConfigAsFile();
    const enabled = typeof req.body?.enabled === "boolean" ? req.body.enabled : current.server.heartbeatSchedulerEnabled;
    const intervalMsRaw = Number(req.body?.intervalMs ?? current.server.heartbeatSchedulerIntervalMs);
    const intervalMs = Math.max(1e4, Number.isFinite(intervalMsRaw) ? Math.floor(intervalMsRaw) : current.server.heartbeatSchedulerIntervalMs);
    const next = paperclipConfigSchema.parse({
      ...current,
      $meta: {
        ...current.$meta,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        source: "configure"
      },
      server: {
        ...current.server,
        heartbeatSchedulerEnabled: enabled,
        heartbeatSchedulerIntervalMs: intervalMs
      }
    });
    writeConfigFile(next);
    res.json({
      enabled: next.server.heartbeatSchedulerEnabled,
      intervalMs: next.server.heartbeatSchedulerIntervalMs
    });
  });
  return router;
}
export {
  instanceSettingsRoutes
};
