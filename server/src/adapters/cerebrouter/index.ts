import type { ServerAdapterModule } from "../types.js";
import { execute } from "./execute.js";
import { testEnvironment } from "./test.js";

export const cerebrouterAdapter: ServerAdapterModule = {
  type: "cerebrouter",
  execute,
  testEnvironment,
  models: [{ id: "gpt-oss-120b", label: "gpt-oss-120b" }],
  supportsLocalAgentJwt: false,
  agentConfigurationDoc: `# cerebrouter agent configuration

Adapter: cerebrouter

Use when:
- You want Paperclip to route agent prompts through a local Cerebrouter service
- Your router exposes OpenAI-compatible endpoints (/v1/models, /v1/chat/completions)

Core fields:
- baseUrl (string, optional): Cerebrouter base URL. Defaults to CEREBROUTER_BASE_URL or http://127.0.0.1:7777
- apiKey (string, optional): Router API key (Bearer token). If empty, adapter reads apiKeyEnvVar
- apiKeyEnvVar (string, optional): env var for API key. Defaults to ROUTER_API_KEY
- model (string, optional): model id to use. Defaults to gpt-oss-120b
- promptTemplate (string, optional): user message template
- systemPrompt (string, optional): optional system message
- timeoutSec (number, optional): HTTP timeout in seconds. Defaults to 120
- temperature (number, optional): forwarded to /v1/chat/completions
- maxTokens (number, optional): forwarded as max_tokens
`,
};
