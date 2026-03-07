import { describe, expect, it } from "vitest";
import { authorizeIssueMutation } from "../routes/issue-mutation-authorization.js";

describe("issue mutation authorization", () => {
  it("allows board mutations without run ownership checks", () => {
    expect(
      authorizeIssueMutation({
        actorType: "board",
        actorAgentId: null,
        issueStatus: "todo",
        assigneeAgentId: null,
      }),
    ).toEqual({
      allowed: true,
      requiresRunOwnership: false,
    });
  });

  it("rejects agent mutation when issue is not assigned to the actor", () => {
    expect(
      authorizeIssueMutation({
        actorType: "agent",
        actorAgentId: "agent-a",
        issueStatus: "todo",
        assigneeAgentId: "agent-b",
      }),
    ).toEqual({
      allowed: false,
      requiresRunOwnership: false,
      error: "Only assignee agent can mutate this issue",
    });
  });

  it("requires run ownership for in-progress mutations by assignee agent", () => {
    expect(
      authorizeIssueMutation({
        actorType: "agent",
        actorAgentId: "agent-a",
        issueStatus: "in_progress",
        assigneeAgentId: "agent-a",
      }),
    ).toEqual({
      allowed: true,
      requiresRunOwnership: true,
    });
  });

  it("allows assignee agent mutation on non-in-progress without run ownership", () => {
    expect(
      authorizeIssueMutation({
        actorType: "agent",
        actorAgentId: "agent-a",
        issueStatus: "done",
        assigneeAgentId: "agent-a",
      }),
    ).toEqual({
      allowed: true,
      requiresRunOwnership: false,
    });
  });

  it("rejects unauthenticated actor", () => {
    expect(
      authorizeIssueMutation({
        actorType: "none",
        actorAgentId: null,
        issueStatus: "todo",
        assigneeAgentId: null,
      }),
    ).toEqual({
      allowed: false,
      requiresRunOwnership: false,
      error: "Agent authentication required",
    });
  });
});
