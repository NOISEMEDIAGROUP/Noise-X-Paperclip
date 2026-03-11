import { describe, expect, it } from "vitest";
import { resolveDefaultAgentWorkspaceDir } from "../home-paths.js";
import {
  buildAutoHireApprovalPayload,
  resolveAutoHireHeadcount,
  resolveRuntimeSessionParamsForWorkspace,
  shouldQueueFollowupWake,
  shouldResetTaskSessionForWake,
  type ResolvedWorkspaceForRun,
} from "../services/heartbeat.ts";

function buildResolvedWorkspace(overrides: Partial<ResolvedWorkspaceForRun> = {}): ResolvedWorkspaceForRun {
  return {
    cwd: "/tmp/project",
    source: "project_primary",
    projectId: "project-1",
    workspaceId: "workspace-1",
    repoUrl: null,
    repoRef: null,
    workspaceHints: [],
    warnings: [],
    ...overrides,
  };
}

describe("resolveRuntimeSessionParamsForWorkspace", () => {
  it("migrates fallback workspace sessions to project workspace when project cwd becomes available", () => {
    const agentId = "agent-123";
    const fallbackCwd = resolveDefaultAgentWorkspaceDir(agentId);

    const result = resolveRuntimeSessionParamsForWorkspace({
      agentId,
      previousSessionParams: {
        sessionId: "session-1",
        cwd: fallbackCwd,
        workspaceId: "workspace-1",
      },
      resolvedWorkspace: buildResolvedWorkspace({ cwd: "/tmp/new-project-cwd" }),
    });

    expect(result.sessionParams).toMatchObject({
      sessionId: "session-1",
      cwd: "/tmp/new-project-cwd",
      workspaceId: "workspace-1",
    });
    expect(result.warning).toContain("Attempting to resume session");
  });

  it("does not migrate when previous session cwd is not the fallback workspace", () => {
    const result = resolveRuntimeSessionParamsForWorkspace({
      agentId: "agent-123",
      previousSessionParams: {
        sessionId: "session-1",
        cwd: "/tmp/some-other-cwd",
        workspaceId: "workspace-1",
      },
      resolvedWorkspace: buildResolvedWorkspace({ cwd: "/tmp/new-project-cwd" }),
    });

    expect(result.sessionParams).toEqual({
      sessionId: "session-1",
      cwd: "/tmp/some-other-cwd",
      workspaceId: "workspace-1",
    });
    expect(result.warning).toBeNull();
  });

  it("does not migrate when resolved workspace id differs from previous session workspace id", () => {
    const agentId = "agent-123";
    const fallbackCwd = resolveDefaultAgentWorkspaceDir(agentId);

    const result = resolveRuntimeSessionParamsForWorkspace({
      agentId,
      previousSessionParams: {
        sessionId: "session-1",
        cwd: fallbackCwd,
        workspaceId: "workspace-1",
      },
      resolvedWorkspace: buildResolvedWorkspace({
        cwd: "/tmp/new-project-cwd",
        workspaceId: "workspace-2",
      }),
    });

    expect(result.sessionParams).toEqual({
      sessionId: "session-1",
      cwd: fallbackCwd,
      workspaceId: "workspace-1",
    });
    expect(result.warning).toBeNull();
  });
});

describe("shouldResetTaskSessionForWake", () => {
  it("resets session context on assignment wake", () => {
    expect(shouldResetTaskSessionForWake({ wakeReason: "issue_assigned" })).toBe(true);
  });

  it("resets session context on timer heartbeats", () => {
    expect(shouldResetTaskSessionForWake({ wakeSource: "timer" })).toBe(true);
  });

  it("resets session context on manual on-demand invokes", () => {
    expect(
      shouldResetTaskSessionForWake({
        wakeSource: "on_demand",
        wakeTriggerDetail: "manual",
      }),
    ).toBe(true);
  });

  it("does not reset session context on mention wake comment", () => {
    expect(
      shouldResetTaskSessionForWake({
        wakeReason: "issue_comment_mentioned",
        wakeCommentId: "comment-1",
      }),
    ).toBe(false);
  });

  it("does not reset session context when commentId is present", () => {
    expect(
      shouldResetTaskSessionForWake({
        wakeReason: "issue_commented",
        commentId: "comment-2",
      }),
    ).toBe(false);
  });

  it("does not reset for comment wakes", () => {
    expect(shouldResetTaskSessionForWake({ wakeReason: "issue_commented" })).toBe(false);
  });

  it("does not reset when wake reason is missing", () => {
    expect(shouldResetTaskSessionForWake({})).toBe(false);
  });

  it("does not reset session context on callback on-demand invokes", () => {
    expect(
      shouldResetTaskSessionForWake({
        wakeSource: "on_demand",
        wakeTriggerDetail: "callback",
      }),
    ).toBe(false);
  });
});

