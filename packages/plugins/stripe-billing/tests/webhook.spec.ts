import { describe, it, expect, vi, beforeEach } from "vitest";
import { createWebhookHandler } from "../src/handlers/webhook.js";

describe("WebhookHandler", () => {
  let mockStripe: any;
  let mockAccounts: any;
  let mockInvoices: any;
  let mockAgents: any;
  let mockActivity: any;
  let mockLogger: any;
  let mockConfig: any;
  let handler: ReturnType<typeof createWebhookHandler>;

  beforeEach(() => {
    mockStripe = { verifyWebhookSignature: vi.fn().mockReturnValue(true) };
    mockAccounts = {
      getByCustomerId: vi.fn().mockResolvedValue({
        id: "ent_1",
        externalId: "cus_123",
        data: { status: "active", companyIds: ["comp_1"] },
      }),
      update: vi.fn().mockResolvedValue({}),
    };
    mockInvoices = { upsert: vi.fn().mockResolvedValue({}) };
    mockAgents = {
      list: vi.fn().mockResolvedValue([{ id: "agent_1", status: "active" }]),
      pause: vi.fn().mockResolvedValue({ id: "agent_1", status: "paused" }),
      resume: vi.fn().mockResolvedValue({ id: "agent_1", status: "idle" }),
    };
    mockActivity = { log: vi.fn().mockResolvedValue(undefined) };
    mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    mockConfig = { autoSuspendOnPaymentFailure: true, stripeWebhookSecret: "whsec_123" };
    handler = createWebhookHandler(mockStripe, mockAccounts, mockInvoices, mockAgents, mockActivity, mockLogger, mockConfig);
  });

  it("rejects invalid signature", async () => {
    mockStripe.verifyWebhookSignature.mockReturnValue(false);
    await expect(handler({
      endpointKey: "stripe",
      headers: { "stripe-signature": "bad" },
      rawBody: "{}",
      parsedBody: {},
      requestId: "req_1",
    })).rejects.toThrow("Invalid webhook signature");
  });

  it("pauses agents on invoice.payment_failed", async () => {
    await handler({
      endpointKey: "stripe",
      headers: { "stripe-signature": "valid" },
      rawBody: JSON.stringify({
        type: "invoice.payment_failed",
        data: { object: { customer: "cus_123" } },
      }),
      parsedBody: {
        type: "invoice.payment_failed",
        data: { object: { customer: "cus_123" } },
      },
      requestId: "req_2",
    });

    expect(mockAccounts.update).toHaveBeenCalledWith("cus_123", { status: "past_due" });
    expect(mockAgents.pause).toHaveBeenCalled();
  });

  it("resumes agents on invoice.paid", async () => {
    mockAccounts.getByCustomerId.mockResolvedValue({
      externalId: "cus_123",
      data: { status: "past_due", companyIds: ["comp_1"] },
    });
    mockAgents.list.mockResolvedValue([{ id: "agent_1", status: "paused" }]);

    await handler({
      endpointKey: "stripe",
      headers: { "stripe-signature": "valid" },
      rawBody: JSON.stringify({
        type: "invoice.paid",
        data: { object: { customer: "cus_123" } },
      }),
      parsedBody: {
        type: "invoice.paid",
        data: { object: { customer: "cus_123" } },
      },
      requestId: "req_3",
    });

    expect(mockAccounts.update).toHaveBeenCalledWith("cus_123", { status: "active" });
    expect(mockAgents.resume).toHaveBeenCalled();
  });
});
