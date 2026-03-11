import type { AdapterExecutionContext, AdapterExecutionResult, UsageSummary } from "../types.js";
import { asNumber, asString, parseObject, renderTemplate } from "../utils.js";

const DEFAULT_BASE_URL = "http://127.0.0.1:7777";
const DEFAULT_MODEL = "gpt-oss-120b";
const DEFAULT_API_KEY_ENV_VAR = "ROUTER_API_KEY";
const DEFAULT_TIMEOUT_SEC = 120;

const DEFAULT_PROMPT_TEMPLATE = [
  "You are agent {{agent.name}} ({{agent.id}}) for company {{agent.companyId}}.",
  "Run ID: {{runId}}.",
  "",
  "Execution context:",
  "{{contextJson}}",
].join("\n");

function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim();
  return trimmed.replace(/\/+$/, "");
}

function defaultBaseUrl(): string {
  const fromEnv = process.env.CEREBROUTER_BASE_URL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_BASE_URL;
}

function coerceMessageContent(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";

  const parts: string[] = [];
  for (const entry of value) {
    if (typeof entry === "string") {
      parts.push(entry);
      continue;
    }
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
    const item = entry as Record<string, unknown>;
    if (typeof item.text === "string") {
      parts.push(item.text);
      continue;
    }
    if (typeof item.content === "string") {
      parts.push(item.content);
      continue;
    }
  }

  return parts.join("\n");
}

function extractAssistantText(payload: Record<string, unknown>): string {
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  if (choices.length > 0) {
    const first = choices[0];
    if (typeof first === "object" && first !== null && !Array.isArray(first)) {
      const choice = first as Record<string, unknown>;
      const directText = typeof choice.text === "string" ? choice.text : "";
      if (directText.trim()) return directText;
      if (typeof choice.message === "object" && choice.message !== null && !Array.isArray(choice.message)) {
        const message = choice.message as Record<string, unknown>;
        const content = coerceMessageContent(message.content);
        if (content.trim()) return content;
      }
    }
  }

  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  return "";
}

function extractUsage(payload: Record<string, unknown>): UsageSummary | null {
  const usage = parseObject(payload.usage);
  const inputTokens = asNumber(usage.prompt_tokens, 0);
  const outputTokens = asNumber(usage.completion_tokens, 0);
  const cachedInputTokens = asNumber(usage.cached_tokens, 0);

  if (inputTokens === 0 && outputTokens === 0 && cachedInputTokens === 0) {
    return null;
  }

  return {
    inputTokens,
    outputTokens,
    ...(cachedInputTokens > 0 ? { cachedInputTokens } : {}),
  };
}

function extractErrorDetail(rawBody: string): string {
  const trimmed = rawBody.trim();
  if (!trimmed) return "";

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (typeof parsed.detail === "string" && parsed.detail.trim()) return parsed.detail.trim();
    if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message.trim();
    if (typeof parsed.error === "string" && parsed.error.trim()) return parsed.error.trim();
    if (typeof parsed.error === "object" && parsed.error !== null) {
      const errObj = parsed.error as Record<string, unknown>;
      if (typeof errObj.message === "string" && errObj.message.trim()) return errObj.message.trim();
      if (typeof errObj.detail === "string" && errObj.detail.trim()) return errObj.detail.trim();
    }
  } catch {
    // ignore parse failures
  }

  return trimmed.length > 240 ? `${trimmed.slice(0, 239)}…` : trimmed;
}

function summarize(text: string, fallback: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;
  return normalized.length > 220 ? `${normalized.slice(0, 219)}…` : normalized;
}

