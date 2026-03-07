import { describe, expect, it } from "vitest";
import { authorizeIssueComment } from "../routes/issue-comment-authorization.js";

describe("issue comment authorization", () => {
  it("allows board comments", () => {
    expect(
      authorizeIssueComment({
        actorType: "board",
        actorAgentId: null,
        assigneeAgentId: null,
        issueStatus: "todo",
        reopenRequested: false,
      }),
    ).toEqual({ allowed: true, requiresRunOwnership: false });
  });

  it("allows non-assignee agent comments for review", () => {
    expect(
      authorizeIssueComment({
        actorType: "agent",
        actorAgentId: "agent-reviewer",
        assigneeAgentId: "agent-owner",
        issueStatus: "in_progress",
        reopenRequested: false,
      }),
    ).toEqual({ allowed: true, requiresRunOwnership: false });
  });

  it("requires assignee for reopen via comments", () => {
    expect(
      authorizeIssueComment({
        actorType: "agent",
        actorAgentId: "agent-reviewer",
        assigneeAgentId: "agent-owner",
        issueStatus: "done",
        reopenRequested: true,
      }),
    ).toEqual({
      allowed: false,
      requiresRunOwnership: false,
      error: "Only assignee agent can reopen issue from comments",
    });
  });

  it("requires run ownership for assignee on in-progress issues", () => {
    expect(
      authorizeIssueComment({
        actorType: "agent",
        actorAgentId: "agent-owner",
        assigneeAgentId: "agent-owner",
        issueStatus: "in_progress",
        reopenRequested: false,
      }),
    ).toEqual({
      allowed: true,
      requiresRunOwnership: true,
    });
  });
});
