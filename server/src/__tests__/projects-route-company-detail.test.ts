import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { projectRoutes } from "../routes/projects.js";
import { errorHandler } from "../middleware/index.js";

const mockProjectService = vi.hoisted(() => ({
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  listWorkspaces: vi.fn(),
  createWorkspace: vi.fn(),
  updateWorkspace: vi.fn(),
  removeWorkspace: vi.fn(),
  remove: vi.fn(),
  resolveByReference: vi.fn(),
}));

const mockLogActivity = vi.hoisted(() => vi.fn());

vi.mock("../services/index.js", () => ({
  projectService: () => mockProjectService,
  logActivity: mockLogActivity,
}));

function createApp() {
  const companyId = "11111111-1111-1111-1111-111111111111";
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
  app.use("/api", projectRoutes({} as any));
  app.use(errorHandler);
  return app;
}

describe("GET /companies/:companyId/projects/:id", () => {
  const COMPANY_ID = "11111111-1111-1111-1111-111111111111";
  const PROJECT_ID = "22222222-2222-2222-2222-222222222222";

  beforeEach(() => {
    mockProjectService.list.mockReset();
    mockProjectService.getById.mockReset();
    mockProjectService.create.mockReset();
    mockProjectService.update.mockReset();
    mockProjectService.listWorkspaces.mockReset();
    mockProjectService.createWorkspace.mockReset();
    mockProjectService.updateWorkspace.mockReset();
    mockProjectService.removeWorkspace.mockReset();
    mockProjectService.remove.mockReset();
    mockProjectService.resolveByReference.mockReset();
    mockProjectService.resolveByReference.mockResolvedValue({ project: null, ambiguous: false });
    mockLogActivity.mockReset();
    mockLogActivity.mockResolvedValue(undefined);
  });

  it("supports company-scoped project detail route", async () => {
    mockProjectService.getById.mockResolvedValue({
      id: PROJECT_ID,
      companyId: COMPANY_ID,
      name: "Project 1",
      description: null,
      status: "active",
      goalId: null,
      leadAgentId: null,
      targetDate: null,
      color: "#6366f1",
      archivedAt: null,
      createdAt: new Date("2026-03-11T00:00:00.000Z"),
      updatedAt: new Date("2026-03-11T00:00:00.000Z"),
      urlKey: "project-1",
      goalIds: [],
      goals: [],
      workspaces: [],
      primaryWorkspace: null,
    });

    const app = createApp();
    const res = await request(app).get(`/api/companies/${COMPANY_ID}/projects/${PROJECT_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(PROJECT_ID);
    expect(res.body.companyId).toBe(COMPANY_ID);
  });

  it("returns 404 on company-scoped project detail when company does not match", async () => {
    mockProjectService.getById.mockResolvedValue({
      id: PROJECT_ID,
      companyId: "33333333-3333-3333-3333-333333333333",
      name: "Project 1",
      description: null,
      status: "active",
      goalId: null,
      leadAgentId: null,
      targetDate: null,
      color: "#6366f1",
      archivedAt: null,
      createdAt: new Date("2026-03-11T00:00:00.000Z"),
      updatedAt: new Date("2026-03-11T00:00:00.000Z"),
      urlKey: "project-1",
      goalIds: [],
      goals: [],
      workspaces: [],
      primaryWorkspace: null,
    });

    const app = createApp();
    const res = await request(app).get(`/api/companies/${COMPANY_ID}/projects/${PROJECT_ID}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Project not found" });
  });
});
