import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueRoutes } from "../routes/issues.js";
import { errorHandler } from "../middleware/index.js";

const mockIssueService = vi.hoisted(() => ({
  list: vi.fn(),
}));

vi.mock("../services/index.js", () => ({
  accessService: vi.fn(() => ({})),
  agentService: vi.fn(() => ({})),
  goalService: vi.fn(() => ({})),
  heartbeatService: vi.fn(() => ({})),
  issueApprovalService: vi.fn(() => ({})),
  issueService: vi.fn(() => mockIssueService),
  logActivity: vi.fn(),
  projectService: vi.fn(() => ({})),
}));

function createApp(companyId: string) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = {
      type: "board",
      userId: "user-1",
      companyIds: [companyId],
      source: "session",
      isInstanceAdmin: false,
    };
    next();
  });
  app.use("/api", issueRoutes({} as any, {} as any));
  app.use(errorHandler);
  return app;
}

describe("GET /companies/:companyId/issues filters", () => {
  const COMPANY_ID = "11111111-1111-1111-1111-111111111111";

  beforeEach(() => {
    mockIssueService.list.mockReset();
    mockIssueService.list.mockResolvedValue([]);
  });

  it("passes parentId through to issue service filters", async () => {
    const app = createApp(COMPANY_ID);
    const parentId = "22222222-2222-2222-2222-222222222222";

    const res = await request(app).get(`/api/companies/${COMPANY_ID}/issues`).query({ parentId });

    expect(res.status).toBe(200);
    expect(mockIssueService.list).toHaveBeenCalledWith(
      COMPANY_ID,
      expect.objectContaining({ parentId }),
    );
  });
});
