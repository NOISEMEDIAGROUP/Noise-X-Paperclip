import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { execute } from "../adapters/cerebrouter/execute.js";
import { testEnvironment } from "../adapters/cerebrouter/test.js";
import type { AdapterExecutionContext } from "../adapters/types.js";

function buildCtx(config: Record<string, unknown>): AdapterExecutionContext {
  return {
    runId: "run-1",
    agent: {
      id: "agent-1",
      companyId: "company-1",
      name: "Router Agent",
      adapterType: "cerebrouter",
      adapterConfig: {},
    },
    runtime: {
      sessionId: null,
      sessionParams: null,
      sessionDisplayId: null,
      taskKey: null,
    },
    config,
    context: { wakeReason: "on_demand", issueId: "issue-1" },
    onLog: async () => {},
  };
}

describe("cerebrouter adapter", () => {
  const originalRouterKey = process.env.ROUTER_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.ROUTER_API_KEY;
  });

  afterEach(() => {
    if (originalRouterKey === undefined) {
      delete process.env.ROUTER_API_KEY;
    } else {
      process.env.ROUTER_API_KEY = originalRouterKey;
    }
  });

  it("calls /v1/chat/completions and returns assistant text + usage", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          id: "chatcmpl-1",
          model: "gpt-oss-120b",
          choices: [{ message: { role: "assistant", content: "hello from router" } }],
          usage: { prompt_tokens: 10, completion_tokens: 4 },
        }),
    } as Response);

    const logs: string[] = [];
    const result = await execute({
      ...buildCtx({
        baseUrl: "http://127.0.0.1:7777",
        apiKey: "router-key",
        model: "gpt-oss-120b",
      }),
      onLog: async (_stream, chunk) => {
        logs.push(chunk);
      },
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://127.0.0.1:7777/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.exitCode).toBe(0);
    expect(result.errorMessage).toBeUndefined();
    expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 4 });
    expect(logs.some((line) => line.includes("hello from router"))).toBe(true);
  });

  it("returns explicit error when api key is missing", async () => {
    const result = await execute(
      buildCtx({
        baseUrl: "http://127.0.0.1:7777",
        model: "gpt-oss-120b",
      }),
    );

    expect(result.exitCode).toBe(1);
    expect(result.errorCode).toBe("cerebrouter_api_key_missing");
  });

  it("testEnvironment probes health + models", async () => {
    process.env.ROUTER_API_KEY = "router-key";

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [{ id: "gpt-oss-120b" }] }),
      } as Response);

    const result = await testEnvironment({
      companyId: "company-1",
      adapterType: "cerebrouter",
      config: {
        baseUrl: "http://127.0.0.1:7777",
        model: "gpt-oss-120b",
      },
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.status).toBe("pass");
    expect(result.checks.some((check) => check.code === "cerebrouter_model_available")).toBe(true);
  });
});
