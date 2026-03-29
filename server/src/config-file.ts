import fs from "node:fs";
import { resolvePaperclipConfigPath } from "./paths.js";

type PaperclipConfig = {
  logging?: {
    logDir?: string;
  };
};

export function readConfigFile(): PaperclipConfig | null {
  const configPath = resolvePaperclipConfigPath();

  if (!fs.existsSync(configPath)) return null;

  try {
    return JSON.parse(fs.readFileSync(configPath, "utf-8")) as PaperclipConfig;
  } catch {
    return null;
  }
}
