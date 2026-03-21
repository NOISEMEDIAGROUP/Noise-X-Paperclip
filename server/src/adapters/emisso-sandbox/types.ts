/**
 * Types for the Emisso Sandbox adapter.
 *
 * Runs Claude Code inside ephemeral Vercel Sandbox microVMs.
 * Ported from emisso-hq's VercelSandboxService, adapted for the
 * Paperclip adapter execution model (heartbeat loop, issue assignment).
 */

// ---------------------------------------------------------------------------
// Adapter configuration (stored in agent.adapterConfig)
// ---------------------------------------------------------------------------

export interface EmissoSandboxConfig {
  // Repo (from workspace context or explicit override)
  repoUrl?: string;
  revision?: string;
  additionalRepos?: Array<{ repoUrl: string; dirName?: string }>;
  cloneDepth?: number;

  // Execution
  model?: string;
  maxTurns?: number;
  timeoutSec?: number;
  vcpus?: number;
  instructionsFilePath?: string;
  promptTemplate?: string;

  // MCP servers (same shape as claude-local)
  mcpServers?: Record<
    string,
    {
      command?: string;
      url?: string;
      args?: string[];
      env?: Record<string, string>;
    }
  >;

  // Sandbox infra
  snapshotId?: string;
  networkPolicy?: { allow?: string[]; deny?: string[] };

  // Auth (resolved from env if not in config)
  anthropicApiKey?: string;
  gitToken?: string;
  vercelTeamId?: string;
  vercelProjectId?: string;
  vercelToken?: string;
}

// ---------------------------------------------------------------------------
// Internal session state
// ---------------------------------------------------------------------------

export type SandboxPhase =
  | "creating"
  | "cloning"
  | "installing"
  | "running"
  | "parsing"
  | "completed"
  | "failed"
  | "timed_out";

// ---------------------------------------------------------------------------
// Token usage (from Claude stream-json parsing)
// ---------------------------------------------------------------------------

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
}
