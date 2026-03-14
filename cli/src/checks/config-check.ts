import fs from "node:fs";
import { resolveConfiguredEnvFilePath } from "@paperclipai/adapter-utils/server-utils";
import { readConfig, configExists, resolveConfigPath } from "../config/store.js";
import type { CheckResult } from "./index.js";

export function configCheck(configPath?: string): CheckResult {
  const filePath = resolveConfigPath(configPath);

  if (!configExists(configPath)) {
    return {
      name: "Config file",
      status: "fail",
      message: `Config file not found at ${filePath}`,
      canRepair: false,
      repairHint: "Run `paperclipai onboard` to create one",
    };
  }

  try {
    const config = readConfig(configPath);
    const configuredGlobalEnvFile = config?.globalEnvFile?.trim();
    if (configuredGlobalEnvFile) {
      const resolvedGlobalEnvFile = resolveConfiguredEnvFilePath(
        configuredGlobalEnvFile,
        filePath,
      );
      if (!fs.existsSync(resolvedGlobalEnvFile)) {
        return {
          name: "Config file",
          status: "warn",
          message: `Valid config at ${filePath}, but global env file is missing: ${resolvedGlobalEnvFile}`,
          canRepair: false,
          repairHint: "Update `globalEnvFile` or run `paperclipai configure --section env`.",
        };
      }
    }
    return {
      name: "Config file",
      status: "pass",
      message: `Valid config at ${filePath}`,
    };
  } catch (err) {
    return {
      name: "Config file",
      status: "fail",
      message: `Invalid config: ${err instanceof Error ? err.message : String(err)}`,
      canRepair: false,
      repairHint: "Run `paperclipai configure --section database` (or `paperclipai onboard` to recreate)",
    };
  }
}
