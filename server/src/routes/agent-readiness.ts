export interface AgentReadinessIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
}

export interface AgentReadinessItem {
  agentId: string;
  agentName: string;
  agentUrlKey: string;
  adapterType: string;
  status: string;
  issues: AgentReadinessIssue[];
}

export interface AgentReadinessReport {
  companyId: string;
  generatedAt: string;
  pendingApprovals: number;
  summary: {
    totalAgents: number;
    invalidAgents: number;
    errors: number;
    warnings: number;
  };
  agents: AgentReadinessItem[];
}

export interface ReadinessAgent {
  id: string;
  name: string;
  urlKey: string;
  adapterType: string;
  status: string;
  adapterConfig: unknown;
}

export interface ReadinessRun {
  agentId: string | null;
  status: string;
  error: string | null;
  createdAt: Date;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function buildAgentReadinessReport(input: {
  companyId: string;
  agents: ReadinessAgent[];
  recentRuns: ReadinessRun[];
  pendingApprovals: number;
  generatedAt?: Date;
}): AgentReadinessReport {
  const latestRunByAgent = new Map<string, { status: string; error: string | null; createdAt: Date }>();
  for (const run of input.recentRuns) {
    if (!run.agentId || latestRunByAgent.has(run.agentId)) continue;
    latestRunByAgent.set(run.agentId, {
      status: run.status,
      error: run.error ?? null,
      createdAt: run.createdAt,
    });
  }

  const agentReadiness = input.agents.map((agent): AgentReadinessItem => {
    const issues: AgentReadinessIssue[] = [];
    const adapterConfig = asRecord(agent.adapterConfig) ?? {};
    const env = asRecord(adapterConfig.env) ?? {};
    const command = asNonEmptyString(adapterConfig.command);
    const cwd = asNonEmptyString(adapterConfig.cwd);
    const args = Array.isArray(adapterConfig.args) ? adapterConfig.args : [];

    if (agent.adapterType === "process") {
      if (!command) {
        issues.push({
          code: "process.missing_command",
          severity: "error",
          message: "Process runtime command is missing",
        });
      }
      if (!cwd) {
        issues.push({
          code: "process.missing_cwd",
          severity: "warning",
          message: "Working directory (cwd) is not set",
        });
      }

      const workerLike =
        Boolean(command && command.includes("multi_model_worker.py")) ||
        args.some((item) => typeof item === "string" && item.includes("multi_model_worker.py"));

      if (workerLike) {
        if (!Object.prototype.hasOwnProperty.call(env, "MODEL_NAME")) {
          issues.push({
            code: "alibaba.missing_model_name",
            severity: "error",
            message: "MODEL_NAME is missing for Alibaba worker runtime",
          });
        }
        if (
          !Object.prototype.hasOwnProperty.call(env, "ALIBABA_API_KEY") &&
          !Object.prototype.hasOwnProperty.call(env, "DASHSCOPE_API_KEY")
        ) {
          issues.push({
            code: "alibaba.missing_api_key_ref",
            severity: "error",
            message: "Alibaba API key secret reference is missing",
          });
        }
      }
    }

    if (agent.status === "paused") {
      issues.push({
        code: "agent.paused",
        severity: "warning",
        message: "Agent is paused",
      });
    }
    if (agent.status === "error") {
      issues.push({
        code: "agent.error",
        severity: "error",
        message: "Agent status is error",
      });
    }

    const latestRun = latestRunByAgent.get(agent.id);
    if (latestRun?.status === "failed") {
      issues.push({
        code: "heartbeat.last_failed",
        severity: "warning",
        message: latestRun.error ? `Latest heartbeat failed: ${latestRun.error}` : "Latest heartbeat failed",
      });
    }

    return {
      agentId: agent.id,
      agentName: agent.name,
      agentUrlKey: agent.urlKey,
      adapterType: agent.adapterType,
      status: agent.status,
      issues,
    };
  });

  const invalidAgents = agentReadiness.filter((item) => item.issues.length > 0).length;
  const errors = agentReadiness.reduce(
    (acc, item) => acc + item.issues.filter((issue) => issue.severity === "error").length,
    0,
  );
  const warnings = agentReadiness.reduce(
    (acc, item) => acc + item.issues.filter((issue) => issue.severity === "warning").length,
    0,
  );

  return {
    companyId: input.companyId,
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
    pendingApprovals: input.pendingApprovals,
    summary: {
      totalAgents: input.agents.length,
      invalidAgents,
      errors,
      warnings,
    },
    agents: agentReadiness,
  };
}
