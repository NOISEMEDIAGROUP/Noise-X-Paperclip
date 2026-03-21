import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCostEventHandler } from "../src/handlers/cost-event.js";

describe("CostEventHandler", () => {
  let mockStripe: any;
  let mockAccounts: any;
  let mockEntities: any;
  let mockState: any;
  let mockLogger: any;
  let handler: ReturnType<typeof createCostEventHandler>;

  beforeEach(() => {
    mockStripe = { sendMeterEvent: vi.fn().mockResolvedValue(undefined) };
    mockAccounts = {
      findByCompanyId: vi.fn().mockResolvedValue({
        externalId: "cus_123",
        data: { status: "active", companyIds: ["comp_1"] },
      }),
    };
    mockEntities = { upsert: vi.fn().mockResolvedValue({ id: "ent_1" }) };
    mockState = { set: vi.fn().mockResolvedValue(undefined) };
    mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    handler = createCostEventHandler(mockStripe, mockAccounts, mockEntities, mockState, mockLogger);
  });

  it("sends meter events for a cost event with a linked billing account", async () => {
    await handler({
      id: "evt_1",
      companyId: "comp_1",
      model: "claude-opus-4-6",
      inputTokens: 1000,
      outputTokens: 500,
      occurredAt: new Date("2026-03-20T12:00:00Z"),
    } as any);

    expect(mockStripe.sendMeterEvent).toHaveBeenCalledTimes(2);
  });

  it("skips when company has no billing account", async () => {
    mockAccounts.findByCompanyId.mockResolvedValue(null);

    await handler({
      id: "evt_2",
      companyId: "comp_2",
      model: "claude-opus-4-6",
      inputTokens: 1000,
      outputTokens: 500,
      occurredAt: new Date("2026-03-20T12:00:00Z"),
    } as any);

    expect(mockStripe.sendMeterEvent).not.toHaveBeenCalled();
  });

  it("stores failed meter event entity on Stripe API error", async () => {
    mockStripe.sendMeterEvent.mockRejectedValue(new Error("Stripe error"));

    await handler({
      id: "evt_3",
      companyId: "comp_1",
      model: "claude-opus-4-6",
      inputTokens: 1000,
      outputTokens: 0,
      occurredAt: new Date("2026-03-20T12:00:00Z"),
    } as any);

    expect(mockEntities.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "failed-meter-event",
      }),
    );
  });
});
