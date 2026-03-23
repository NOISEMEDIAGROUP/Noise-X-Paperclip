import { beforeEach, describe, expect, it, vi } from "vitest";
import { companyService } from "../services/companies.ts";

function createMockDb() {
  const executeResults: any[] = [];
  const selectResults: any[] = [];

  const orderBy = vi.fn(async () => selectResults.shift() ?? []);
  const innerJoin = vi.fn(() => ({
    where: vi.fn(() => ({ orderBy })),
  }));
  const where = vi.fn(() => ({ orderBy, innerJoin }));
  const from = vi.fn(() => ({ where, innerJoin }));
  const select = vi.fn(() => ({ from }));

  return {
    db: {
      select,
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(async () => []),
          onConflictDoUpdate: vi.fn(() => ({ returning: vi.fn(async () => []) })),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(async () => []),
        })),
      })),
      delete: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
      execute: vi.fn(async () => executeResults.shift() ?? []),
      transaction: vi.fn(async (fn: any) => fn({
        execute: vi.fn(async () => []),
        select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(async () => []) })) })),
        insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn(async () => []) })) })),
        update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => []) })) })),
        delete: vi.fn(() => ({ where: vi.fn(async () => []) })),
      })),
    },
    executeResults,
    selectResults,
    orderBy,
  };
}

describe("companyService — holding tree", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getHoldingTree", () => {
    it("calls db.execute with a recursive CTE", async () => {
      const { db, executeResults } = createMockDb();
      executeResults.push([
        { id: "root", name: "Root Corp", parentCompanyId: null, depth: 0 },
        { id: "child-1", name: "Child A", parentCompanyId: "root", depth: 1 },
      ]);

      const svc = companyService(db as any);
      const tree = await svc.getHoldingTree("root");

      expect(db.execute).toHaveBeenCalled();
      expect(tree).toHaveLength(2);
    });

    it("returns tree nodes with id, name, parentCompanyId, and depth", async () => {
      const { db, executeResults } = createMockDb();
      const treeData = [
        { id: "root", name: "Holding Inc", parentCompanyId: null, depth: 0 },
        { id: "sub-1", name: "Subsidiary A", parentCompanyId: "root", depth: 1 },
        { id: "sub-2", name: "Subsidiary B", parentCompanyId: "root", depth: 1 },
        { id: "grand-1", name: "Grandchild", parentCompanyId: "sub-1", depth: 2 },
      ];
      executeResults.push(treeData);

      const svc = companyService(db as any);
      const tree = await svc.getHoldingTree("root");

      expect(tree).toEqual(treeData);
      expect(tree[0].parentCompanyId).toBeNull();
      expect(tree[0].depth).toBe(0);
      expect(tree[3].depth).toBe(2);
    });

    it("handles rows wrapped in { rows: [...] } format", async () => {
      const { db } = createMockDb();
      const treeData = [
        { id: "root", name: "Root", parentCompanyId: null, depth: 0 },
      ];
      db.execute.mockResolvedValueOnce({ rows: treeData });

      const svc = companyService(db as any);
      const tree = await svc.getHoldingTree("root");

      expect(tree).toEqual(treeData);
    });
  });

  describe("getHoldingRoster", () => {
    it("calls tree CTE then selects agents from tree companies", async () => {
      const { db, executeResults, selectResults } = createMockDb();
      // First execute: tree CTE
      executeResults.push([{ id: "comp-1" }, { id: "comp-2" }]);
      // Then select: agent roster
      selectResults.push([
        {
          id: "agent-1",
          name: "Agent Alpha",
          role: "developer",
          status: "idle",
          adapterType: "claude_local",
          companyId: "comp-1",
          companyName: "Main Corp",
          capabilityTags: ["code"],
          specialty: null,
          currentTaskSummary: null,
        },
      ]);

      const svc = companyService(db as any);
      const roster = await svc.getHoldingRoster("comp-1");

      expect(db.execute).toHaveBeenCalled();
      expect(db.select).toHaveBeenCalled();
      expect(roster).toHaveLength(1);
      expect(roster[0].name).toBe("Agent Alpha");
    });

    it("applies adapterType filter when provided", async () => {
      const { db, executeResults, selectResults } = createMockDb();
      executeResults.push([{ id: "comp-1" }]);
      selectResults.push([]);

      const svc = companyService(db as any);
      await svc.getHoldingRoster("comp-1", { adapterType: "gemini_local" });

      expect(db.execute).toHaveBeenCalled();
      expect(db.select).toHaveBeenCalled();
    });

    it("applies capabilityTag filter (SQL array contains)", async () => {
      const { db, executeResults, selectResults } = createMockDb();
      executeResults.push([{ id: "comp-1" }]);
      selectResults.push([]);

      const svc = companyService(db as any);
      await svc.getHoldingRoster("comp-1", { capabilityTag: "code-review" });

      expect(db.execute).toHaveBeenCalled();
      expect(db.select).toHaveBeenCalled();
    });

    it("applies status filter when provided", async () => {
      const { db, executeResults, selectResults } = createMockDb();
      executeResults.push([{ id: "comp-1" }]);
      selectResults.push([]);

      const svc = companyService(db as any);
      await svc.getHoldingRoster("comp-1", { status: "idle" });

      expect(db.execute).toHaveBeenCalled();
      expect(db.select).toHaveBeenCalled();
    });

    it("returns empty array when tree has no companies", async () => {
      const { db, executeResults } = createMockDb();
      executeResults.push([]);

      const svc = companyService(db as any);
      const roster = await svc.getHoldingRoster("nonexistent");

      expect(roster).toEqual([]);
      // select should NOT be called when tree is empty
      expect(db.select).not.toHaveBeenCalled();
    });

    it("enriches roster entries with default capabilityTags, specialty, currentTaskSummary", async () => {
      const { db, executeResults, selectResults } = createMockDb();
      executeResults.push([{ id: "comp-1" }]);
      selectResults.push([
        {
          id: "agent-1",
          name: "Bare Agent",
          role: "assistant",
          status: "idle",
          adapterType: "claude_local",
          companyId: "comp-1",
          companyName: "Corp",
          capabilityTags: null,
          specialty: null,
          currentTaskSummary: null,
        },
      ]);

      const svc = companyService(db as any);
      const roster = await svc.getHoldingRoster("comp-1");

      expect(roster[0].capabilityTags).toEqual([]);
      expect(roster[0].specialty).toBeNull();
      expect(roster[0].currentTaskSummary).toBeNull();
    });
  });
});
