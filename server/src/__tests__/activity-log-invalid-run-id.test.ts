import { beforeEach, describe, expect, it, vi } from "vitest";
import { logActivity } from "../services/activity-log.js";

const mockPublishLiveEvent = vi.hoisted(() => vi.fn());

vi.mock("../services/live-events.js", () => ({
  publishLiveEvent: mockPublishLiveEvent,
}));

function createDbStub(runExists: boolean) {
  const inserted: unknown[] = [];

  // Chain for select().from().where().then()
  const thenFn = vi.fn((cb: (rows: unknown[]) => unknown) =>
    Promise.resolve(cb(runExists ? [{ id: "run-1" }] : [])),
  );
  const where = vi.fn(() => ({ then: thenFn }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));

  // Chain for insert().values()
  const values = vi.fn(async (row: unknown) => {
    inserted.push(row);
  });
  const insert = vi.fn(() => ({ values }));

  return { db: { select, insert } as any, inserted, values };
}

describe("logActivity run_id validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("nulls out a runId that does not exist in heartbeat_runs", async () => {
    const { db, values } = createDbStub(false);

    await logActivity(db, {
      companyId: "company-1",
      actorType: "agent",
      actorId: "agent-1",
      action: "issue.updated",
      entityType: "issue",
      entityId: "issue-1",
      runId: "nonexistent-run-id",
    });

    const inserted = (values.mock.calls[0] as any)[0];
    expect(inserted.runId).toBeNull();
  });

  it("preserves a runId that exists in heartbeat_runs", async () => {
    const { db, values } = createDbStub(true);

    await logActivity(db, {
      companyId: "company-1",
      actorType: "agent",
      actorId: "agent-1",
      action: "issue.updated",
      entityType: "issue",
      entityId: "issue-1",
      runId: "run-1",
    });

    const inserted = (values.mock.calls[0] as any)[0];
    expect(inserted.runId).toBe("run-1");
  });

  it("passes null through without querying heartbeat_runs", async () => {
    const { db, values } = createDbStub(false);

    await logActivity(db, {
      companyId: "company-1",
      actorType: "agent",
      actorId: "agent-1",
      action: "issue.updated",
      entityType: "issue",
      entityId: "issue-1",
      runId: null,
    });

    const inserted = (values.mock.calls[0] as any)[0];
    expect(inserted.runId).toBeNull();
    // select should not have been called since runId was null
    expect((db.select as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });
});