describe("shouldQueueFollowupWake", () => {
  it("queues follow-up for comment wakes while same-scope run is active", () => {
    expect(
      shouldQueueFollowupWake({
        wakeReason: "issue_comment_mentioned",
        wakeCommentId: "comment-1",
        hasSameScopeRunningRun: true,
        hasSameScopeQueuedRun: false,
      }),
    ).toBe(true);
  });

  it("queues follow-up for assignment wakes while same-scope run is active", () => {
    expect(
      shouldQueueFollowupWake({
        wakeReason: "issue_assigned",
        wakeCommentId: null,
        hasSameScopeRunningRun: true,
        hasSameScopeQueuedRun: false,
      }),
    ).toBe(true);
  });

  it("does not queue follow-up when a same-scope queued run already exists", () => {
    expect(
      shouldQueueFollowupWake({
        wakeReason: "issue_assigned",
        wakeCommentId: null,
        hasSameScopeRunningRun: true,
        hasSameScopeQueuedRun: true,
      }),
    ).toBe(false);
  });

  it("does not queue follow-up for unrelated wakes", () => {
    expect(
      shouldQueueFollowupWake({
        wakeReason: "issue_status_changed",
        wakeCommentId: null,
        hasSameScopeRunningRun: true,
        hasSameScopeQueuedRun: false,
      }),
    ).toBe(false);
  });
});

describe("resolveAutoHireHeadcount", () => {
  it("requests hires only for uncovered goals beyond current and pending capacity", () => {
    expect(
      resolveAutoHireHeadcount({
        uncoveredGoalCount: 4,
        contributorCount: 2,
        pendingHireHeadcount: 1,
      }),
    ).toBe(1);
  });

  it("returns zero when contributors and pending hires already cover uncovered goals", () => {
    expect(
      resolveAutoHireHeadcount({
        uncoveredGoalCount: 3,
        contributorCount: 2,
        pendingHireHeadcount: 1,
      }),
    ).toBe(0);
  });

  it("normalizes negative or non-finite values to zero", () => {
    expect(
      resolveAutoHireHeadcount({
        uncoveredGoalCount: -10,
        contributorCount: Number.NaN,
        pendingHireHeadcount: -1,
      }),
    ).toBe(0);
  });
});

describe("buildAutoHireApprovalPayload", () => {
  const baseAgent = {
    id: "agent-ceo",
    companyId: "company-1",
    name: "CEO",
    role: "ceo",
    status: "active",
    adapterType: "codex_local",
    adapterConfig: {
      command: "codex",
      model: "gpt-5-codex",
      env: {
        OPENAI_API_KEY: { type: "secret_ref", secretId: "secret-1", version: "latest" },
        PAPERCLIP_API_KEY: { type: "plain", value: "must-be-ignored" },
      },
    },
    runtimeConfig: {},
    reportsTo: null,
    title: "CEO",
    capabilities: null,
    budgetMonthlyCents: 0,
    spentMonthlyCents: 0,
    metadata: null,
    icon: null,
    permissions: null,
    lastHeartbeatAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  } as any;

  it("clones supported adapter defaults and strips reserved env overrides", () => {
    const payload = buildAutoHireApprovalPayload({
      requestingAgent: baseAgent,
      requestedHeadcount: 2,
      uncoveredGoalIds: ["goal-1"],
      sourceRunId: "run-1",
    });

    expect(payload.adapterType).toBe("codex_local");
    expect(payload.runtimeConfig).toEqual({
      heartbeat: {
        enabled: false,
        intervalSec: 0,
        wakeOnDemand: true,
        maxConcurrentRuns: 1,
      },
    });
    expect(payload.adapterConfig).toMatchObject({
      command: "codex",
      model: "gpt-5-codex",
      promptTemplate: expect.stringContaining("Execute assigned Paperclip issues"),
    });
    expect((payload.adapterConfig as Record<string, unknown>).env).toEqual({
      OPENAI_API_KEY: { type: "secret_ref", secretId: "secret-1", version: "latest" },
    });
    expect((payload.adapterConfig as Record<string, unknown>).env).not.toHaveProperty(
      "PAPERCLIP_API_KEY",
    );
  });

  it("falls back to codex_local when requester adapter is not cloneable", () => {
    const payload = buildAutoHireApprovalPayload({
      requestingAgent: {
        ...baseAgent,
        adapterType: "openclaw_gateway",
        adapterConfig: { url: "https://example.invalid/hook" },
      } as any,
      requestedHeadcount: 1,
      uncoveredGoalIds: [],
      sourceRunId: "run-2",
    });

    expect(payload.adapterType).toBe("codex_local");
    expect(payload.adapterConfig).toMatchObject({
      command: "codex",
      dangerouslyBypassApprovalsAndSandbox: true,
    });
  });
});
