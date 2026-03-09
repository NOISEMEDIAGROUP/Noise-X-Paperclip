export { execute } from "./execute.js";
export { testEnvironment } from "./test.js";
export {
  parseGeminiStreamJson,
  describeGeminiFailure,
  isGeminiTurnLimitResult,
  isGeminiUnknownSessionError,
} from "./parse.js";
import type { AdapterSessionCodec } from "@paperclipai/adapter-utils";

export const sessionCodec: AdapterSessionCodec = {
  deserialize(raw: unknown) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
    const rec = raw as Record<string, unknown>;
    const sessionId = typeof rec.sessionId === "string" ? rec.sessionId : null;
    if (!sessionId) return null;
    return {
      sessionId,
      ...(typeof rec.cwd === "string" ? { cwd: rec.cwd } : {}),
      ...(typeof rec.workspaceId === "string" ? { workspaceId: rec.workspaceId } : {}),
      ...(typeof rec.repoUrl === "string" ? { repoUrl: rec.repoUrl } : {}),
      ...(typeof rec.repoRef === "string" ? { repoRef: rec.repoRef } : {}),
    };
  },
  serialize(params: Record<string, unknown> | null) {
    if (!params) return null;
    const sessionId = typeof params.sessionId === "string" ? params.sessionId : null;
    if (!sessionId) return null;
    return {
      sessionId,
      ...(typeof params.cwd === "string" ? { cwd: params.cwd } : {}),
      ...(typeof params.workspaceId === "string" ? { workspaceId: params.workspaceId } : {}),
      ...(typeof params.repoUrl === "string" ? { repoUrl: params.repoUrl } : {}),
      ...(typeof params.repoRef === "string" ? { repoRef: params.repoRef } : {}),
    };
  },
  getDisplayId(params: Record<string, unknown> | null) {
    if (!params) return null;
    return typeof params.sessionId === "string" ? params.sessionId : null;
  },
};
