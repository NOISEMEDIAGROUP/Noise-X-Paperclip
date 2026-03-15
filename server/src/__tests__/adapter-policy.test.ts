import { describe, expect, it } from "vitest";
import {
  buildAdapterContractRequestPayload,
  buildAdapterContractResponsePayload,
  evaluatePolicyGate,
  normalizeAdapterErrorClass,
  normalizeAdapterRetryClass,
  selectApplicableExecutionPolicy,
  validateAdapterContractPayload,
} from "../services/adapter-policy.ts";

const REQUEST_SCHEMA = {
  type: "object",
  required: ["runId", "companyId", "agentId", "adapterType", "runtime", "config", "context"],
  properties: {
    runId: { type: "string" },
    companyId: { type: "string" },
    agentId: { type: "string" },
    adapterType: { type: "string" },
    runtime: { type: "object" },
    config: { type: "object" },
    context: { type: "object" },
  },
  additionalProperties: true,
} as const;

const RESPONSE_SCHEMA = {
  type: "object",
  required: ["exitCode", "signal", "timedOut"],
  properties: {
    exitCode: { type: ["integer", "null"] },
    signal: { type: ["string", "null"] },
    timedOut: { type: "boolean" },
    errorMessage: { type: ["string", "null"] },
    errorCode: { type: ["string", "null"] },
    usage: { type: ["object", "null"] },
    resultJson: { type: ["object", "null"] },
  },
} as const;

function samplePolicy(input: Partial<{
  id: string;
  companyId: string;
  policyScope: "global" | "role" | "project";
  roleKey: string | null;
  projectId: string | null;
  maxParallelRuns: number;
  maxRetryAttempts: number;
  costPressureThreshold: number;
  errorPressureThreshold: number;
  routeOnPressure: "pause" | "degrade" | "escalate" | "reroute";
  createdAt: Date;
  updatedAt: Date;
}> = {}) {
  return {
    id: input.id ?? "policy-a",
    companyId: input.companyId ?? "company-a",
    policyScope: input.policyScope ?? "global",
    roleKey: input.roleKey ?? null,
    projectId: input.projectId ?? null,
    maxParallelRuns: input.maxParallelRuns ?? 3,
    maxRetryAttempts: input.maxRetryAttempts ?? 1,
    costPressureThreshold: input.costPressureThreshold ?? 0.9,
    errorPressureThreshold: input.errorPressureThreshold ?? 0.25,
    routeOnPressure: input.routeOnPressure ?? "degrade",
    createdAt: input.createdAt ?? new Date("2026-03-13T00:00:00Z"),
    updatedAt: input.updatedAt ?? new Date("2026-03-13T00:00:00Z"),
  };
}

describe("adapter contracts", () => {
  it("blocks invalid request/response payloads via schema validation", () => {
    const contract = {
      requestSchemaJson: REQUEST_SCHEMA,
      responseSchemaJson: RESPONSE_SCHEMA,
    };
    const requestPayload = buildAdapterContractRequestPayload({
      runId: "run-1",
      companyId: "company-a",
      agentId: "agent-a",
      adapterType: "codex_local",
      runtime: {
        sessionId: null,
        taskKey: "issue-1",
      },
      config: { timeoutSec: 30 },
      context: { issueId: "issue-1" },
    });
    const responsePayload = buildAdapterContractResponsePayload({
      exitCode: 0,
      signal: null,
      timedOut: false,
      errorMessage: null,
      errorCode: null,
      usage: null,
      resultJson: { ok: true },
    });

    const requestOk = validateAdapterContractPayload({
      contract,
      payload: requestPayload,
      direction: "request",
    });
    const requestBad = validateAdapterContractPayload({
      contract,
      payload: { ...requestPayload, runId: 123 },
      direction: "request",
    });
    const responseOk = validateAdapterContractPayload({
      contract,
      payload: responsePayload,
      direction: "response",
    });
    const responseBad = validateAdapterContractPayload({
      contract,
      payload: { ...responsePayload, timedOut: "nope" },
      direction: "response",
    });

    expect(requestOk.valid).toBe(true);
    expect(responseOk.valid).toBe(true);
    expect(requestBad.valid).toBe(false);
    expect(responseBad.valid).toBe(false);
  });
});

