import fs from "node:fs/promises";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import type { AdapterModel } from "@paperclipai/adapter-utils";
import {
  asNumber,
  asString,
  asStringArray,
  ensureAbsoluteDirectory,
  ensureCommandResolvable,
  ensurePathInEnv,
  runChildProcess,
} from "@paperclipai/adapter-utils/server-utils";
import {
  ensurePicoClawModelConfiguredIfPresent,
  extractPicoClawSummary,
  parsePicoClawModelsOutput,
} from "@paperclipai/adapter-picoclaw-local/server";
import {
  type PicoclawBridgeConfig,
  isCwdAllowed,
  readAuthToken,
} from "./config.js";

interface ExecuteBody {
  prompt?: unknown;
  sessionId?: unknown;
  cwd?: unknown;
  model?: unknown;
  timeoutSec?: unknown;
  graceSec?: unknown;
  extraArgs?: unknown;
  env?: unknown;
}

function json(res: ServerResponse, statusCode: number, body: unknown) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function firstNonEmptyLine(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) ?? "";
}

function normalizeEnv(input: unknown): Record<string, string> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return {};
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value === "string") env[key] = value;
  }
  return env;
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Request body must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

async function discoverModels(config: PicoclawBridgeConfig): Promise<AdapterModel[]> {
  const runtimeEnv = normalizeEnv(ensurePathInEnv({ ...process.env }));
  const result = await runChildProcess(
    `picoclaw-bridge-models-${Date.now()}`,
    config.command,
    ["model"],
    {
      cwd: config.defaultCwd,
      env: runtimeEnv,
      timeoutSec: 20,
      graceSec: 3,
      onLog: async () => {},
    },
  );

  if (result.timedOut) throw new Error("`picoclaw model` timed out.");
  if ((result.exitCode ?? 1) !== 0) {
    throw new Error(firstNonEmptyLine(result.stderr) || firstNonEmptyLine(result.stdout) || "`picoclaw model` failed.");
  }
  return parsePicoClawModelsOutput(result.stdout);
}

async function runExecute(body: ExecuteBody, config: PicoclawBridgeConfig) {
  const prompt = asString(body.prompt, "").trim();
  const sessionId = asString(body.sessionId, "").trim();
  const cwd = path.resolve(asString(body.cwd, config.defaultCwd));
  const model = asString(body.model, "").trim();
  const timeoutSec = asNumber(body.timeoutSec, 0);
  const graceSec = asNumber(body.graceSec, 20);
  const extraArgs = asStringArray(body.extraArgs);
  const env = normalizeEnv(body.env);

  if (!prompt) throw new Error("Missing prompt.");
  if (!sessionId) throw new Error("Missing sessionId.");
  if (!isCwdAllowed(cwd, config)) {
    const roots = config.allowedCwds.join(", ");
    throw new Error(`cwd is outside the allowed roots: ${roots}`);
  }

  await ensureAbsoluteDirectory(cwd, { createIfMissing: true });
  const runtimeEnv = normalizeEnv(ensurePathInEnv({ ...process.env, ...env }));
  await ensureCommandResolvable(config.command, cwd, runtimeEnv);
  await ensurePicoClawModelConfiguredIfPresent({
    model,
    command: config.command,
    cwd,
    env: runtimeEnv,
  });

  const args = ["agent", "--message", prompt, "--session", sessionId];
  if (model) args.push("--model", model);
  if (extraArgs.length > 0) args.push(...extraArgs);

  const result = await runChildProcess(
    `picoclaw-bridge-exec-${Date.now()}`,
    config.command,
    args,
    {
      cwd,
      env: runtimeEnv,
      timeoutSec,
      graceSec,
      onLog: async () => {},
    },
  );

  return {
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    signal: result.signal,
    stdout: result.stdout,
    stderr: result.stderr,
    summary: extractPicoClawSummary(result.stdout),
    sessionId,
    sessionParams: { sessionId, cwd },
    errorMessage:
      result.timedOut
        ? `Timed out after ${timeoutSec}s`
        : (result.exitCode ?? 0) === 0
          ? null
          : firstNonEmptyLine(result.stderr) || firstNonEmptyLine(result.stdout) || `PicoClaw exited with code ${result.exitCode ?? -1}`,
  };
}

async function buildHealth(config: PicoclawBridgeConfig) {
  const runtimeEnv = normalizeEnv(ensurePathInEnv({ ...process.env }));
  const configPresent = await fs.stat(config.configPath).then((stat) => stat.isFile()).catch(() => false);

  let commandAvailable = false;
  let commandError: string | null = null;
  try {
    await ensureCommandResolvable(config.command, config.defaultCwd, runtimeEnv);
    commandAvailable = true;
  } catch (error) {
    commandError = error instanceof Error ? error.message : String(error);
  }

  return {
    status: commandAvailable && configPresent ? "ok" : "degraded",
    picoclawCommand: config.command,
    commandAvailable,
    commandError,
    configPath: config.configPath,
    configPresent,
    defaultCwd: config.defaultCwd,
    allowedCwds: config.allowedCwds,
  };
}

function isAuthorized(req: IncomingMessage, config: PicoclawBridgeConfig): boolean {
  if (!config.authToken) return true;
  return readAuthToken(req.headers) === config.authToken;
}

export function createPicoclawBridgeServer(config: PicoclawBridgeConfig) {
  return http.createServer(async (req, res) => {
    try {
      if (!req.url) {
        json(res, 404, { error: "not_found" });
        return;
      }

      if (!isAuthorized(req, config)) {
        json(res, 401, { error: "unauthorized" });
        return;
      }

      const url = new URL(req.url, `http://${req.headers.host ?? `${config.host}:${config.port}`}`);

      if (req.method === "GET" && url.pathname === "/v1/health") {
        json(res, 200, await buildHealth(config));
        return;
      }

      if (req.method === "GET" && url.pathname === "/v1/models") {
        json(res, 200, { models: await discoverModels(config) });
        return;
      }

      if (req.method === "POST" && url.pathname === "/v1/execute") {
        const body = await readJsonBody(req);
        json(res, 200, await runExecute(body, config));
        return;
      }

      json(res, 404, { error: "not_found" });
    } catch (error) {
      json(res, 400, {
        error: "request_failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

export async function listenPicoclawBridge(config: PicoclawBridgeConfig) {
  const server = createPicoclawBridgeServer(config);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, config.host, () => resolve());
  });
  return server;
}
