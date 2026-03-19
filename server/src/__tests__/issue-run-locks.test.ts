import { describe, expect, it } from "vitest";
import {
  clearIssueRunLockFields,
  shouldClearIssueRunLocksOnUpdate,
} from "../services/issues.js";

describe("issue run lock helpers", () => {
  it("clears both checkout and execution lock metadata together", () => {
    expect(
      clearIssueRunLockFields({
        checkoutRunId: "checkout-run",
        executionRunId: "execution-run",
        executionAgentNameKey: "cmo",
        executionLockedAt: new Date("2026-03-18T23:30:55.257Z"),
      }),
    ).toMatchObject({
      checkoutRunId: null,
      executionRunId: null,
      executionAgentNameKey: null,
      executionLockedAt: null,
    });
  });

  it("clears run locks when an in-progress issue transitions away from in_progress", () => {
    expect(
      shouldClearIssueRunLocksOnUpdate({
        currentStatus: "in_progress",
        nextStatus: "todo",
        currentAssigneeAgentId: "agent-1",
        currentAssigneeUserId: null,
      }),
    ).toBe(true);
  });

  it("clears run locks when the assignee changes", () => {
    expect(
      shouldClearIssueRunLocksOnUpdate({
        currentStatus: "blocked",
        currentAssigneeAgentId: "agent-1",
        currentAssigneeUserId: null,
        nextAssigneeAgentId: "agent-2",
      }),
    ).toBe(true);
  });

  it("keeps run locks for unrelated metadata updates", () => {
    expect(
      shouldClearIssueRunLocksOnUpdate({
        currentStatus: "in_progress",
        nextStatus: "in_progress",
        currentAssigneeAgentId: "agent-1",
        currentAssigneeUserId: null,
        nextAssigneeAgentId: "agent-1",
      }),
    ).toBe(false);
  });
});
