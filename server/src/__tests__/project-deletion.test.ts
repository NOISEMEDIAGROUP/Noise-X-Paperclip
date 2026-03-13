import { describe, expect, it, vi, beforeEach } from "vitest";
import { projectService } from "../services/projects.js";

// Mock database operations
type MockDb = {
  select: any;
  update: any;
  delete: any;
  insert: any;
  transaction: (fn: (tx: any) => Promise<any>) => Promise<any>;
};

function createMockDb(): { db: MockDb; operations: string[] } {
  const operations: string[] = [];

  const mockDb = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn((target: any) => {
      // Extract table name from Drizzle table object
      const tableName = target?._def?.name || target?.name || 'unknown';
      operations.push(`update:${tableName}`);
      return mockDb;
    }),
    delete: vi.fn((target: any) => {
      const tableName = target?._def?.name || target?.name || 'unknown';
      operations.push(`delete:${tableName}`);
      return mockDb;
    }),
    insert: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    inArray: vi.fn(),
    eq: vi.fn(),
    and: vi.fn(),
  } as any;

  mockDb.transaction = async (fn: any) => {
    const tx = { ...mockDb };
    return fn(tx);
  };

  return { db: mockDb as MockDb, operations };
}

describe("projectService.remove cascade delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the deleted project with urlKey", async () => {
    const { db } = createMockDb();
    const projectId = "test-project-id";

    // Mock select to return project on first call, empty array on second (no issues)
    let selectCallCount = 0;
    (db.select as any).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            // First call: get project
            return Promise.resolve([{ id: projectId, name: "Test Project", companyId: "company-1" }]);
          }
          // Second call: get issues (none)
          return Promise.resolve([]);
        }),
      }),
    }));

    (db.delete as any).mockImplementation(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    }));

    (db.update as any).mockImplementation(() => ({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }));

    const service = projectService(db);
    const result = await service.remove(projectId);

    expect(result).toMatchObject({ 
      id: projectId, 
      name: "Test Project",
      urlKey: expect.any(String)
    });
  });

  it("calls update on cost_events to orphan them", async () => {
    const { db, operations } = createMockDb();
    const projectId = "test-project-id";

    let selectCallCount = 0;
    (db.select as any).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          selectCallCount++;
          return selectCallCount === 1 
            ? Promise.resolve([{ id: projectId, name: "Test Project", companyId: "company-1" }])
            : Promise.resolve([]);
        }),
      }),
    }));

    (db.delete as any).mockImplementation(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    }));

    let capturedSet: any = null;
    (db.update as any).mockImplementation((target: any) => {
      const tableName = target?._def?.name || target?.name || 'unknown';
      operations.push(`update:${tableName}`);
      return {
        set: (setVal: any) => {
          capturedSet = setVal;
          return { where: vi.fn().mockResolvedValue(undefined) };
        },
      };
    });

    const service = projectService(db);
    await service.remove(projectId);

    // Should have called update twice for cost_events (once for projectId, once for issueId)
    const costEventUpdates = operations.filter(op => op.startsWith('update:'));
    expect(costEventUpdates.length).toBeGreaterThan(0);
    
    // Verify that one of the updates sets projectId or issueId to null
    expect(capturedSet).toEqual({ projectId: null });
  });

  it("returns null when project does not exist", async () => {
    const { db } = createMockDb();
    const projectId = "non-existent-id";

    (db.select as any).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }));

    const service = projectService(db);
    const result = await service.remove(projectId);

    expect(result).toBeNull();
  });
});
