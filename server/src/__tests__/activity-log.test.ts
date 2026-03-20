import { describe, expect, it, vi, beforeEach } from "vitest";
import { logActivity } from "../services/activity-log.js";

const mockPublishLiveEvent = vi.hoisted(() => vi.fn());

vi.mock("../services/live-events.js", () => ({
  publishLiveEvent: mockPublishLiveEvent,
}));

describe("logActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retries without runId when the referenced heartbeat run is missing", async () => {
    const values = vi.fn()
      .mockRejectedValueOnce({
        code: "23503",
        constraint_name: "activity_log_run_id_heartbeat_runs_id_fk",
      })
      .mockResolvedValueOnce(undefined);
    const insert = vi.fn(() => ({ values }));
    const db = { insert } as any;

    await logActivity(db, {
      companyId: "company-1",
      actorType: "agent",
      actorId: "agent-1",
      action: "agent.updated",
      entityType: "agent",
      entityId: "agent-2",
      runId: "missing-run",
      details: { ok: true },
    });

    expect(values).toHaveBeenCalledTimes(2);
    expect(values.mock.calls[0][0]).toMatchObject({ runId: "missing-run" });
    expect(values.mock.calls[1][0]).toMatchObject({ runId: null });
    expect(mockPublishLiveEvent).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ runId: null }),
    }));
  });

  it("retries without runId when the driver reports the constraint under constraint", async () => {
    const values = vi.fn()
      .mockRejectedValueOnce({
        code: "23503",
        constraint: "activity_log_run_id_heartbeat_runs_id_fk",
      })
      .mockResolvedValueOnce(undefined);
    const insert = vi.fn(() => ({ values }));
    const db = { insert } as any;

    await logActivity(db, {
      companyId: "company-1",
      actorType: "agent",
      actorId: "agent-1",
      action: "agent.updated",
      entityType: "agent",
      entityId: "agent-2",
      runId: "missing-run",
    });

    expect(values).toHaveBeenCalledTimes(2);
    expect(values.mock.calls[0][0]).toMatchObject({ runId: "missing-run" });
    expect(values.mock.calls[1][0]).toMatchObject({ runId: null });
    expect(mockPublishLiveEvent).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ runId: null }),
    }));
  });

  it("rethrows unrelated insert failures", async () => {
    const values = vi.fn().mockRejectedValueOnce(new Error("boom"));
    const insert = vi.fn(() => ({ values }));
    const db = { insert } as any;

    await expect(logActivity(db, {
      companyId: "company-1",
      actorType: "agent",
      actorId: "agent-1",
      action: "agent.updated",
      entityType: "agent",
      entityId: "agent-2",
      runId: "run-1",
    })).rejects.toThrow("boom");

    expect(values).toHaveBeenCalledTimes(1);
    expect(mockPublishLiveEvent).not.toHaveBeenCalled();
  });
});
