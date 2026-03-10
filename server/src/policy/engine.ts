import type { Request } from "express";

export type PolicyAction =
  | "board:access"
  | "company:read"
  | "company:write"
  | "permission:manage";

export interface PolicyInput {
  actor: Request["actor"];
  action: PolicyAction;
  companyId?: string;
}

export interface PolicyDecision {
  allow: boolean;
  reason: string;
  policy: string;
}

function deny(reason: string, policy: string): PolicyDecision {
  return { allow: false, reason, policy };
}

function allow(reason: string, policy: string): PolicyDecision {
  return { allow: true, reason, policy };
}

function boardCompanyAccessPolicy(input: PolicyInput): PolicyDecision {
  const { actor, companyId } = input;

  if (actor.type !== "board") {
    return deny("board actor required", "board_company_access");
  }

  if (actor.source === "local_implicit") {
    return allow("local trusted board access", "board_company_access");
  }

  if (actor.isInstanceAdmin) {
    return allow("instance admin override", "board_company_access");
  }

  if (!companyId) {
    return deny("company scope missing", "board_company_access");
  }

  if ((actor.companyIds ?? []).includes(companyId)) {
    return allow("company membership granted", "board_company_access");
  }

  return deny("board user does not have access to company", "board_company_access");
}

function agentCompanyAccessPolicy(input: PolicyInput): PolicyDecision {
  const { actor, companyId } = input;
  if (actor.type !== "agent") {
    return deny("agent actor required", "agent_company_access");
  }

  if (!companyId) {
    return deny("company scope missing", "agent_company_access");
  }

  if (actor.companyId === companyId) {
    return allow("agent scoped to company", "agent_company_access");
  }

  return deny("agent key cannot access another company", "agent_company_access");
}

export function evaluatePolicy(input: PolicyInput): PolicyDecision {
  const { actor, action } = input;

  if (actor.type === "none") {
    return deny("unauthenticated actor", "auth_required");
  }

  if (action === "board:access") {
    if (actor.type === "board") {
      return allow("board actor", "board_access");
    }
    return deny("board access required", "board_access");
  }

  if (action === "company:read" || action === "company:write" || action === "permission:manage") {
    if (actor.type === "board") {
      return boardCompanyAccessPolicy(input);
    }
    if (actor.type === "agent") {
      return agentCompanyAccessPolicy(input);
    }
  }

  return deny("action is not allowed for actor", "default_deny");
}