describe("adapter error/retry normalization", () => {
  it("maps adapter-specific failures into canonical error classes", () => {
    expect(
      normalizeAdapterErrorClass({
        status: "failed",
        errorCode: "openclaw_sse_timeout",
      }),
    ).toBe("timeout");
    expect(
      normalizeAdapterErrorClass({
        status: "failed",
        errorCode: "claude_auth_required",
      }),
    ).toBe("auth");
    expect(
      normalizeAdapterErrorClass({
        status: "failed",
        errorCode: "openclaw_text_required",
      }),
    ).toBe("invalid_request");
    expect(
      normalizeAdapterErrorClass({
        status: "failed",
        errorCode: "tool_contract_response_invalid",
      }),
    ).toBe("tool_contract");
    expect(
      normalizeAdapterErrorClass({
        status: "failed",
        errorCode: "tool_contract_missing",
      }),
    ).toBe("tool_contract");
    expect(
      normalizeAdapterErrorClass({
        status: "failed",
        errorCode: "adapter_failed",
      }),
    ).toBe("runtime");
  });

  it("keeps retry classification deterministic for identical inputs", () => {
    const first = normalizeAdapterRetryClass({
      errorClass: "timeout",
      retryAttempt: 0,
      maxRetryAttempts: 1,
    });
    const second = normalizeAdapterRetryClass({
      errorClass: "timeout",
      retryAttempt: 0,
      maxRetryAttempts: 1,
    });

    expect(first).toBe("retryable");
    expect(second).toBe(first);
    expect(
      normalizeAdapterRetryClass({
        errorClass: "auth",
        retryAttempt: 0,
        maxRetryAttempts: 5,
      }),
    ).toBe("non_retryable");
    expect(
      normalizeAdapterRetryClass({
        errorClass: "rate_limited",
        retryAttempt: 2,
        maxRetryAttempts: 2,
      }),
    ).toBe("exhausted");
  });
});

describe("adapter execution policy routing", () => {
  it("routes on budget/error pressure using configured route", () => {
    const reroutePolicy = samplePolicy({
      routeOnPressure: "reroute",
      costPressureThreshold: 0.5,
      errorPressureThreshold: 0.5,
    });
    const rerouteDecision = evaluatePolicyGate({
      policy: reroutePolicy,
      activeRuns: 0,
      retryAttempt: 0,
      pressure: {
        monthSpendCents: 600,
        monthBudgetCents: 1000,
        costPressureRatio: 0.6,
        errorPressureRatio: 0.1,
      },
    });
    expect(rerouteDecision.allowed).toBe(false);
    expect(rerouteDecision.routeAction).toBe("reroute");
    expect(rerouteDecision.reasonCode).toBe("pressure_threshold_exceeded");

    const degradePolicy = samplePolicy({
      routeOnPressure: "degrade",
      costPressureThreshold: 0.5,
      errorPressureThreshold: 0.5,
    });
    const degradeDecision = evaluatePolicyGate({
      policy: degradePolicy,
      activeRuns: 0,
      retryAttempt: 0,
      pressure: {
        monthSpendCents: 600,
        monthBudgetCents: 1000,
        costPressureRatio: 0.6,
        errorPressureRatio: 0.1,
      },
    });
    expect(degradeDecision.allowed).toBe(true);
    expect(degradeDecision.degraded).toBe(true);
    expect(degradeDecision.routeAction).toBe("degrade");
  });
});

describe("policy scope selection", () => {
  it("prevents cross-company leakage and prefers project > role > global", () => {
    const selected = selectApplicableExecutionPolicy({
      policies: [
        samplePolicy({
          id: "global-a",
          companyId: "company-a",
          policyScope: "global",
          updatedAt: new Date("2026-03-12T00:00:00Z"),
        }),
        samplePolicy({
          id: "role-a",
          companyId: "company-a",
          policyScope: "role",
          roleKey: "qa_reviewer",
          updatedAt: new Date("2026-03-13T00:00:00Z"),
        }),
        samplePolicy({
          id: "project-a",
          companyId: "company-a",
          policyScope: "project",
          projectId: "project-1",
          updatedAt: new Date("2026-03-13T01:00:00Z"),
        }),
        samplePolicy({
          id: "role-b",
          companyId: "company-b",
          policyScope: "role",
          roleKey: "qa_reviewer",
          updatedAt: new Date("2026-03-14T00:00:00Z"),
        }),
      ],
      companyId: "company-a",
      roleKey: "qa_reviewer",
      projectId: "project-1",
    });

    expect(selected?.companyId).toBe("company-a");
    expect(selected?.id).toBe("project-a");
  });
});

describe("determinism regression harness", () => {
  it("keeps normalized response payload shape stable across adapters", () => {
    const contract = {
      requestSchemaJson: REQUEST_SCHEMA,
      responseSchemaJson: RESPONSE_SCHEMA,
    };
    const adapterTypes = ["claude_local", "codex_local", "cursor", "openclaw", "opencode_local"];
    const shapes = adapterTypes.map((adapterType, idx) => {
      const payload = buildAdapterContractResponsePayload({
        exitCode: idx === 0 ? 0 : 1,
        signal: null,
        timedOut: false,
        errorMessage: idx === 0 ? null : "adapter failed",
        errorCode: idx === 0 ? null : "adapter_failed",
        usage: idx === 0 ? { inputTokens: 10, outputTokens: 4 } : undefined,
        provider: "test-provider",
        model: `${adapterType}-model`,
        resultJson: { adapterType, deterministic: true },
      });
      const validation = validateAdapterContractPayload({
        contract,
        payload,
        direction: "response",
      });
      expect(validation.valid).toBe(true);
      return Object.keys(payload).sort();
    });

    for (const shape of shapes) {
      expect(shape).toEqual(shapes[0]);
    }
  });
});