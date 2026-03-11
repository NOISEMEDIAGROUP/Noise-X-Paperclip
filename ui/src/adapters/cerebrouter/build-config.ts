import type { CreateConfigValues } from "../../components/AgentConfigForm";

const DEFAULT_BASE_URL = "http://127.0.0.1:7777";
const DEFAULT_MODEL = "gpt-oss-120b";

export function buildCerebrouterConfig(v: CreateConfigValues): Record<string, unknown> {
  const ac: Record<string, unknown> = {
    baseUrl: (v.url || DEFAULT_BASE_URL).trim(),
    model: (v.model || DEFAULT_MODEL).trim(),
    timeoutSec: 120,
    apiKeyEnvVar: "ROUTER_API_KEY",
  };

  if (v.apiKey.trim()) {
    ac.apiKey = v.apiKey.trim();
  }

  if (v.promptTemplate.trim()) {
    ac.promptTemplate = v.promptTemplate.trim();
  }

  return ac;
}
