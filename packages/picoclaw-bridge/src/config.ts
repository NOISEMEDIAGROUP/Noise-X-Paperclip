import os from "node:os";
import path from "node:path";

export interface PicoclawBridgeConfig {
  host: string;
  port: number;
  authToken: string | null;
  command: string;
  defaultCwd: string;
  configPath: string;
  allowedCwds: string[];
}

function parsePositiveInt(input: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(String(input ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseCommaList(input: string | undefined): string[] {
  return String(input ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => path.resolve(entry));
}

export function resolvePicoclawConfigPath(env: NodeJS.ProcessEnv): string {
  const explicitConfig = env.PICOCLAW_CONFIG?.trim();
  if (explicitConfig) return path.resolve(explicitConfig);

  const explicitHome = env.PICOCLAW_HOME?.trim();
  if (explicitHome) return path.resolve(explicitHome, "config.json");

  return path.join(os.homedir(), ".picoclaw", "config.json");
}

export function resolveBridgeConfig(env: NodeJS.ProcessEnv = process.env): PicoclawBridgeConfig {
  return {
    host: env.PAPERCLIP_PICOCLAW_BRIDGE_HOST?.trim() || "127.0.0.1",
    port: parsePositiveInt(env.PAPERCLIP_PICOCLAW_BRIDGE_PORT, 3210),
    authToken: env.PAPERCLIP_PICOCLAW_BRIDGE_TOKEN?.trim() || null,
    command: env.PAPERCLIP_PICOCLAW_COMMAND?.trim() || "picoclaw",
    defaultCwd: path.resolve(env.PAPERCLIP_PICOCLAW_BRIDGE_CWD?.trim() || process.cwd()),
    configPath: resolvePicoclawConfigPath(env),
    allowedCwds: parseCommaList(env.PAPERCLIP_PICOCLAW_BRIDGE_ALLOWED_CWDS),
  };
}

export function isCwdAllowed(cwd: string, config: PicoclawBridgeConfig): boolean {
  if (config.allowedCwds.length === 0) return true;
  const resolved = path.resolve(cwd);
  return config.allowedCwds.some((root) => {
    const normalizedRoot = path.resolve(root);
    return resolved === normalizedRoot || resolved.startsWith(`${normalizedRoot}${path.sep}`);
  });
}

export function readAuthToken(headers: Record<string, string | string[] | undefined>): string | null {
  const authorization = headers.authorization;
  const rawAuth = Array.isArray(authorization) ? authorization[0] : authorization;
  if (typeof rawAuth === "string") {
    const trimmed = rawAuth.trim();
    const match = trimmed.match(/^bearer\s+(.+)$/i);
    if (match?.[1]?.trim()) return match[1].trim();
    if (trimmed) return trimmed;
  }
  const bridgeToken = headers["x-paperclip-token"];
  const rawBridgeToken = Array.isArray(bridgeToken) ? bridgeToken[0] : bridgeToken;
  return typeof rawBridgeToken === "string" && rawBridgeToken.trim().length > 0
    ? rawBridgeToken.trim()
    : null;
}
