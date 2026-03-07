import os from "node:os";
import path from "node:path";

export interface ProcessRuntimeProfile {
  id: string;
  label: string;
  description: string;
  command: string;
  args: string[];
  cwd: string;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function defaultWorkspaceCwd() {
  return process.env.PAPERCLIP_DEFAULT_PROCESS_CWD?.trim() || process.cwd();
}

function defaultPythonBin() {
  return process.env.PAPERCLIP_DEFAULT_PYTHON_BIN?.trim() || "/usr/bin/python3";
}

function alibabaWorkerPath() {
  return process.env.PAPERCLIP_ALIBABA_WORKER_PATH?.trim() || path.join(os.homedir(), ".paperclip/workers/multi_model_worker.py");
}

export function listProcessRuntimeProfiles(): ProcessRuntimeProfile[] {
  const workspaceCwd = defaultWorkspaceCwd();
  return [
    {
      id: "alibaba_worker_python",
      label: "Alibaba Worker (Python)",
      description: "Runs the multi_model_worker.py Alibaba worker with Python.",
      command: defaultPythonBin(),
      args: [alibabaWorkerPath()],
      cwd: workspaceCwd,
    },
    {
      id: "portfolio_audit_script",
      label: "Portfolio Audit Script",
      description: "Runs .agent/scripts/portfolio-audit.sh with fast JSON output.",
      command: path.join(workspaceCwd, ".agent/scripts/portfolio-audit.sh"),
      args: ["--fast", "--json"],
      cwd: workspaceCwd,
    },
  ];
}

export function resolveProcessRuntimeProfile(profileId: string): ProcessRuntimeProfile | null {
  const normalized = profileId.trim();
  if (!normalized) return null;
  return listProcessRuntimeProfiles().find((profile) => profile.id === normalized) ?? null;
}

export function applyProcessRuntimeProfileDefaults(
  adapterType: string | null | undefined,
  adapterConfig: Record<string, unknown>,
): Record<string, unknown> {
  if (adapterType !== "process") return adapterConfig;

  const profileId = asNonEmptyString(adapterConfig.processRuntimeProfile);
  if (!profileId) return adapterConfig;

  const profile = resolveProcessRuntimeProfile(profileId);
  if (!profile) {
    throw new Error(`Unknown process runtime profile: ${profileId}`);
  }

  const next: Record<string, unknown> = { ...adapterConfig };
  if (!asNonEmptyString(next.command)) {
    next.command = profile.command;
  }
  if (!Object.prototype.hasOwnProperty.call(next, "args")) {
    next.args = [...profile.args];
  }
  if (!Object.prototype.hasOwnProperty.call(next, "cwd")) {
    next.cwd = profile.cwd;
  }
  return next;
}
