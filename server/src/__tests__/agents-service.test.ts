import { describe, expect, it, vi } from "vitest";
import type { Db } from "@paperclipai/db";
import { agentService } from "../services/agents.js";

describe("agentService.getById", () => {
  it("returns null for non-uuid references without hitting the database", async () => {
    const selectSpy = vi.fn(() => {
      throw new Error("db.select should not be called for non-uuid agent ids");
    });
    const db = { select: selectSpy } as unknown as Db;
    const svc = agentService(db);

    const result = await svc.getById("mobile-engineer");

    expect(result).toBeNull();
    expect(selectSpy).not.toHaveBeenCalled();
  });
});
