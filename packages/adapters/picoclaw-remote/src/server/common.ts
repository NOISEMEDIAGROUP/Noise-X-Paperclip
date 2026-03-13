import path from "node:path";
import type { AdapterSessionCodec } from "@paperclipai/adapter-utils";
import { asNumber, asString, parseObject } from "@paperclipai/adapter-utils/server-utils";

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export const sessionCodec: AdapterSessionCodec = {
  deserialize(raw: unknown) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    const sessionId =
      readNonEmptyString(record.sessionId) ??
      readNonEmptyString(record.session_id) ??
      readNonEmptyString(record.session);
    if (!sessionId) return null;
    const cwd =
      readNonEmptyString(record.cwd) ??
      readNonEmptyString(record.workdir) ??
      readNonEmptyString(record.folder);
    return { sessionId, ...(cwd ? { cwd } : {}) };
  },
  serialize(params: Record<string, unknown> | null) {
    if (!params) return null;
    const sessionId =
      readNonEmptyString(params.sessionId) ??
      readNonEmptyString(params.session_id) ??
      readNonEmptyString(params.session);
    if (!sessionId) return null;
    const cwd =
      readNonEmptyString(params.cwd) ??
      readNonEmptyString(params.workdir) ??
      readNonEmptyString(params.folder);
    return { sessionId, ...(cwd ? { cwd } : {}) };
  },
  getDisplayId(params: Record<string, unknown> | null) {
    if (!params) return null;
    return (
      readNonEmptyString(params.sessionId) ??
      readNonEmptyString(params.session_id) ??
      readNonEmptyString(params.session)
    );
  },
};

export function resolveBridgeUrl(rawUrl: unknown, pathname: string): string {
  const base = asString(rawUrl, "").trim();
  if (!base) throw new Error("PicoClaw remote adapter requires a bridge URL.");
  return new URL(pathname, base.endsWith("/") ? base : `${base}/`).toString();
}

export function buildBridgeHeaders(config: Record<string, unknown>): Record<string, string> {
  const headers = parseObject(config.headers) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string" && key.trim()) out[key] = value;
  }
  const authToken = asString(config.authToken, "").trim();
  if (authToken && !out.authorization) {
    out.authorization = `Bearer ${authToken}`;
  }
  return out;
}

export function buildFetchTimeoutMs(config: Record<string, unknown>, fallbackSeconds: number): number {
  return Math.max(0, asNumber(config.timeoutSec, fallbackSeconds) * 1000);
}

export function canResumeSession(runtimeSessionId: string, runtimeSessionCwd: string, cwd: string): boolean {
  return (
    runtimeSessionId.length > 0 &&
    (runtimeSessionCwd.length === 0 || path.resolve(runtimeSessionCwd) === path.resolve(cwd))
  );
}

export function firstNonEmptyLine(text: string): string {
  return (
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) ?? ""
  );
}
