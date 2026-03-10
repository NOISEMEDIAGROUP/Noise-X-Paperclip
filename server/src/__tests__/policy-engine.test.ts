import { describe, expect, it } from "vitest";
import { evaluatePolicy } from "../policy/engine.js";

describe("evaluatePolicy", () => {
  it("denies unauthenticated actors", () => {
    const decision = evaluatePolicy({
      actor: { type: "none", source: "none" },
      action: "company:read",
      companyId: "c1",
    });

    expect(decision.allow).toBe(false);
    expect(decision.policy).toBe("auth_required");
  });

  it("allows instance admin board access", () => {
    const decision = evaluatePolicy({
      actor: { type: "board", userId: "u1", isInstanceAdmin: true, source: "session" },
      action: "company:write",
      companyId: "c1",
    });

    expect(decision.allow).toBe(true);
  });

  it("denies board without company membership", () => {
    const decision = evaluatePolicy({
      actor: { type: "board", userId: "u1", source: "session", companyIds: ["c2"] },
      action: "company:write",
      companyId: "c1",
    });

    expect(decision.allow).toBe(false);
    expect(decision.reason).toContain("does not have access");
  });

  it("allows agent within same company", () => {
    const decision = evaluatePolicy({
      actor: { type: "agent", agentId: "a1", companyId: "c1", source: "agent_key" },
      action: "company:read",
      companyId: "c1",
    });

    expect(decision.allow).toBe(true);
  });

  it("denies agent cross-company access", () => {
    const decision = evaluatePolicy({
      actor: { type: "agent", agentId: "a1", companyId: "c2", source: "agent_key" },
      action: "company:read",
      companyId: "c1",
    });

    expect(decision.allow).toBe(false);
    expect(decision.reason).toContain("cannot access another company");
  });
});
