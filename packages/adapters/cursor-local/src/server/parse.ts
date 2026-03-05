import {
  asString,
  asNumber,
  parseObject,
  parseJson,
} from "@paperclipai/adapter-utils/server-utils";

export function parseCursorJsonl(stdout: string) {
  let sessionId: string | null = null;
  const assistantTexts: string[] = [];
  let summary: string | null = null;
  let errorMessage: string | null = null;
  const usage = {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
  };

  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const event = parseJson(line);
    if (!event) continue;

    const type = asString(event.type, "");

    if (type === "system" && asString(event.subtype, "") === "init") {
      const sid = asString(event.session_id, "");
      if (sid) sessionId = sid;
      continue;
    }

    if (type === "assistant") {
      const message = parseObject(event.message);
      const content = Array.isArray(message.content) ? message.content : [];
      for (const part of content) {
        const rec = parseObject(part);
        if (asString(rec.type, "") === "text") {
          const text = asString(rec.text, "").trim();
          if (text) assistantTexts.push(text);
        }
      }
      continue;
    }

    if (type === "result") {
      const sid = asString(event.session_id, "");
      if (sid) sessionId = sid;
      summary = asString(event.result, "").trim();
      const durationMs = asNumber(event.duration_ms, 0);
      if (durationMs > 0) {
        // Cursor may expose token counts in result; map if present
        const usageObj = parseObject(event.usage);
        if (usageObj && Object.keys(usageObj).length > 0) {
          usage.inputTokens = asNumber(usageObj.input_tokens, usage.inputTokens);
          usage.cachedInputTokens = asNumber(
            usageObj.cached_input_tokens,
            usage.cachedInputTokens,
          );
          usage.outputTokens = asNumber(usageObj.output_tokens, usage.outputTokens);
        }
      }
      continue;
    }

    if (type === "error") {
      const msg = asString(event.message, asString(event.error, "")).trim();
      if (msg) errorMessage = msg;
    }
  }

  return {
    sessionId,
    summary: summary ?? assistantTexts.join("\n\n").trim(),
    usage,
    errorMessage,
  };
}

export function isCursorUnknownSessionError(stdout: string, stderr: string): boolean {
  const haystack = `${stdout}\n${stderr}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
  return /session\s+not\s+found|unknown\s+session|invalid\s+session/i.test(haystack);
}
