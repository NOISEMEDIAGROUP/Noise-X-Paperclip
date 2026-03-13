import type { CreateConfigValues } from "@paperclipai/adapter-utils";

export function buildPicoClawRemoteConfig(v: CreateConfigValues): Record<string, unknown> {
  const ac: Record<string, unknown> = {};
  if (v.url) ac.url = v.url;
  if (v.authToken) ac.authToken = v.authToken;
  if (v.cwd) ac.cwd = v.cwd;
  if (v.instructionsFilePath) ac.instructionsFilePath = v.instructionsFilePath;
  if (v.promptTemplate) ac.promptTemplate = v.promptTemplate;
  if (v.model) ac.model = v.model;
  ac.timeoutSec = 120;
  ac.graceSec = 20;
  return ac;
}
