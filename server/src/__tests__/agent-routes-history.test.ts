import { beforeEach, describe, expect, it, vi } from "vitest";
import { agentRoutes } from "../routes/agents.js";

const {
  listAgents,
  terminateAgent,
  removeAgent,
  cancelActiveForAgent,
  logActivityMock,
} = vi.hoisted(() => ({
  listAgents: vi.fn(),
  terminateAgent: vi.fn(),
  removeAgent: vi.fn(),
  cancelActiveForAgent: vi.fn(),
  logActivityMock: vi.fn(),
}));

vi.mock("../services/index.js", () => ({
  agentService: () => ({
    list: listAgents,
    terminate: terminateAgent,
    remove: removeAgent,
  }),
  accessService: () => ({
    canUser: vi.fn(),
    hasPermission: vi.fn(),
  }),
  approvalService: () => ({}),
  heartbeatService: () => ({
    cancelActiveForAgent,
  }),
  issueApprovalService: () => ({}),
  issueService: () => ({
    getById: vi.fn(),
  }),
  logActivity: logActivityMock,
  secretService: () => ({
    normalizeAdapterConfigForPersistence: vi.fn(),
    resolveAdapterConfigForRuntime: vi.fn(),
  }),
}));

function getRouteHandler(method: "get" | "post" | "delete", path: string) {
  const router = agentRoutes({} as any);
  const layer = (router as any).stack.find(
    (entry: any) => entry.route?.path === path && entry.route.methods?.[method],
  );
  if (!layer) {
    throw new Error(`Route not found: ${method.toUpperCase()} ${path}`);
  }
  return layer.route.stack.at(-1)?.handle as (req: any, res: any) => Promise<void>;
}

function createResponse() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

function createBoardActor() {
  return {
    type: "board",
    source: "local_implicit",
    userId: "board-user",
    isInstanceAdmin: true,
  };
}

describe("agent routes history support", () => {
  beforeEach(() => {
    listAgents.mockReset();
    terminateAgent.mockReset();
    removeAgent.mockReset();
    cancelActiveForAgent.mockReset();
    logActivityMock.mockReset();
  });

  it("passes includeTerminated through the company agents list route", async () => {
    const handler = getRouteHandler("get", "/companies/:companyId/agents");
    const res = createResponse();
    listAgents.mockResolvedValue([]);

    await handler(
      {
        params: { companyId: "company-1" },
        query: { includeTerminated: "true" },
        actor: createBoardActor(),
      },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(listAgents).toHaveBeenCalledWith("company-1", { includeTerminated: true });
  });

  it("records stable display details when terminating an agent", async () => {
    const handler = getRouteHandler("post", "/agents/:id/terminate");
    const res = createResponse();
    terminateAgent.mockResolvedValue({
      id: "123e4567-e89b-12d3-a456-426614174000",
      companyId: "company-1",
      name: "Scout OpenClaw",
      title: "Research Scout",
      role: "researcher",
    });

    await handler(
      {
        params: { id: "123e4567-e89b-12d3-a456-426614174000" },
        actor: createBoardActor(),
      },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(logActivityMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "agent.terminated",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        details: {
          name: "Scout OpenClaw",
          title: "Research Scout",
          role: "researcher",
        },
      }),
    );
  });

  it("records stable display details when deleting an agent", async () => {
    const handler = getRouteHandler("delete", "/agents/:id");
    const res = createResponse();
    removeAgent.mockResolvedValue({
      id: "123e4567-e89b-12d3-a456-426614174000",
      companyId: "company-1",
      name: "Nova Test",
      title: "QA Specialist",
      role: "qa",
    });

    await handler(
      {
        params: { id: "123e4567-e89b-12d3-a456-426614174000" },
        actor: createBoardActor(),
      },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(logActivityMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "agent.deleted",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        details: {
          name: "Nova Test",
          title: "QA Specialist",
          role: "qa",
        },
      }),
    );
  });
});
