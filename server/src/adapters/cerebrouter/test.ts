import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "../types.js";
import { asString, parseObject } from "../utils.js";

const DEFAULT_BASE_URL = "http://127.0.0.1:7777";
const DEFAULT_MODEL = "gpt-oss-120b";
const DEFAULT_API_KEY_ENV_VAR = "ROUTER_API_KEY";

function summarizeStatus(checks: AdapterEnvironmentCheck[]): AdapterEnvironmentTestResult["status"] {
  if (checks.some((check) => check.level === "error")) return "fail";
  if (checks.some((check) => check.level === "warn")) return "warn";
  return "pass";
}

function normalizeBaseUrl(input: string): string {
  return input.trim().replace(/\/+$/, "");
}

function defaultBaseUrl(): string {
  const fromEnv = process.env.CEREBROUTER_BASE_URL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_BASE_URL;
}

function readApiKey(config: Record<string, unknown>): { apiKey: string; source: string } | null {
  const inline = asString(config.apiKey, "").trim();
  if (inline) return { apiKey: inline, source: "adapterConfig.apiKey" };

  const envVarName = asString(config.apiKeyEnvVar, DEFAULT_API_KEY_ENV_VAR).trim() || DEFAULT_API_KEY_ENV_VAR;
  const fromEnv = process.env[envVarName]?.trim() ?? "";
  if (fromEnv) return { apiKey: fromEnv, source: `env:${envVarName}` };

  return null;
}

function collectModelIds(payload: unknown): string[] {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return [];
  const body = payload as Record<string, unknown>;
  if (!Array.isArray(body.data)) return [];

  const ids: string[] = [];
  for (const entry of body.data) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
    const id = (entry as Record<string, unknown>).id;
    if (typeof id !== "string") continue;
    const trimmed = id.trim();
    if (!trimmed) continue;
    ids.push(trimmed);
  }

  return ids;
}

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const checks: AdapterEnvironmentCheck[] = [];
  const config = parseObject(ctx.config);

  const baseUrl = normalizeBaseUrl(asString(config.baseUrl, asString(config.url, defaultBaseUrl())));
  const model = asString(config.model, DEFAULT_MODEL).trim() || DEFAULT_MODEL;

  if (!baseUrl) {
    checks.push({
      code: "cerebrouter_url_missing",
      level: "error",
      message: "Cerebrouter adapter requires baseUrl (or url).",
      hint: "Set adapterConfig.baseUrl to your Cerebrouter host, e.g. http://127.0.0.1:7777",
    });
    return {
      adapterType: ctx.adapterType,
      status: summarizeStatus(checks),
      checks,
      testedAt: new Date().toISOString(),
    };
  }

  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    checks.push({
      code: "cerebrouter_url_invalid",
      level: "error",
      message: `Invalid Cerebrouter URL: ${baseUrl}`,
      hint: "Use an absolute http(s) URL.",
    });
  }

  if (parsedUrl && parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    checks.push({
      code: "cerebrouter_url_protocol_invalid",
      level: "error",
      message: `Unsupported protocol ${parsedUrl.protocol}`,
      hint: "Use http:// or https://",
    });
  }

  if (parsedUrl) {
    checks.push({
      code: "cerebrouter_url_valid",
      level: "info",
      message: `Configured router URL: ${parsedUrl.toString()}`,
    });
  }

  checks.push({
    code: "cerebrouter_model_configured",
    level: "info",
    message: `Configured model: ${model}`,
  });

  const apiKey = readApiKey(config);
  if (apiKey) {
    checks.push({
      code: "cerebrouter_api_key_present",
      level: "info",
      message: "Router API key is configured.",
      detail: `Source: ${apiKey.source}`,
    });
  } else {
    checks.push({
      code: "cerebrouter_api_key_missing",
      level: "warn",
      message: "Router API key is missing.",
      hint: "Set adapterConfig.apiKey or ROUTER_API_KEY before running heartbeats.",
    });
  }

  if (parsedUrl) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const healthResponse = await fetch(`${parsedUrl.toString().replace(/\/+$/, "")}/health`, {
        method: "GET",
        signal: controller.signal,
      });
      if (healthResponse.ok) {
        checks.push({
          code: "cerebrouter_health_probe_ok",
          level: "info",
          message: "Router /health probe succeeded.",
        });
      } else {
        checks.push({
          code: "cerebrouter_health_probe_status",
          level: "warn",
          message: `Router /health returned HTTP ${healthResponse.status}.`,
        });
      }
    } catch (err) {
      checks.push({
        code: "cerebrouter_health_probe_failed",
        level: "warn",
        message: err instanceof Error ? err.message : "Router /health probe failed",
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  if (parsedUrl && apiKey) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const modelsResponse = await fetch(`${parsedUrl.toString().replace(/\/+$/, "")}/v1/models`, {
        method: "GET",
        headers: {
          authorization: `Bearer ${apiKey.apiKey}`,
        },
        signal: controller.signal,
      });

      if (!modelsResponse.ok) {
        checks.push({
          code: "cerebrouter_models_probe_status",
          level: "warn",
          message: `Router /v1/models returned HTTP ${modelsResponse.status}.`,
          hint: "Verify ROUTER_API_KEY and router upstream connectivity.",
        });
      } else {
        const payload = await modelsResponse.json().catch(() => null);
        const modelIds = collectModelIds(payload);
        if (modelIds.length === 0) {
          checks.push({
            code: "cerebrouter_models_empty",
            level: "warn",
            message: "Router /v1/models returned no model IDs.",
          });
        } else if (!modelIds.includes(model)) {
          checks.push({
            code: "cerebrouter_model_unavailable",
            level: "warn",
            message: `Configured model is not in router catalog: ${model}`,
            hint: `Available sample: ${modelIds.slice(0, 12).join(", ")}${modelIds.length > 12 ? ", ..." : ""}`,
          });
        } else {
          checks.push({
            code: "cerebrouter_model_available",
            level: "info",
            message: `Configured model is available: ${model}`,
          });
        }
      }
    } catch (err) {
      checks.push({
        code: "cerebrouter_models_probe_failed",
        level: "warn",
        message: err instanceof Error ? err.message : "Router /v1/models probe failed",
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    adapterType: ctx.adapterType,
    status: summarizeStatus(checks),
    checks,
    testedAt: new Date().toISOString(),
  };
}
