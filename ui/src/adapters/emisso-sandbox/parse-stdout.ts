import type { TranscriptEntry } from "../types";

/**
 * Parse Claude stream-json lines from sandbox output.
 * Reuses the same format as claude-local since the CLI output is identical.
 */
export function parseEmissoSandboxStdoutLine(line: string, ts: string): TranscriptEntry[] {
  // Sandbox log lines from the adapter itself (prefixed with [emisso-sandbox])
  if (line.startsWith("[emisso-sandbox]")) {
    return [{ kind: "system", ts, text: line }];
  }

  // Try to parse as Claude stream-json
  try {
    const event = JSON.parse(line);

    if (event.type === "assistant" && event.message?.content) {
      const entries: TranscriptEntry[] = [];
      for (const block of event.message.content) {
        if (block.type === "thinking" && block.thinking) {
          entries.push({ kind: "thinking", ts, text: block.thinking });
        } else if (block.type === "text" && block.text) {
          entries.push({ kind: "assistant", ts, text: block.text });
        } else if (block.type === "tool_use") {
          entries.push({
            kind: "tool_call",
            ts,
            name: block.name ?? "unknown",
            input: block.input,
            toolUseId: block.id,
          });
        }
      }
      if (entries.length > 0) return entries;
    }

    if (event.type === "user" && event.message?.content) {
      for (const block of event.message.content) {
        if (block.type === "tool_result") {
          const content =
            typeof block.content === "string"
              ? block.content.substring(0, 500)
              : Array.isArray(block.content)
                ? block.content
                    .filter((c: { type: string }) => c.type === "text")
                    .map((c: { text: string }) => c.text)
                    .join("\n")
                    .substring(0, 500)
                : "";
          return [{
            kind: "tool_result",
            ts,
            toolUseId: block.tool_use_id ?? "",
            content,
            isError: block.is_error === true,
          }];
        }
      }
    }

    if (event.type === "result") {
      return [{
        kind: "result",
        ts,
        text: typeof event.result === "string" ? event.result : JSON.stringify(event),
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        costUsd: typeof event.total_cost_usd === "number" ? event.total_cost_usd : 0,
        subtype: "result",
        isError: false,
        errors: [],
      }];
    }
  } catch {
    // Not JSON — treat as raw stdout
  }

  return [{ kind: "stdout", ts, text: line }];
}
