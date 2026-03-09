// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildActivityDisplayMaps } from "./activityDisplay";
import type { ActivityEvent, Agent } from "@paperclipai/shared";

describe("activityDisplay", () => {
  it("keeps terminated agents resolvable from the live agent list", () => {
    const agents = [
      {
        id: "agent-1",
        name: "Scout OpenClaw",
        status: "terminated",
      },
    ] as Agent[];

    const maps = buildActivityDisplayMaps({ agents });

    expect(maps.agentMap.get("agent-1")?.name).toBe("Scout OpenClaw");
    expect(maps.entityNameMap.get("agent:agent-1")).toBe("Scout OpenClaw");
  });

  it("recovers deleted agent names and titles from historical activity details", () => {
    const events = [
      {
        id: "evt-delete",
        companyId: "company-1",
        actorType: "user",
        actorId: "board",
        action: "agent.deleted",
        entityType: "agent",
        entityId: "agent-deleted",
        agentId: null,
        runId: null,
        details: null,
        createdAt: new Date("2026-03-09T12:00:00.000Z"),
      },
      {
        id: "evt-create",
        companyId: "company-1",
        actorType: "user",
        actorId: "board",
        action: "agent.created",
        entityType: "agent",
        entityId: "agent-deleted",
        agentId: null,
        runId: null,
        details: {
          name: "Nova Test",
          role: "QA Specialist",
        },
        createdAt: new Date("2026-03-08T12:00:00.000Z"),
      },
    ] as ActivityEvent[];

    const maps = buildActivityDisplayMaps({ events });

    expect(maps.agentNameMap.get("agent-deleted")).toBe("Nova Test");
    expect(maps.entityNameMap.get("agent:agent-deleted")).toBe("Nova Test");
    expect(maps.entityTitleMap.get("agent:agent-deleted")).toBe("QA Specialist");
  });
});
