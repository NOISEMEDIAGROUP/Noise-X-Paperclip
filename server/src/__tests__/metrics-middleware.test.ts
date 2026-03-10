import { describe, expect, it } from "vitest";
import { createApiMetricsRegistry } from "../middleware/metrics.js";

function createMockResponse(statusCode: number) {
  let finishHandler: (() => void) | null = null;
  return {
    statusCode,
    once(event: string, cb: () => void) {
      if (event === "finish") {
        finishHandler = cb;
      }
    },
    finish() {
      finishHandler?.();
    },
  };
}

describe("createApiMetricsRegistry", () => {
  it("collects request and duration counters", () => {
    const registry = createApiMetricsRegistry();
    const req = {
      path: "/api/companies/123",
      method: "GET",
      actor: { type: "board" },
    } as any;
    const res = createMockResponse(200) as any;

    registry.middleware(req, res, () => {
      // no-op
    });
    res.finish();

    const output = registry.renderPrometheus();
    expect(output).toContain("paperclip_http_requests_total");
    expect(output).toContain('method="GET"');
    expect(output).toContain('route="/api/companies/:int"');
    expect(output).toContain('status="200"');
    expect(output).toContain('actor_type="board"');
    expect(output).toContain("paperclip_http_request_duration_ms_count");
  });

  it("tracks errors separately", () => {
    const registry = createApiMetricsRegistry();
    const req = {
      path: "/api/issues/550e8400-e29b-41d4-a716-446655440000",
      method: "POST",
      actor: { type: "agent" },
    } as any;
    const res = createMockResponse(500) as any;

    registry.middleware(req, res, () => {
      // no-op
    });
    res.finish();

    const output = registry.renderPrometheus();
    expect(output).toContain('method="POST"');
    expect(output).toContain('route="/api/issues/:uuid"');
    expect(output).toContain('status="500"');
    expect(output).toContain('actor_type="agent"');
    expect(output).toMatch(/paperclip_http_request_errors_total\{[^}]+\} 1/);
  });
});
