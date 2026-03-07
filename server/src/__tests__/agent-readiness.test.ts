import { describe, expect, it } from "vitest";
import { buildAgentReadinessReport } from "../routes/agent-readiness.js";

describe("agent readiness report", () => {
  it("flags process runtime gaps and summarizes errors/warnings", () => {
    const report = buildAgentReadinessReport({
      companyId: "company-1",
      pendingApprovals: 2,
      agents: [
        {
          id: "a-good",
          name: "Good Worker",
          urlKey: "good-worker",
          adapterType: "process",
          status: "idle",
          adapterConfig: {
            command: "/usr/bin/python3",
            args: ["/tmp/multi_model_worker.py"],
            cwd: "/tmp",
            env: {
              MODEL_NAME: { type: "plain", value: "qwen3-coder-plus" },
              ALIBABA_API_KEY: { type: "secret_ref", secretId: "s1", version: "latest" },
            },
          },
        },
        {
          id: "a-bad",
          name: "Bad Worker",
          urlKey: "bad-worker",
          adapterType: "process",
          status: "paused",
          adapterConfig: {
            args: ["/tmp/multi_model_worker.py"],
            env: {},
          },
        },
        {
          id: "a-error",
          name: "Errored Agent",
          urlKey: "errored-agent",
          adapterType: "codex_local",
          status: "error",
          adapterConfig: {},
        },
      ],
      recentRuns: [
        {
          agentId: "a-bad",
          status: "failed",
          error: "Process adapter missing command",
          createdAt: new Date("2026-03-06T09:00:00.000Z"),
        },
      ],
      generatedAt: new Date("2026-03-06T09:05:00.000Z"),
    });

    expect(report.summary).toEqual({
      totalAgents: 3,
      invalidAgents: 2,
      errors: 4,
      warnings: 3,
    });
    expect(report.pendingApprovals).toBe(2);

    const badWorker = report.agents.find((item) => item.agentId === "a-bad");
    expect(badWorker?.issues.map((issue) => issue.code)).toEqual([
      "process.missing_command",
      "process.missing_cwd",
      "alibaba.missing_model_name",
      "alibaba.missing_api_key_ref",
      "agent.paused",
      "heartbeat.last_failed",
    ]);

    const erroredAgent = report.agents.find((item) => item.agentId === "a-error");
    expect(erroredAgent?.issues.map((issue) => issue.code)).toEqual(["agent.error"]);
  });

  it("uses the latest run only per agent", () => {
    const report = buildAgentReadinessReport({
      companyId: "company-2",
      pendingApprovals: 0,
      agents: [
        {
          id: "a1",
          name: "Worker",
          urlKey: "worker",
          adapterType: "process",
          status: "idle",
          adapterConfig: {
            command: "/usr/bin/python3",
            args: ["/tmp/multi_model_worker.py"],
            cwd: "/tmp",
            env: {
              MODEL_NAME: { type: "plain", value: "qwen" },
              ALIBABA_API_KEY: { type: "secret_ref", secretId: "s1", version: "latest" },
            },
          },
        },
      ],
      recentRuns: [
        {
          agentId: "a1",
          status: "success",
          error: null,
          createdAt: new Date("2026-03-06T09:00:00.000Z"),
        },
        {
          agentId: "a1",
          status: "failed",
          error: "older failure",
          createdAt: new Date("2026-03-06T08:00:00.000Z"),
        },
      ],
    });

    expect(report.summary.invalidAgents).toBe(0);
    expect(report.agents[0]?.issues).toEqual([]);
  });
});
