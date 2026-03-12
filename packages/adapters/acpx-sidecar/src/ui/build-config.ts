import type { CreateConfigValues } from "@paperclipai/adapter-utils";

function parseCommaArgs(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildAcpxSidecarConfig(v: CreateConfigValues): Record<string, unknown> {
  const ac: Record<string, unknown> = {};
  const rawValues = v as unknown as Record<string, unknown>;
  const timeoutSec =
    typeof rawValues.timeoutSec === "number"
      ? (rawValues.timeoutSec as number)
      : typeof rawValues.timeoutSec === "string"
      ? Number(rawValues.timeoutSec)
      : 300;
  if (v.url) ac.url = v.url;
  if (v.command) ac.agentCommand = v.command;
  if (v.cwd) ac.cwd = v.cwd;
  if (v.promptTemplate) ac.promptTemplate = v.promptTemplate;
  if (v.model) ac.model = v.model;
  if (v.extraArgs) ac.extraArgs = parseCommaArgs(v.extraArgs);
  ac.timeoutSec = Number.isFinite(timeoutSec) && timeoutSec > 0 ? timeoutSec : 300;
  return ac;
}
