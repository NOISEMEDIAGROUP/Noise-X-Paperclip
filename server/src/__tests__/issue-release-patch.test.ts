import { describe, expect, it } from "vitest";
import { buildIssueReleasePatch } from "../services/issues.js";

describe("issue release patch", () => {
  it("clears assignment and execution lock fields", () => {
    const ts = new Date("2026-03-06T10:00:00.000Z");
    const patch = buildIssueReleasePatch(ts);

    expect(patch).toEqual({
      status: "todo",
      assigneeAgentId: null,
      checkoutRunId: null,
      executionRunId: null,
      executionAgentNameKey: null,
      executionLockedAt: null,
      updatedAt: ts,
    });
  });
});
