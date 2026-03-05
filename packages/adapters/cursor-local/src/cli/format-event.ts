import pc from "picocolors";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function extractAssistantText(message: unknown): string {
  const rec = asRecord(message);
  if (!rec) return "";
  const content = Array.isArray(rec.content) ? rec.content : [];
  const parts: string[] = [];
  for (const part of content) {
    const p = asRecord(part);
    if (p && asString(p.type) === "text") parts.push(asString(p.text));
  }
  return parts.join("").trim();
}

export function printCursorStreamEvent(raw: string, debug: boolean): void {
  const line = raw.trim();
  if (!line) return;

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(line) as Record<string, unknown>;
  } catch {
    if (debug) console.log(pc.gray(line));
    return;
  }

  const type = asString(parsed.type);

  if (type === "system" && asString(parsed.subtype) === "init") {
    const sessionId = asString(parsed.session_id, asString(parsed.sessionId));
    const model = asString(parsed.model);
    const cwd = asString(parsed.cwd);
    const parts = [sessionId ? `session: ${sessionId}` : "", model ? `model: ${model}` : "", cwd ? `cwd: ${cwd}` : ""].filter(Boolean);
    console.log(pc.blue(`init${parts.length ? ` (${parts.join(", ")})` : ""}`));
    return;
  }

  if (type === "user") {
    const text = asString(parsed.message);
    if (text) console.log(pc.cyan(`user: ${text}`));
    return;
  }

  if (type === "assistant") {
    const text = extractAssistantText(parsed.message);
    if (text) console.log(pc.green(`assistant: ${text}`));
    return;
  }

  if (type === "tool_call") {
    const name = Object.keys(parsed).find((k) => k.endsWith("ToolCall")) ?? "tool_call";
    const input = (parsed[name] as Record<string, unknown>) ?? parsed;
    console.log(pc.yellow(`tool_call: ${name}`));
    try {
      console.log(pc.gray(JSON.stringify(input, null, 2)));
    } catch {
      console.log(pc.gray(String(input)));
    }
    return;
  }

  if (type === "result") {
    const result = asString(parsed.result);
    const durationMs = typeof parsed.duration_ms === "number" ? parsed.duration_ms : 0;
    console.log(pc.blue(`result${durationMs ? ` (${durationMs}ms)` : ""}`));
    if (result) console.log(pc.gray(result));
    return;
  }

  if (debug) console.log(pc.gray(line));
}
