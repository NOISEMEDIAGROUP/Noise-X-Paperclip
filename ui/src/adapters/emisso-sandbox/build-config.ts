import type { CreateConfigValues } from "../types";

function parseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function buildEmissoSandboxConfig(v: CreateConfigValues): Record<string, unknown> {
  const ac: Record<string, unknown> = {};

  if (v.model) ac.model = v.model;
  if (v.repoUrl) ac.repoUrl = v.repoUrl;
  if (v.vcpus) ac.vcpus = Number(v.vcpus);
  if (v.timeoutSec) ac.timeoutSec = Number(v.timeoutSec);
  if (v.maxTurns) ac.maxTurns = Number(v.maxTurns);
  if (v.snapshotId) ac.snapshotId = v.snapshotId;
  if (v.promptTemplate) ac.promptTemplate = v.promptTemplate;
  if (v.instructionsFilePath) ac.instructionsFilePath = v.instructionsFilePath;

  const mcpServers = parseJsonObject(v.mcpServersJson ?? "");
  if (mcpServers) ac.mcpServers = mcpServers;

  return ac;
}
