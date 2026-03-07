import type { Agent, EnvBinding } from "@paperclipai/shared";

export type ProviderKeySyncConfig = {
  id: string;
  envVars: string[];
};

const ALIBABA_RUNTIME_PROFILE_ID = "alibaba_worker_python";
const ALIBABA_MODEL_PROFILE_IDS = new Set([
  "exec_briefing",
  "engineering_delivery",
  "product_planning",
  "security_review",
  "qa_validation",
]);

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readPlainEnvBinding(binding: EnvBinding | undefined): string {
  if (typeof binding === "string") return binding;
  if (!binding || typeof binding !== "object") return "";
  if ("type" in binding && binding.type === "plain" && typeof binding.value === "string") {
    return binding.value;
  }
  return "";
}

function hasProviderEnvVar(env: Record<string, EnvBinding>, envVars: string[]): boolean {
  return envVars.some((envVar) => Object.prototype.hasOwnProperty.call(env, envVar));
}

function processUsesProvider(agentConfig: Record<string, unknown>, env: Record<string, EnvBinding>, providerId: string): boolean {
  const modelProvider = readPlainEnvBinding(env.MODEL_PROVIDER).trim().toLowerCase();
  if (modelProvider === providerId) return true;

  if (providerId === "alibaba") {
    const runtimeProfile = typeof agentConfig.processRuntimeProfile === "string"
      ? agentConfig.processRuntimeProfile.trim()
      : "";
    if (runtimeProfile === ALIBABA_RUNTIME_PROFILE_ID) return true;
    const modelProfileId = typeof agentConfig.modelProfileId === "string" ? agentConfig.modelProfileId.trim() : "";
    if (ALIBABA_MODEL_PROFILE_IDS.has(modelProfileId)) return true;
  }

  return false;
}

export function isAgentCompatibleForProviderKeySync(agent: Agent, provider: ProviderKeySyncConfig): boolean {
  const adapterConfig = asRecord(agent.adapterConfig);
  const env = asRecord(adapterConfig.env) as Record<string, EnvBinding>;
  const knownEnvReference = hasProviderEnvVar(env, provider.envVars);

  if (provider.id === "anthropic") {
    if (agent.adapterType === "claude_local") return true;
    if (agent.adapterType === "process") {
      return knownEnvReference || processUsesProvider(adapterConfig, env, provider.id);
    }
    return false;
  }

  if (provider.id === "openai") {
    if (agent.adapterType === "codex_local") return true;
    if (agent.adapterType === "process") {
      return knownEnvReference || processUsesProvider(adapterConfig, env, provider.id);
    }
    return false;
  }

  if (provider.id === "alibaba" || provider.id === "groq" || provider.id === "xai" || provider.id === "minimax") {
    if (agent.adapterType !== "process") return false;
    return knownEnvReference || processUsesProvider(adapterConfig, env, provider.id);
  }

  return knownEnvReference;
}
