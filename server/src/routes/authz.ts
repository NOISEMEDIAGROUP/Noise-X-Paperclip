import type { Request } from "express";
import { forbidden, unauthorized } from "../errors.js";
import { evaluatePolicy } from "../policy/engine.js";

function throwFromDecision(req: Request, decision: { allow: boolean; reason: string }) {
  if (decision.allow) return;
  if (req.actor.type === "none") {
    throw unauthorized();
  }
  throw forbidden(decision.reason || "Forbidden");
}

export function assertBoard(req: Request) {
  const decision = evaluatePolicy({ actor: req.actor, action: "board:access" });
  throwFromDecision(req, decision);
}

export function assertCompanyAccess(req: Request, companyId: string) {
  const decision = evaluatePolicy({
    actor: req.actor,
    action: req.method.toUpperCase() === "GET" ? "company:read" : "company:write",
    companyId,
  });
  throwFromDecision(req, decision);
}

export function getActorInfo(req: Request) {
  if (req.actor.type === "none") {
    throw unauthorized();
  }
  if (req.actor.type === "agent") {
    return {
      actorType: "agent" as const,
      actorId: req.actor.agentId ?? "unknown-agent",
      agentId: req.actor.agentId ?? null,
      runId: req.actor.runId ?? null,
    };
  }

  return {
    actorType: "user" as const,
    actorId: req.actor.userId ?? "board",
    agentId: null,
    runId: req.actor.runId ?? null,
  };
}
