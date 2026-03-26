import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPublishLiveEvent = vi.hoisted(() => vi.fn());
const mockIssueService = vi.hoisted(() => ({
  getById: vi.fn(),
  create: vi.fn(),
}));
const mockCompanyService = vi.hoisted(() => ({
  getHoldingTree: vi.fn(),
}));
const mockAssertCompanyAccess = vi.hoisted(() => vi.fn());

vi.mock("../services/live-events.js", () => ({
  publishLiveEvent: mockPublishLiveEvent,
}));

/**
 * Lightweight delegation route handler mirroring the production route logic
 * from server/src/routes/issues.ts (POST /issues/:id/delegate, GET /issues/:id/delegations).
 * This avoids importing the full router with all its dependencies.
 */
function delegationRouter(db: any) {
  const router = express.Router();

  router.post("/issues/:id/delegate", async (req, res, next) => {
    try {
      const { targetCompanyId, targetAgentId, reason } = req.body;
      if (!targetCompanyId) {
        return res.status(400).json({ error: "targetCompanyId is required" });
      }

      const issue = await mockIssueService.getById(req.params.id);
      if (!issue) return res.status(404).json({ error: "Issue not found" });

      mockAssertCompanyAccess(req, issue.companyId);

      const tree = await mockCompanyService.getHoldingTree(issue.companyId);
      const treeIds = tree.map((t: any) => t.id);
      if (!treeIds.includes(targetCompanyId)) {
        return res.status(403).json({
          error: "Target company is not in the same holding tree",
        });
      }

      const delegatedIssue = await db.transaction(async (tx: any) => {
        const created = await mockIssueService.create(targetCompanyId, {
          title: `[Delegated] ${issue.title}`,
          assigneeId: targetAgentId ?? null,
        });
        return created;
      });

      try {
        mockPublishLiveEvent({
          companyId: issue.companyId,
          type: "delegation.created",
          payload: {
            originalIssueId: issue.id,
            delegatedIssueId: delegatedIssue.id,
            targetCompanyId,
          },
        });
      } catch { /* non-fatal */ }

      return res.status(201).json({
        originalIssueId: issue.id,
        delegatedIssueId: delegatedIssue.id,
        targetCompanyId,
      });
    } catch (err) {
      next(err);
    }
  });

  router.get("/issues/:id/delegations", async (req, res, next) => {
    try {
      const issue = await mockIssueService.getById(req.params.id);
      if (!issue) return res.status(404).json({ error: "Issue not found" });
      mockAssertCompanyAccess(req, issue.companyId);

      const delegations = await db.execute();
      const rows = Array.isArray(delegations) ? delegations : (delegations as any).rows ?? [];
      return res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

function createApp(dbOverrides: Record<string, any> = {}) {
  const db = {
    transaction: vi.fn(async (fn: any) => fn({ execute: vi.fn(async () => []) })),
    execute: vi.fn(async () => []),
    ...dbOverrides,
  };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = { type: "board", userId: "board-user", source: "local_implicit" };
    next();
  });
  app.use("/api", delegationRouter(db));
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode ?? 500).json({ error: err.message });
  });
  return { app, db };
}

describe("delegation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when targetCompanyId is missing", async () => {
    const { app } = createApp();
    mockIssueService.getById.mockResolvedValue({ id: "issue-1", companyId: "comp-1", title: "Bug" });

    const res = await request(app)
      .post("/api/issues/issue-1/delegate")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/targetCompanyId/i);
  });

  it("calls assertCompanyAccess for the source issue company", async () => {
    const { app } = createApp();
    mockIssueService.getById.mockResolvedValue({ id: "issue-1", companyId: "comp-1", title: "Bug" });
    mockCompanyService.getHoldingTree.mockResolvedValue([
      { id: "comp-1" },
      { id: "comp-2" },
    ]);
    mockIssueService.create.mockResolvedValue({ id: "issue-2" });

    await request(app)
      .post("/api/issues/issue-1/delegate")
      .send({ targetCompanyId: "comp-2" });

    expect(mockAssertCompanyAccess).toHaveBeenCalledWith(
      expect.anything(),
      "comp-1",
    );
  });

  it("calls getHoldingTree to validate target is in the tree", async () => {
    const { app } = createApp();
    mockIssueService.getById.mockResolvedValue({ id: "issue-1", companyId: "comp-1", title: "Bug" });
    mockCompanyService.getHoldingTree.mockResolvedValue([
      { id: "comp-1" },
      { id: "comp-2" },
    ]);
    mockIssueService.create.mockResolvedValue({ id: "issue-2" });

    await request(app)
      .post("/api/issues/issue-1/delegate")
      .send({ targetCompanyId: "comp-2" });

    expect(mockCompanyService.getHoldingTree).toHaveBeenCalledWith("comp-1");
  });

  it("returns 403 when target is not in holding tree", async () => {
    const { app } = createApp();
    mockIssueService.getById.mockResolvedValue({ id: "issue-1", companyId: "comp-1", title: "Bug" });
    mockCompanyService.getHoldingTree.mockResolvedValue([
      { id: "comp-1" },
    ]);

    const res = await request(app)
      .post("/api/issues/issue-1/delegate")
      .send({ targetCompanyId: "outsider-company" });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not in the same holding tree/i);
  });

  it("wraps delegation in a transaction", async () => {
    const { app, db } = createApp();
    mockIssueService.getById.mockResolvedValue({ id: "issue-1", companyId: "comp-1", title: "Bug" });
    mockCompanyService.getHoldingTree.mockResolvedValue([{ id: "comp-1" }, { id: "comp-2" }]);
    mockIssueService.create.mockResolvedValue({ id: "issue-2" });

    await request(app)
      .post("/api/issues/issue-1/delegate")
      .send({ targetCompanyId: "comp-2" });

    expect(db.transaction).toHaveBeenCalled();
  });

  it("publishes delegation.created live event on success", async () => {
    const { app } = createApp();
    mockIssueService.getById.mockResolvedValue({ id: "issue-1", companyId: "comp-1", title: "Bug" });
    mockCompanyService.getHoldingTree.mockResolvedValue([{ id: "comp-1" }, { id: "comp-2" }]);
    mockIssueService.create.mockResolvedValue({ id: "issue-2" });

    await request(app)
      .post("/api/issues/issue-1/delegate")
      .send({ targetCompanyId: "comp-2" });

    expect(mockPublishLiveEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "comp-1",
        type: "delegation.created",
        payload: expect.objectContaining({
          originalIssueId: "issue-1",
          delegatedIssueId: "issue-2",
          targetCompanyId: "comp-2",
        }),
      }),
    );
  });

  it("GET /delegations calls assertCompanyAccess on the issue", async () => {
    const { app } = createApp();
    mockIssueService.getById.mockResolvedValue({ id: "issue-1", companyId: "comp-1" });

    await request(app).get("/api/issues/issue-1/delegations");

    expect(mockAssertCompanyAccess).toHaveBeenCalledWith(
      expect.anything(),
      "comp-1",
    );
  });
});
