export interface IssueMutationAuthorizationInput {
  actorType: "board" | "agent" | "none";
  actorAgentId: string | null;
  issueStatus: string;
  assigneeAgentId: string | null;
}

export interface IssueMutationAuthorizationResult {
  allowed: boolean;
  requiresRunOwnership: boolean;
  error?: string;
}

export function authorizeIssueMutation(input: IssueMutationAuthorizationInput): IssueMutationAuthorizationResult {
  if (input.actorType === "board") {
    return { allowed: true, requiresRunOwnership: false };
  }

  if (input.actorType === "none") {
    return {
      allowed: false,
      requiresRunOwnership: false,
      error: "Agent authentication required",
    };
  }

  if (!input.actorAgentId) {
    return {
      allowed: false,
      requiresRunOwnership: false,
      error: "Agent authentication required",
    };
  }

  if (!input.assigneeAgentId || input.assigneeAgentId !== input.actorAgentId) {
    return {
      allowed: false,
      requiresRunOwnership: false,
      error: "Only assignee agent can mutate this issue",
    };
  }

  return {
    allowed: true,
    requiresRunOwnership: input.issueStatus === "in_progress",
  };
}
