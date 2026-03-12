import type {
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
  AdapterEnvironmentCheck,
} from "@paperclipai/adapter-utils";
import { asString } from "@paperclipai/adapter-utils/server-utils";

function resolveApiUrl(config: Record<string, unknown>): string {
  const explicit = asString(config.apiUrl, "");
  if (explicit) return explicit.replace(/\/+$/, "");
  const network = asString(config.network, "mainnet");
  return network === "testnet"
    ? "https://testnet.blockrun.ai/api"
    : "https://blockrun.ai/api";
}

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const checks: AdapterEnvironmentCheck[] = [];
  const config = ctx.config;
  const apiUrl = resolveApiUrl(config);
  const privateKey = asString(config.privateKey, "");
  const model = asString(config.model, "");
  const network = asString(config.network, "mainnet");

  // ---- Check: network ----
  if (network !== "mainnet" && network !== "testnet") {
    checks.push({
      code: "blockrun_invalid_network",
      level: "error",
      message: `Invalid network "${network}". Must be "mainnet" or "testnet".`,
    });
  } else {
    checks.push({
      code: "blockrun_network",
      level: "info",
      message: `Network: ${network} (${apiUrl})`,
    });
  }

  // ---- Check: private key ----
  if (!privateKey) {
    checks.push({
      code: "blockrun_no_private_key",
      level: "warn",
      message:
        "No private key configured. Only free models (nvidia/gpt-oss-*) will work.",
      hint: "Add a hex private key (0x...) to enable paid models.",
    });
  } else if (!privateKey.startsWith("0x") || privateKey.length !== 66) {
    checks.push({
      code: "blockrun_invalid_private_key",
      level: "error",
      message:
        "Private key must be a 0x-prefixed 64-character hex string (66 chars total).",
      hint: 'Example: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"',
    });
  } else {
    // Derive wallet address to confirm key is valid
    try {
      const { getWalletAddress } = await import("./x402.js");
      const address = getWalletAddress(privateKey);
      checks.push({
        code: "blockrun_wallet",
        level: "info",
        message: `Wallet: ${address}`,
        detail: "Private key is valid and wallet address derived successfully.",
      });
    } catch (err) {
      checks.push({
        code: "blockrun_invalid_private_key",
        level: "error",
        message: `Failed to derive wallet from private key: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // ---- Check: model ----
  if (model && !model.includes("/")) {
    checks.push({
      code: "blockrun_model_format",
      level: "warn",
      message: `Model "${model}" should be in provider/model format (e.g., "openai/gpt-4o").`,
    });
  }

  // ---- Check: API reachability ----
  try {
    const res = await fetch(`${apiUrl}/v1/models`, {
      method: "GET",
      signal: AbortSignal.timeout(10_000),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        data?: unknown[];
        network?: string;
      };
      const modelCount = Array.isArray(data.data)
        ? data.data.length
        : 0;
      checks.push({
        code: "blockrun_api_reachable",
        level: "info",
        message: `BlockRun API reachable. ${modelCount} models available on ${data.network ?? network}.`,
      });
    } else {
      checks.push({
        code: "blockrun_api_error",
        level: "warn",
        message: `BlockRun API returned HTTP ${res.status}.`,
        hint: "The API may be temporarily unavailable. Runs can still be attempted.",
      });
    }
  } catch (err) {
    checks.push({
      code: "blockrun_api_unreachable",
      level: "error",
      message: `Cannot reach BlockRun API at ${apiUrl}: ${err instanceof Error ? err.message : String(err)}`,
      hint: "Check network connectivity and firewall rules. Ensure outbound HTTPS is allowed.",
    });
  }

  // ---- Determine overall status ----
  const hasError = checks.some((c) => c.level === "error");
  const hasWarn = checks.some((c) => c.level === "warn");

  return {
    adapterType: "blockrun",
    status: hasError ? "fail" : hasWarn ? "warn" : "pass",
    checks,
    testedAt: new Date().toISOString(),
  };
}
