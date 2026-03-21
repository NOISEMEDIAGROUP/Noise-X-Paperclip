import type { ServerAdapterModule } from "../types.js";
import { execute } from "./execute.js";
import { testEnvironment } from "./test.js";

export const emissoSandboxAdapter: ServerAdapterModule = {
  type: "emisso_sandbox",
  execute,
  testEnvironment,
  models: [
    { id: "claude-opus-4-6", label: "Claude Opus 4.6" },
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { id: "claude-haiku-4-6", label: "Claude Haiku 4.6" },
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  ],
  agentConfigurationDoc: `# emisso_sandbox agent configuration

Adapter: emisso_sandbox

Runs Claude Code inside ephemeral Vercel Sandbox microVMs. Each run gets
a fresh sandbox with the repo cloned, instructions injected, and Claude
CLI executed. The sandbox is destroyed after execution.

Core fields:
- repoUrl (string, optional): Git clone URL. Falls back to workspace context.
- revision (string, optional): Branch/tag to clone. Falls back to workspace context.
- additionalRepos (array, optional): Additional repos to clone alongside primary.
- cloneDepth (number, optional): Shallow clone depth. Default 1.
- model (string, optional): Claude model. Default "claude-sonnet-4-6".
- maxTurns (number, optional): Max agent turns. Default 30.
- timeoutSec (number, optional): Sandbox timeout 10-300s. Default 120.
- vcpus (number, optional): vCPUs 1-8. Default 2.
- instructionsFilePath (string, optional): Path to instructions file (in repo or absolute).
- promptTemplate (string, optional): Run prompt template with {{agent.id}}, {{agent.name}}, etc.
- mcpServers (object, optional): MCP server config. Keys are names, values are { command, args?, env? } or { url }.
- snapshotId (string, optional): Pre-built sandbox snapshot for fast starts.
- networkPolicy (object, optional): { allow?: string[], deny?: string[] }.

Auth fields (resolved from env if not in config):
- anthropicApiKey (string): Or ANTHROPIC_API_KEY env.
- gitToken (string): Or GITHUB_TOKEN env.
- vercelTeamId (string): Or VERCEL_TEAM_ID env.
- vercelProjectId (string): Or VERCEL_PROJECT_ID env.
- vercelToken (string): Or VERCEL_TOKEN env.
`,
};
