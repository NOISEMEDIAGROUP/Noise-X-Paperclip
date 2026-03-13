import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "@paperclipai/adapter-utils";
import { asString, parseObject } from "@paperclipai/adapter-utils/server-utils";
import { buildBridgeHeaders, resolveBridgeUrl } from "./common.js";

function summarizeStatus(checks: AdapterEnvironmentCheck[]): AdapterEnvironmentTestResult["status"] {
  if (checks.some((check) => check.level === "error")) return "fail";
  if (checks.some((check) => check.level === "warn")) return "warn";
  return "pass";
}

function isLoopbackHost(hostname: string): boolean {
  const value = hostname.trim().toLowerCase();
  return value === "localhost" || value === "127.0.0.1" || value === "::1";
}

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const checks: AdapterEnvironmentCheck[] = [];
  const config = parseObject(ctx.config);
  const urlValue = asString(config.url, "").trim();

  if (!urlValue) {
    checks.push({
      code: "picoclaw_remote_url_missing",
      level: "error",
      message: "PicoClaw remote adapter requires a bridge URL.",
      hint: "Set adapterConfig.url to the Paperclip PicoClaw Bridge base URL.",
    });
    return {
      adapterType: ctx.adapterType,
      status: summarizeStatus(checks),
      checks,
      testedAt: new Date().toISOString(),
    };
  }

  let bridgeUrl: URL | null = null;
  try {
    bridgeUrl = new URL(urlValue);
  } catch {
    checks.push({
      code: "picoclaw_remote_url_invalid",
      level: "error",
      message: `Invalid URL: ${urlValue}`,
    });
  }

  if (bridgeUrl && bridgeUrl.protocol !== "http:" && bridgeUrl.protocol !== "https:") {
    checks.push({
      code: "picoclaw_remote_url_protocol_invalid",
      level: "error",
      message: `Unsupported URL protocol: ${bridgeUrl.protocol}`,
      hint: "Use http:// or https://.",
    });
  }

  if (bridgeUrl) {
    checks.push({
      code: "picoclaw_remote_url_valid",
      level: "info",
      message: `Configured bridge URL: ${bridgeUrl.toString()}`,
    });
    if (bridgeUrl.protocol === "http:" && !isLoopbackHost(bridgeUrl.hostname)) {
      checks.push({
        code: "picoclaw_remote_plaintext_remote_http",
        level: "warn",
        message: "Bridge URL uses plaintext http:// on a non-loopback host.",
        hint: "Prefer https:// for remote bridges.",
      });
    }
  }

  if (bridgeUrl && (bridgeUrl.protocol === "http:" || bridgeUrl.protocol === "https:")) {
    const healthUrl = resolveBridgeUrl(urlValue, "v1/health");
    const headers = buildBridgeHeaders(config);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const configuredModel = asString(config.model, "").trim();
    try {
      const response = await fetch(healthUrl, {
        headers,
        signal: controller.signal,
      });
      const rawBody = await response.text();
      const body = rawBody.trim() ? JSON.parse(rawBody) as Record<string, unknown> : {};
      if (!response.ok) {
        checks.push({
          code: "picoclaw_remote_bridge_unreachable",
          level: "error",
          message: `Bridge health check failed with HTTP ${response.status}.`,
          detail: asString(body.message, rawBody),
        });
      } else {
        checks.push({
          code: "picoclaw_remote_bridge_ok",
          level: "info",
          message: "Bridge health check succeeded.",
        });
        checks.push({
          code: body.commandAvailable === true ? "picoclaw_remote_command_available" : "picoclaw_remote_command_missing",
          level: body.commandAvailable === true ? "info" : "error",
          message: body.commandAvailable === true
            ? `Bridge can execute PicoClaw: ${asString(body.picoclawCommand, "picoclaw")}`
            : asString(body.commandError, "Bridge cannot execute PicoClaw."),
        });
        checks.push({
          code: body.configPresent === true ? "picoclaw_remote_config_found" : "picoclaw_remote_config_missing",
          level: body.configPresent === true ? "info" : "error",
          message: body.configPresent === true
            ? `Bridge found PicoClaw config: ${asString(body.configPath, "")}`
            : `Bridge could not find PicoClaw config: ${asString(body.configPath, "")}`,
        });

        const modelsResponse = await fetch(resolveBridgeUrl(urlValue, "v1/models"), {
          headers,
          signal: controller.signal,
        });
        const rawModels = await modelsResponse.text();
        const modelsBody = rawModels.trim() ? JSON.parse(rawModels) as Record<string, unknown> : {};
        if (modelsResponse.ok) {
          const models = Array.isArray(modelsBody.models)
            ? modelsBody.models.filter((entry): entry is { id: string; label: string } => {
                if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return false;
                return typeof (entry as { id?: unknown }).id === "string";
              })
            : [];
          checks.push({
            code: models.length > 0 ? "picoclaw_remote_models_discovered" : "picoclaw_remote_models_empty",
            level: models.length > 0 ? "info" : "warn",
            message: models.length > 0
              ? `Bridge reported ${models.length} PicoClaw model(s).`
              : "Bridge returned no PicoClaw models.",
          });
          if (configuredModel) {
            checks.push({
              code: models.some((entry) => entry.id === configuredModel)
                ? "picoclaw_remote_model_configured"
                : "picoclaw_remote_model_missing",
              level: models.some((entry) => entry.id === configuredModel) ? "info" : "warn",
              message: models.some((entry) => entry.id === configuredModel)
                ? `Configured model: ${configuredModel}`
                : `Configured model \"${configuredModel}\" was not found on the bridge.`,
            });
          }
        }
      }
    } catch (error) {
      checks.push({
        code: "picoclaw_remote_bridge_probe_failed",
        level: "warn",
        message: error instanceof Error ? error.message : "Bridge probe failed.",
        hint: "Verify the bridge is reachable from the Paperclip server host.",
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
