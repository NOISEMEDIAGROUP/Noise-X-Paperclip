import { describe, expect, it } from "vitest";
import {
  classifyRunProgressFromActivity,
  derivePromptMode,
  isStalledRunProgress,
  resolveHeartbeatPolicy,
  shouldEvaluateNoProgressForRun,
} from "../services/heartbeat.ts";

describe("resolveHeartbeatPolicy", () => {
  it("parses extended heartbeat runtime flags", () => {
    const policy = resolveHeartbeatPolicy({
      heartbeat: {
        enabled: true,
        maxConcurrentRuns: 3,
        serverOwnedStartLifecycle: false,
        stallRecoveryEnabled: true,
        stateMachinePromptEnabled: true,
        strictTargetedRetrieval: true,
      },
    });

    expect(policy.maxConcurrentRuns).toBe(3);
    expect(policy.serverOwnedStartLifecycle).toBe(false);
    expect(policy.stallRecoveryEnabled).toBe(true);
    expect(policy.stateMachinePromptEnabled).toBe(true);
    expect(policy.strictTargetedRetrieval).toBe(true);
  });
});

describe("derivePromptMode", () => {
  it("chooses child callback mode for child wake reasons", () => {
    expect(derivePromptMode({ wakeReason: "child_issue_completed" })).toBe("HANDLE_CHILD_CALLBACK");
    expect(derivePromptMode({ wakeReason: "issue_stalled_escalated" })).toBe("HANDLE_CHILD_CALLBACK");
  });

  it("chooses mention mode for mention wakes", () => {
    expect(derivePromptMode({ wakeReason: "issue_comment_mentioned" })).toBe("HANDLE_MENTION");
  });

  it("chooses execute mode when task context is present", () => {
    expect(derivePromptMode({ issueId: "issue-1" })).toBe("EXECUTE_TASK");
  });

  it("chooses execute mode when callback context only includes parentIssueId", () => {
    expect(derivePromptMode({ parentIssueId: "issue-parent-1" })).toBe("EXECUTE_TASK");
  });

  it("falls back to wait mode when wake has no task/callback signals", () => {
    expect(derivePromptMode({})).toBe("WAIT_FOR_INPUT");
  });
});

describe("classifyRunProgressFromActivity", () => {
  it("ignores lifecycle-only checkout/in_progress mutations", () => {
    const classification = classifyRunProgressFromActivity([
      { action: "issue.checked_out", details: { source: "run_lifecycle" } },
      {
        action: "issue.updated",
        details: { status: "active", source: "run_lifecycle", _previous: { status: "draft" } },
      },
    ]);

    expect(classification).toBe("none");
  });

  it("classifies comment-only activity as weak", () => {
    const classification = classifyRunProgressFromActivity([
      { action: "issue.comment_added", details: { source: "comment" } },
    ]);

    expect(classification).toBe("weak");
  });

  it("classifies non-lifecycle mutations as strong", () => {
    const classification = classifyRunProgressFromActivity([
      { action: "issue.updated", details: { status: "closed", source: "comment" } },
    ]);

    expect(classification).toBe("strong");
  });
});

describe("isStalledRunProgress", () => {
  it("treats no-signal runs as stalled", () => {
    expect(isStalledRunProgress({ current: "none", previous: null })).toBe(true);
  });

  it("treats two consecutive weak runs as stalled", () => {
    expect(isStalledRunProgress({ current: "weak", previous: "weak" })).toBe(true);
  });

  it("does not stall on first weak run", () => {
    expect(isStalledRunProgress({ current: "weak", previous: null })).toBe(false);
  });
});

describe("shouldEvaluateNoProgressForRun", () => {
  it("evaluates succeeded assignment wakes", () => {
    expect(
      shouldEvaluateNoProgressForRun({
        status: "succeeded",
        invocationSource: "assignment",
        contextSnapshot: { wakeReason: "issue_assigned" },
      } as any),
    ).toBe(true);
  });

  it("evaluates explicit stalled retry wakes", () => {
    expect(
      shouldEvaluateNoProgressForRun({
        status: "succeeded",
        invocationSource: "automation",
        contextSnapshot: { wakeReason: "issue_stalled_retry" },
      } as any),
    ).toBe(true);
  });

  it("skips non-succeeded runs", () => {
    expect(
      shouldEvaluateNoProgressForRun({
        status: "failed",
        invocationSource: "assignment",
        contextSnapshot: { wakeReason: "issue_assigned" },
      } as any),
    ).toBe(false);
  });
});