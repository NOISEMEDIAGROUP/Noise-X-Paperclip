import { describe, expect, it } from "vitest";
import type { Agent } from "@paperclipai/shared";
import { isAgentCompatibleForProviderKeySync } from "./provider-key-sync";

function makeAgent(input: Partial<Agent>): Agent {
  return {
    id: "agent-1",
    companyId: "company-1",
    name: "Agent",
    urlKey: "agent",
    role: "cto",
    title: null,
    icon: null,
    reportsTo: null,
    capabilities: null,
    permissions: { canCreateAgents: false },
    adapterType: "process",
    adapterConfig: {},
    runtimeConfig: {},
    status: "active",
    budgetMonthlyCents: 0,
    spentMonthlyCents: 0,
    lastHeartbeatAt: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...input,
  };
}

describe("provider key sync compatibility", () => {
  it("does not mark generic process agents as Alibaba-compatible", () => {
    const agent = makeAgent({
      adapterType: "process",
      adapterConfig: {
        processRuntimeProfile: "portfolio_audit_script",
        env: {},
      },
    });
    expect(
      isAgentCompatibleForProviderKeySync(agent, {
        id: "alibaba",
        envVars: ["ALIBABA_API_KEY", "DASHSCOPE_API_KEY"],
      }),
    ).toBe(false);
  });

  it("marks Alibaba worker profile as Alibaba-compatible", () => {
    const agent = makeAgent({
      adapterType: "process",
      adapterConfig: {
        processRuntimeProfile: "alibaba_worker_python",
        env: {},
      },
    });
    expect(
      isAgentCompatibleForProviderKeySync(agent, {
        id: "alibaba",
        envVars: ["ALIBABA_API_KEY", "DASHSCOPE_API_KEY"],
      }),
    ).toBe(true);
  });

  it("marks claude_local as Anthropics-compatible", () => {
    const agent = makeAgent({ adapterType: "claude_local" });
    expect(
      isAgentCompatibleForProviderKeySync(agent, {
        id: "anthropic",
        envVars: ["ANTHROPIC_API_KEY"],
      }),
    ).toBe(true);
  });

  it("marks codex_local as OpenAI-compatible", () => {
    const agent = makeAgent({ adapterType: "codex_local" });
    expect(
      isAgentCompatibleForProviderKeySync(agent, {
        id: "openai",
        envVars: ["OPENAI_API_KEY"],
      }),
    ).toBe(true);
  });
});
