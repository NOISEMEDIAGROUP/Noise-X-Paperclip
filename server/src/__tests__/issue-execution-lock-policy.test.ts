import { describe, expect, it } from "vitest";
import { shouldBypassIssueExecutionLock } from "../services/issue-execution-lock-policy.js";

describe("issue execution lock policy", () => {
  it("does not bypass lock for @mention wakeups", () => {
    expect(shouldBypassIssueExecutionLock("issue_comment_mentioned", "issue_comment_mentioned")).toBe(false);
  });

  it("does not bypass lock for any wake reason", () => {
    expect(shouldBypassIssueExecutionLock("issue_commented", "issue_commented")).toBe(false);
    expect(shouldBypassIssueExecutionLock(null, null)).toBe(false);
  });
});
