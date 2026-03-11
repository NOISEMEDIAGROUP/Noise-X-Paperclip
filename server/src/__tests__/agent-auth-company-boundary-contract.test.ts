/**
 * Contract test: Agent auth boundary — assertBoard enforcement.
 *
 * Agent cross-company access tests are in company-scope-contract.test.ts.
 * This file tests the assertBoard gate which is a distinct contract.
 */
import { describe, expect, it } from "vitest";
import { assertBoard } from "../routes/authz.js";
import { fakeReq } from "./helpers/fakeReq.js";

describe("agent auth boundary contract — assertBoard", () => {
  it("assertBoard rejects agent actors", () => {
    const req = fakeReq({
      type: "agent",
      agentId: "agent-1",
      companyId: "company-A",
    });
    expect(() => assertBoard(req)).toThrow("Board access required");
  });

  it("assertBoard accepts board actors (local_implicit)", () => {
    const req = fakeReq({
      type: "board",
      userId: "user-1",
      source: "local_implicit",
    });
    expect(() => assertBoard(req)).not.toThrow();
  });

  it("assertBoard accepts board actors (session)", () => {
    const req = fakeReq({
      type: "board",
      userId: "user-1",
      source: "session",
      companyIds: ["company-1"],
    });
    expect(() => assertBoard(req)).not.toThrow();
  });
});
