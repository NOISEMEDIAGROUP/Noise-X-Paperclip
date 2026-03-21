/**
 * Output parsing helpers for the Emisso Sandbox adapter.
 *
 * Parses Claude Code's stream-json output format to extract
 * token usage, session IDs, cost, model, and summary text.
 *
 * These are adapted from claude-local's parse.ts patterns
 * but simplified for the sandbox context where we only need
 * the final aggregated values (not streaming transcript entries).
 */

import type { TokenUsage } from "./types.js";

// ---------------------------------------------------------------------------
// Stream-json line parser
// ---------------------------------------------------------------------------

export interface ParsedStreamResult {
  /** The final "result" event's JSON, if found. */
  resultJson: Record<string, unknown> | null;
  /** Aggregated token usage from result event. */
  usage: TokenUsage | null;
  /** Session ID from the result event. */
  sessionId: string | null;
  /** Model used (from result event). */
  model: string;
  /** Total cost in USD (from result event). */
  costUsd: number;
  /** Summary text (from result event). */
  summary: string;
}

/**
 * Parse a stream-json stdout blob (newline-delimited JSON events)
 * and extract the aggregated result.
 */
export function parseStreamJsonOutput(stdout: string): ParsedStreamResult {
  const result: ParsedStreamResult = {
    resultJson: null,
    usage: null,
    sessionId: null,
    model: "",
    costUsd: 0,
    summary: "",
  };

  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (event.type === "result") {
        result.resultJson = event;
        result.summary = typeof event.result === "string" ? event.result : "";
        result.sessionId = typeof event.session_id === "string" ? event.session_id : null;
        result.model = typeof event.model === "string" ? event.model : "";
        result.costUsd = typeof event.total_cost_usd === "number" ? event.total_cost_usd : 0;

        // Extract aggregated usage from modelUsage or top-level usage
        if (event.modelUsage && typeof event.modelUsage === "object") {
          let inputTokens = 0;
          let outputTokens = 0;
          let cachedInputTokens = 0;
          for (const model of Object.values(event.modelUsage) as Record<string, number>[]) {
            inputTokens += model.inputTokens ?? 0;
            outputTokens += model.outputTokens ?? 0;
            cachedInputTokens += model.cacheReadInputTokens ?? 0;
          }
          result.usage = { inputTokens, outputTokens, cachedInputTokens: cachedInputTokens || undefined };
        } else if (event.usage) {
          result.usage = {
            inputTokens: event.usage.input_tokens ?? 0,
            outputTokens: event.usage.output_tokens ?? 0,
            cachedInputTokens: event.usage.cache_read_input_tokens || undefined,
          };
        }
      }
    } catch {
      // Non-JSON line — skip
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Git URL helpers (ported from emisso-hq sandbox-service.ts)
// ---------------------------------------------------------------------------

/**
 * Extract "owner-repo" directory name from a clone URL.
 * e.g. "https://github.com/acme/api.git" → "acme-api"
 */
export function extractRepoDirName(url: string): string {
  try {
    const segments = new URL(url).pathname.split("/").filter(Boolean);
    if (segments.length >= 2) {
      const owner = segments[segments.length - 2]!;
      const repo = segments[segments.length - 1]!.replace(/\.git$/, "");
      return `${owner}-${repo}`;
    }
    return segments[0]?.replace(/\.git$/, "") ?? "repo";
  } catch {
    const match = url.match(/\/([^/]+)\/([^/]+?)(?:\.git)?$/);
    return match ? `${match[1]}-${match[2]}` : "repo";
  }
}

/**
 * Embed credentials into an HTTPS git URL.
 */
export function embedGitCredentials(
  url: string,
  auth: { username: string; token: string },
): string {
  try {
    const parsed = new URL(url);
    parsed.username = encodeURIComponent(auth.username);
    parsed.password = encodeURIComponent(auth.token);
    return parsed.toString();
  } catch {
    return url;
  }
}
