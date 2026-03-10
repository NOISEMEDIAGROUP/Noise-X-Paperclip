import fs from "node:fs";
import path from "node:path";
import { paperclipConfigSchema, type PaperclipConfig } from "@paperclipai/shared";
import { resolvePaperclipConfigPath } from "./paths.js";

export function readConfigFile(): PaperclipConfig | null {
  const configPath = resolvePaperclipConfigPath();

  if (!fs.existsSync(configPath)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    return paperclipConfigSchema.parse(raw);
  } catch {
    return null;
  }
}

export function createDefaultConfigFile(): PaperclipConfig {
  return paperclipConfigSchema.parse({
    $meta: {
      version: 1,
      updatedAt: new Date().toISOString(),
      source: "configure",
    },
    database: {},
    logging: {
      mode: "file",
    },
    server: {},
    auth: {},
    storage: {},
    storageAuth: {},
    secrets: {},
    runtime: {},
    agentAuth: {},
  });
}

export function writeConfigFile(config: PaperclipConfig): PaperclipConfig {
  const configPath = resolvePaperclipConfigPath();
  const parsed = paperclipConfigSchema.parse(config);
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf-8");
  return parsed;
}
