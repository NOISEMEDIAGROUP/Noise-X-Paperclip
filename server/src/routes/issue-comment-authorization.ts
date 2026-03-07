export interface IssueCommentAuthorizationInput {
  actorType: "board" | "agent" | "none";
  actorAgentId: string | null;
  assigneeAgentId: string | null;
  issueStatus: string;
  reopenRequested: boolean;
}

export interface IssueCommentAuthorizationResult {
  allowed: boolean;
  requiresRunOwnership: boolean;
  error?: string;
}

export function authorizeIssueComment(input: IssueCommentAuthorizationInput): IssueCommentAuthorizationResult {
  if (input.actorType === "board") {
    return { allowed: true, requiresRunOwnership: false };
  }

  if (input.actorType === "none" || !input.actorAgentId) {
    return {
      allowed: false,
      requiresRunOwnership: false,
      error: "Agent authentication required",
    };
  }

  const isAssignee = input.assigneeAgentId === input.actorAgentId;

  if (input.reopenRequested && !isAssignee) {
    return {
      allowed: false,
      requiresRunOwnership: false,
      error: "Only assignee agent can reopen issue from comments",
    };
  }

  if (!isAssignee) {
    return {
      allowed: true,
      requiresRunOwnership: false,
    };
  }

  return {
    allowed: true,
    requiresRunOwnership: input.issueStatus === "in_progress",
  };
}
