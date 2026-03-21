/**
 * Environment test for the Emisso Sandbox adapter.
 *
 * Validates that the required auth and configuration is in place
 * before attempting to run agents in Vercel Sandbox.
 */

import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "../types.js";
import { asString, asNumber, parseObject } from "../utils.js";

function summarizeStatus(checks: AdapterEnvironmentCheck[]): AdapterEnvironmentTestResult["status"] {
  if (checks.some((c) => c.level === "error")) return "fail";
  if (checks.some((c) => c.level === "warn")) return "warn";
  return "pass";
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const checks: AdapterEnvironmentCheck[] = [];
  const config = parseObject(ctx.config);

  // --- Anthropic API key ---
  const configApiKey = asString(config.anthropicApiKey, "");
  const envApiKey = process.env.ANTHROPIC_API_KEY ?? "";
  if (isNonEmpty(configApiKey) || isNonEmpty(envApiKey)) {
    const source = isNonEmpty(configApiKey) ? "adapter config" : "environment";
    checks.push({
      code: "sandbox_anthropic_api_key_present",
      level: "info",
      message: `ANTHROPIC_API_KEY detected (source: ${source}).`,
    });
  } else {
    checks.push({
      code: "sandbox_anthropic_api_key_missing",
      level: "error",
      message: "ANTHROPIC_API_KEY is not set. Required for Claude execution in sandbox.",
      hint: "Set ANTHROPIC_API_KEY in the environment or in adapterConfig.anthropicApiKey.",
    });
  }

  // --- Vercel auth ---
  const vercelToken = asString(config.vercelToken, "") || process.env.VERCEL_TOKEN || "";
  const vercelTeamId = asString(config.vercelTeamId, "") || process.env.VERCEL_TEAM_ID || "";
  if (isNonEmpty(vercelToken) && isNonEmpty(vercelTeamId)) {
    checks.push({
      code: "sandbox_vercel_auth_present",
      level: "info",
      message: "Vercel authentication configured (token + team ID).",
    });
  } else if (!isNonEmpty(vercelToken) && !isNonEmpty(vercelTeamId)) {
    checks.push({
      code: "sandbox_vercel_auth_missing",
      level: "warn",
      message: "Vercel authentication not configured. Sandbox creation may rely on OIDC (Vercel-hosted only).",
      hint: "Set VERCEL_TOKEN and VERCEL_TEAM_ID for non-Vercel environments.",
    });
  } else {
    checks.push({
      code: "sandbox_vercel_auth_partial",
      level: "warn",
      message: "Partial Vercel auth: both VERCEL_TOKEN and VERCEL_TEAM_ID are needed.",
      hint: "Set both values in the environment or adapterConfig.",
    });
  }

  // --- Git token ---
  const gitToken = asString(config.gitToken, "") || process.env.GITHUB_TOKEN || "";
  if (isNonEmpty(gitToken)) {
    checks.push({
      code: "sandbox_git_token_present",
      level: "info",
      message: "Git token available for private repo cloning.",
    });
  } else {
    checks.push({
      code: "sandbox_git_token_missing",
      level: "info",
      message: "No git token configured. Only public repos can be cloned.",
      hint: "Set GITHUB_TOKEN in the environment or adapterConfig.gitToken for private repos.",
    });
  }

  // --- Repo URL ---
  const repoUrl = asString(config.repoUrl, "");
  if (isNonEmpty(repoUrl)) {
    checks.push({
      code: "sandbox_repo_url_configured",
      level: "info",
      message: `Repo URL configured: ${repoUrl}`,
    });
  } else {
    checks.push({
      code: "sandbox_repo_url_missing",
      level: "info",
      message: "No repoUrl in adapter config. Will use workspace context at runtime.",
    });
  }

  // --- Sandbox config ---
  const vcpus = asNumber(config.vcpus, 2);
  const timeoutSec = asNumber(config.timeoutSec, 120);
  const model = asString(config.model, "claude-sonnet-4-6");
  const snapshotId = asString(config.snapshotId, "");
  checks.push({
    code: "sandbox_config_summary",
    level: "info",
    message: `Config: ${vcpus} vCPUs, ${timeoutSec}s timeout, model=${model}${snapshotId ? `, snapshot=${snapshotId}` : ""}`,
  });

  // --- MCP servers ---
  const mcpServers = parseObject(config.mcpServers);
  const mcpKeys = Object.keys(mcpServers);
  if (mcpKeys.length > 0) {
    let allValid = true;
    for (const key of mcpKeys) {
      const entry = parseObject(mcpServers[key]);
      if (!isNonEmpty(entry.command) && !isNonEmpty(entry.url)) {
        checks.push({
          code: "sandbox_mcp_server_invalid",
          level: "warn",
          message: `MCP server "${key}" is missing both "command" and "url".`,
          hint: "Each MCP server entry must have a \"command\" (stdio) or \"url\" (SSE).",
        });
        allValid = false;
      }
    }
    if (allValid) {
      checks.push({
        code: "sandbox_mcp_servers_valid",
        level: "info",
        message: `${mcpKeys.length} MCP server(s) configured: ${mcpKeys.join(", ")}`,
      });
    }
  }

  // --- @vercel/sandbox availability ---
  try {
    await import("@vercel/sandbox");
    checks.push({
      code: "sandbox_sdk_available",
      level: "info",
      message: "@vercel/sandbox SDK is installed and importable.",
    });
  } catch {
    checks.push({
      code: "sandbox_sdk_missing",
      level: "error",
      message: "@vercel/sandbox SDK could not be imported.",
      hint: "Run `pnpm add @vercel/sandbox` in the server package.",
    });
  }

  return {
    adapterType: ctx.adapterType,
    status: summarizeStatus(checks),
    checks,
    testedAt: new Date().toISOString(),
  };
}
