import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { goalRoutes } from "../routes/goals.js";
import { errorHandler } from "../middleware/index.js";

const mockGoalService = vi.hoisted(() => ({
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

const mockProjectService = vi.hoisted(() => ({
  getById: vi.fn(),
}));

const mockLogActivity = vi.hoisted(() => vi.fn());

vi.mock("../services/index.js", () => ({
  goalService: () => mockGoalService,
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
  app.use("/api", goalRoutes({} as any));
  app.use(errorHandler);
  return app;
}

describe("POST /companies/:companyId/goals project linkage", () => {
  const COMPANY_ID = "11111111-1111-1111-1111-111111111111";
  const PROJECT_ID = "22222222-2222-2222-2222-222222222222";
  const GOAL_ID = "33333333-3333-3333-3333-333333333333";

  beforeEach(() => {
    mockGoalService.list.mockReset();
    mockGoalService.getById.mockReset();
    mockGoalService.create.mockReset();
    mockGoalService.update.mockReset();
    mockGoalService.remove.mockReset();
    mockProjectService.getById.mockReset();
    mockLogActivity.mockReset();
    mockLogActivity.mockResolvedValue(undefined);
  });

  it("creates a goal linked to a valid project", async () => {
    mockProjectService.getById.mockResolvedValue({ id: PROJECT_ID, companyId: COMPANY_ID });
    mockGoalService.create.mockResolvedValue({
      id: GOAL_ID,
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      title: "Launch roadmap",
      description: null,
      level: "task",
      status: "planned",
      parentId: null,
      ownerAgentId: null,
      createdAt: new Date("2026-03-11T00:00:00.000Z"),
      updatedAt: new Date("2026-03-11T00:00:00.000Z"),
    });

    const app = createApp();
    const res = await request(app).post(`/api/companies/${COMPANY_ID}/goals`).send({
      title: "Launch roadmap",
      projectId: PROJECT_ID,
    });

    expect(res.status).toBe(201);
    expect(mockGoalService.create).toHaveBeenCalledWith(
      COMPANY_ID,
      expect.objectContaining({ title: "Launch roadmap", projectId: PROJECT_ID }),
    );
    expect(res.body.projectId).toBe(PROJECT_ID);
  });

  it("rejects project links outside the company", async () => {
    mockProjectService.getById.mockResolvedValue({
      id: "44444444-4444-4444-4444-444444444444",
      companyId: "55555555-5555-5555-5555-555555555555",
    });
    const app = createApp();
    const res = await request(app).post(`/api/companies/${COMPANY_ID}/goals`).send({
      title: "Cross-company",
      projectId: "44444444-4444-4444-4444-444444444444",
    });

    expect(res.status).toBe(422);
    expect(res.body).toEqual({ error: "Invalid projectId for company" });
    expect(mockGoalService.create).not.toHaveBeenCalled();
  });

  it("supports company-scoped goal detail route", async () => {
    mockGoalService.getById.mockResolvedValue({
      id: GOAL_ID,
      companyId: COMPANY_ID,
      title: "Launch roadmap",
      description: null,
      level: "task",
      status: "planned",
      parentId: null,
      ownerAgentId: null,
      createdAt: new Date("2026-03-11T00:00:00.000Z"),
      updatedAt: new Date("2026-03-11T00:00:00.000Z"),
      projectId: PROJECT_ID,
    });

    const app = createApp();
    const res = await request(app).get(`/api/companies/${COMPANY_ID}/goals/${GOAL_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(GOAL_ID);
    expect(res.body.companyId).toBe(COMPANY_ID);
  });

  it("returns 404 on company-scoped goal detail when company does not match", async () => {
    mockGoalService.getById.mockResolvedValue({
      id: GOAL_ID,
      companyId: "55555555-5555-5555-5555-555555555555",
      title: "Launch roadmap",
      description: null,
      level: "task",
      status: "planned",
      parentId: null,
      ownerAgentId: null,
      createdAt: new Date("2026-03-11T00:00:00.000Z"),
      updatedAt: new Date("2026-03-11T00:00:00.000Z"),
      projectId: PROJECT_ID,
    });

    const app = createApp();
    const res = await request(app).get(`/api/companies/${COMPANY_ID}/goals/${GOAL_ID}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Goal not found" });
  });
});