function resolveApiKey(config: Record<string, unknown>): { apiKey: string; source: string } | null {
  const inline = asString(config.apiKey, "").trim();
  if (inline) return { apiKey: inline, source: "adapterConfig.apiKey" };

  const envVarName = asString(config.apiKeyEnvVar, DEFAULT_API_KEY_ENV_VAR).trim() || DEFAULT_API_KEY_ENV_VAR;
  const fromEnv = process.env[envVarName]?.trim() ?? "";
  if (fromEnv) return { apiKey: fromEnv, source: `env:${envVarName}` };

  return null;
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { config, runId, agent, context, onLog, onMeta } = ctx;
  const parsedConfig = parseObject(config);

  const baseUrl = normalizeBaseUrl(
    asString(parsedConfig.baseUrl, asString(parsedConfig.url, defaultBaseUrl())),
  );
  if (!baseUrl) {
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorCode: "cerebrouter_url_missing",
      errorMessage: "Cerebrouter adapter requires baseUrl (or url).",
    };
  }

  const apiKeyResolved = resolveApiKey(parsedConfig);
  if (!apiKeyResolved) {
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorCode: "cerebrouter_api_key_missing",
      errorMessage: "Cerebrouter API key is missing. Set adapterConfig.apiKey or ROUTER_API_KEY.",
    };
  }

  const model = asString(parsedConfig.model, DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const endpoint = `${baseUrl}/v1/chat/completions`;
  const systemPrompt = asString(parsedConfig.systemPrompt, "").trim();
  const promptTemplate = asString(parsedConfig.promptTemplate, DEFAULT_PROMPT_TEMPLATE);
  const timeoutSec = Math.max(1, asNumber(parsedConfig.timeoutSec, DEFAULT_TIMEOUT_SEC));
  const temperature =
    typeof parsedConfig.temperature === "number" && Number.isFinite(parsedConfig.temperature)
      ? parsedConfig.temperature
      : null;
  const maxTokens =
    typeof parsedConfig.maxTokens === "number" && Number.isFinite(parsedConfig.maxTokens)
      ? Math.max(1, Math.floor(parsedConfig.maxTokens))
      : null;

  const prompt = renderTemplate(promptTemplate, {
    runId,
    agent,
    context,
    contextJson: JSON.stringify(context, null, 2),
  }).trim();

  if (!prompt) {
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorCode: "cerebrouter_prompt_empty",
      errorMessage: "Rendered prompt is empty. Provide adapterConfig.promptTemplate.",
    };
  }

  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const payload: Record<string, unknown> = {
    model,
    stream: false,
    messages,
  };
  if (temperature !== null) payload.temperature = temperature;
  if (maxTokens !== null) payload.max_tokens = maxTokens;

  if (onMeta) {
    await onMeta({
      adapterType: "cerebrouter",
      command: `POST ${endpoint}`,
      commandNotes: [`model=${model}`, `auth=${apiKeyResolved.source}`],
      prompt,
      context: {
        timeoutSec,
        payload,
      },
    });
  }

  await onLog("stderr", `[cerebrouter] POST ${endpoint} model=${model}\n`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutSec * 1000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKeyResolved.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const rawBody = await response.text();
    const detail = extractErrorDetail(rawBody);

    if (!response.ok) {
      return {
        exitCode: response.status,
        signal: null,
        timedOut: false,
        errorCode: "cerebrouter_http_error",
        errorMessage: `Cerebrouter request failed with HTTP ${response.status}${detail ? `: ${detail}` : ""}`,
        resultJson: {
          status: response.status,
          endpoint,
          model,
          detail: detail || null,
        },
      };
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return {
        exitCode: 1,
        signal: null,
        timedOut: false,
        errorCode: "cerebrouter_invalid_json",
        errorMessage: "Cerebrouter returned non-JSON response.",
        resultJson: {
          endpoint,
          model,
          body: rawBody.length > 2000 ? `${rawBody.slice(0, 1999)}…` : rawBody,
        },
      };
    }

    const assistantText = extractAssistantText(parsed).trim();
    if (assistantText) {
      await onLog("stdout", `${assistantText}\n`);
    }

    const usage = extractUsage(parsed);
    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      usage: usage ?? undefined,
      provider: "cerebrouter",
      model,
      billingType: "api",
      summary: summarize(assistantText, `Cerebrouter response from ${model}`),
      resultJson: {
        id: typeof parsed.id === "string" ? parsed.id : null,
        model: typeof parsed.model === "string" ? parsed.model : model,
        raw: parsed,
      },
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        exitCode: null,
        signal: null,
        timedOut: true,
        errorCode: "cerebrouter_timeout",
        errorMessage: `Timed out after ${timeoutSec}s calling ${endpoint}`,
      };
    }

    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorCode: "cerebrouter_request_failed",
      errorMessage: err instanceof Error ? err.message : String(err),
      resultJson: {
        endpoint,
        model,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}
