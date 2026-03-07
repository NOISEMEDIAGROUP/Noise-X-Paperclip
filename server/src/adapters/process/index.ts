import type { ServerAdapterModule } from "../types.js";
import { execute } from "./execute.js";
import { testEnvironment } from "./test.js";

export const processAdapter: ServerAdapterModule = {
  type: "process",
  execute,
  testEnvironment,
  supportsLocalAgentJwt: true,
  models: [],
  agentConfigurationDoc: `# process agent configuration

Adapter: process

Core fields:
- command (string, required): command to execute
- args (string[] | string, optional): command arguments
- cwd (string, optional): absolute working directory
- env (object, optional): KEY=VALUE environment variables

Operational fields:
- timeoutSec (number, optional): run timeout in seconds
- graceSec (number, optional): SIGTERM grace period in seconds

Runtime-injected env vars:
- PAPERCLIP_AGENT_ID
- PAPERCLIP_COMPANY_ID
- PAPERCLIP_API_URL
- PAPERCLIP_RUN_ID
- PAPERCLIP_TASK_ID (when run is tied to an issue/task)
- PAPERCLIP_API_KEY (local agent JWT unless explicitly set in adapter env)
`,
};
