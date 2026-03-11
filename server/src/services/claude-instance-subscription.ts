import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs/promises";
import type {
  InstanceClaudeAuthSession,
  InstanceClaudeConnectionProbeResult,
  InstanceClaudeSubscriptionAuthResponse,
  InstanceClaudeSubscriptionStatus,
} from "@paperclipai/shared";
import {
  runChildProcess as runInteractiveChildProcess,
} from "@paperclipai/adapter-utils/server-utils";
import { appendWithCap, ensureCommandResolvable, ensurePathInEnv, runChildProcess } from "../adapters/utils.js";
import { loadConfig } from "../config.js";
import { logger } from "../middleware/logger.js";
import { resolveClaudeSharedSubscriptionHome } from "./instance-agent-auth.js";

const CLAUDE_COMMAND = "claude";
const CLAUDE_AUTH_REQUIRED_RE =
  /(?:not\s+logged\s+in|please\s+log\s+in|please\s+run\s+`?claude(?:\s+auth)?\s+login`?|login\s+required|requires\s+login|unauthorized|authentication\s+required)/i;
const CLAUDE_AUTH_CODE_PROMPT_RE = /Paste code here if prompted\s*>\s*$/im;
const URL_RE = /https?:\/\/[^\s'"`<>()[\]{}]+/gi;
const ANSI_RE = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;

type MutableClaudeAuthSession = InstanceClaudeAuthSession;
type MutableClaudeSubscriptionStatus = InstanceClaudeSubscriptionStatus;

let currentSession: MutableClaudeAuthSession = {
  state: "idle",
  loginUrl: null,
  awaitingManualCode: false,
  manualCodePrompt: null,
  codeSubmittedAt: null,
  promptDetectedAt: null,
  codeDeliveryState: "idle",
  codeDeliveryError: null,
  codeDeliveryAttemptCount: 0,
  lastCodeDeliveryAttemptAt: null,
  lastActivityAt: null,
  startedAt: null,
  finishedAt: null,
  exitCode: null,
  signal: null,
  stdout: "",
  stderr: "",
};

let activeChild: ChildProcess | null = null;
let lastKnownStatus: MutableClaudeSubscriptionStatus | null = null;
let queuedManualCode: string | null = null;
let manualCodeWriteInFlight = false;
let manualCodeRetryTimer: NodeJS.Timeout | null = null;

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\"'\"'`)}'`;
}

function shellQuoteCommand(parts: string[]): string {
  return parts.map(shellQuote).join(" ");
}

function cloneSession(): InstanceClaudeAuthSession {
  return { ...currentSession };
}

function cloneStatus(status: MutableClaudeSubscriptionStatus): InstanceClaudeSubscriptionStatus {
  return { ...status };
}

function stripAnsi(value: string): string {
  return value.replaceAll(ANSI_RE, "");
}

function unwrapWrappedUrls(value: string): string {
  let normalized = stripAnsi(value).replaceAll("\r", "");
  let previous = "";
  while (normalized !== previous) {
    previous = normalized;
    normalized = normalized.replace(
      /([A-Za-z0-9%#?&=._:+/-])\n([A-Za-z0-9%#?&=._:+/-])/g,
      "$1$2",
    );
  }
  return normalized;
}

function markClaudeSessionActivity() {
  currentSession.lastActivityAt = new Date().toISOString();
}

function clearClaudeManualCodeRetryTimer() {
  if (!manualCodeRetryTimer) return;
  clearTimeout(manualCodeRetryTimer);
  manualCodeRetryTimer = null;
}

function scheduleClaudeManualCodeRetry() {
  clearClaudeManualCodeRetryTimer();
  if (!queuedManualCode || currentSession.state !== "pending") return;
  if (currentSession.codeDeliveryAttemptCount >= 8) return;

  manualCodeRetryTimer = setTimeout(() => {
    void flushQueuedClaudeManualCode({ force: true });
  }, 3000);
}

function firstNonEmptyLine(text: string): string {
  return (
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) ?? ""
  );
}

function summarizeProbeOutput(stdout: string, stderr: string): string | null {
  return firstNonEmptyLine(stderr) || firstNonEmptyLine(stdout) || null;
}

export function extractClaudeLoginUrl(text: string): string | null {
  const normalized = unwrapWrappedUrls(text);
  const match = normalized.match(URL_RE);
  if (!match || match.length === 0) return null;
  for (const rawUrl of match) {
    const cleaned = rawUrl.replace(/[\])}.!,?;:'\"]+$/g, "");
    if (cleaned.includes("claude") || cleaned.includes("anthropic") || cleaned.includes("auth")) {
      return cleaned;
    }
  }
  return match[0]?.replace(/[\])}.!,?;:'\"]+$/g, "") ?? null;
}

export function extractClaudeManualCodePrompt(text: string): string | null {
  const match = text.match(CLAUDE_AUTH_CODE_PROMPT_RE);
  return match?.[0]?.trim() ?? null;
}

function toStringEnv(env: NodeJS.ProcessEnv): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") normalized[key] = value;
  }
  return normalized;
}

function parseClaudeStreamJson(stdout: string): { summary: string; resultJson: Record<string, unknown> | null } {
  const assistantTexts: string[] = [];
  let resultJson: Record<string, unknown> | null = null;

  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    let event: Record<string, unknown>;
    try {
      event = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }

    if (event.type === "assistant") {
      const message =
        typeof event.message === "object" && event.message !== null && !Array.isArray(event.message)
          ? (event.message as Record<string, unknown>)
          : null;
      const content = Array.isArray(message?.content) ? message.content : [];
      for (const entry of content) {
        if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
        if (entry.type === "text" && typeof entry.text === "string" && entry.text.trim()) {
          assistantTexts.push(entry.text.trim());
        }
      }
      continue;
    }

    if (event.type === "result") {
      resultJson = event;
    }
  }

  const resultText =
    resultJson && typeof resultJson.result === "string" && resultJson.result.trim()
      ? resultJson.result.trim()
      : "";
  return {
    summary: resultText || assistantTexts.join("\n\n").trim(),
    resultJson,
  };
}

function detectClaudeLoginRequired(input: {
  parsed: Record<string, unknown> | null;
  stdout: string;
  stderr: string;
}): { requiresLogin: boolean; loginUrl: string | null } {
  const resultText =
    input.parsed && typeof input.parsed.result === "string" ? input.parsed.result.trim() : "";
  const messages = [resultText, input.stdout, input.stderr]
    .join("\n")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    requiresLogin: messages.some((line) => CLAUDE_AUTH_REQUIRED_RE.test(line)),
    loginUrl: extractClaudeLoginUrl([input.stdout, input.stderr].join("\n")),
  };
}

function parseStatusJson(stdout: string): { loggedIn: boolean; authMethod: string | null; apiProvider: string | null } {
  try {
    const parsed = JSON.parse(stdout) as Record<string, unknown>;
    return {
      loggedIn: parsed.loggedIn === true,
      authMethod: typeof parsed.authMethod === "string" ? parsed.authMethod : null,
      apiProvider: typeof parsed.apiProvider === "string" ? parsed.apiProvider : null,
    };
  } catch {
    return {
      loggedIn: false,
      authMethod: null,
      apiProvider: null,
    };
  }
}

async function resolveRuntime() {
  const runtimeConfig = loadConfig();
  const sharedConfigDir = resolveClaudeSharedSubscriptionHome(runtimeConfig);
  await fs.mkdir(sharedConfigDir, { recursive: true });
  await fs.mkdir(runtimeConfig.agentRuntimeDir, { recursive: true }).catch(() => {});

  const env = toStringEnv(ensurePathInEnv({
    ...process.env,
    ANTHROPIC_API_KEY: "",
    CLAUDE_CODE_OAUTH_TOKEN: runtimeConfig.claudeInstanceOauthToken ?? "",
    CLAUDE_CONFIG_DIR: sharedConfigDir,
  }));

  const cwd = runtimeConfig.agentRuntimeDir;
  await ensureCommandResolvable(CLAUDE_COMMAND, cwd, env);

  return {
    command: CLAUDE_COMMAND,
    cwd,
    env,
    sharedConfigDir,
  };
}

function buildClaudeRuntimeEnv(
  runtime: Awaited<ReturnType<typeof resolveRuntime>>,
  options?: {
    apiKeyOverride?: string | null;
    oauthTokenOverride?: string | null;
    mode?: "api_key" | "subscription";
  },
) {
  const mode = options?.mode ?? "subscription";
  const apiKey = mode === "api_key" ? options?.apiKeyOverride?.trim() ?? "" : "";
  const oauthToken = mode === "subscription" ? options?.oauthTokenOverride?.trim() ?? "" : "";
  return {
    ...runtime.env,
    ANTHROPIC_API_KEY: apiKey,
    CLAUDE_CODE_OAUTH_TOKEN: oauthToken,
  };
}

function buildClaudeSetupTokenSpawn(runtime: Awaited<ReturnType<typeof resolveRuntime>>) {
  if (process.platform === "linux") {
    const wrappedCommand = `stty -echo; exec ${shellQuoteCommand([runtime.command, "setup-token"])}`;
    return {
      command: "script",
      args: ["-q", "-c", `sh -lc ${shellQuote(wrappedCommand)}`, "/dev/null"],
    };
  }

  return {
    command: runtime.command,
    args: ["setup-token"],
  };
}

function refreshSessionHints() {
  const combined = `${currentSession.stdout}\n${currentSession.stderr}`;
  currentSession.loginUrl = extractClaudeLoginUrl(combined);
  const manualCodePrompt = extractClaudeManualCodePrompt(combined);
  const promptBecameVisible = manualCodePrompt !== null && currentSession.manualCodePrompt === null;
  currentSession.manualCodePrompt = manualCodePrompt;
  currentSession.awaitingManualCode = currentSession.state === "pending" && currentSession.manualCodePrompt !== null;
  if (promptBecameVisible) {
    currentSession.promptDetectedAt = new Date().toISOString();
  }
  if (currentSession.awaitingManualCode && queuedManualCode) {
    void flushQueuedClaudeManualCode();
  }
}

function markSessionFinished(
  state: "succeeded" | "failed",
  result: { exitCode: number | null; signal: string | null },
) {
  currentSession = {
    ...currentSession,
    state,
    exitCode: result.exitCode,
    signal: result.signal,
    finishedAt: new Date().toISOString(),
  };
  if (state === "failed" && queuedManualCode && currentSession.codeDeliveryState !== "delivered") {
    currentSession.codeDeliveryState = "failed";
    currentSession.codeDeliveryError ??= "Claude login ended before the queued authentication code could complete the handshake.";
  }
  refreshSessionHints();
  activeChild = null;
  queuedManualCode = null;
  manualCodeWriteInFlight = false;
  clearClaudeManualCodeRetryTimer();
}

async function writeClaudeManualCode(code: string): Promise<void> {
  if (!activeChild || currentSession.state !== "pending") {
    throw new Error("Claude login is not waiting for an authentication code.");
  }
  const stdin = activeChild.stdin;
  if (!stdin || stdin.destroyed || !stdin.writable) {
    throw new Error("Claude login stdin is not available.");
  }

  currentSession.codeDeliveryAttemptCount += 1;
  currentSession.lastCodeDeliveryAttemptAt = new Date().toISOString();
  await new Promise<void>((resolve, reject) => {
    stdin.write(`${code}\r\n`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  markClaudeSessionActivity();
  currentSession.awaitingManualCode = false;
  currentSession.manualCodePrompt = null;
  currentSession.codeSubmittedAt = new Date().toISOString();
  currentSession.codeDeliveryState = "delivered";
  currentSession.codeDeliveryError = null;
}

async function flushQueuedClaudeManualCode(options?: { force?: boolean }): Promise<void> {
  if (manualCodeWriteInFlight || !queuedManualCode) return;
  if (!options?.force && !currentSession.awaitingManualCode && !currentSession.manualCodePrompt) return;

  manualCodeWriteInFlight = true;
  const code = queuedManualCode;
  const promptWasVisible = currentSession.awaitingManualCode || Boolean(currentSession.manualCodePrompt);
  try {
    await writeClaudeManualCode(code);
    if (promptWasVisible && queuedManualCode === code) {
      queuedManualCode = null;
    }
    if (queuedManualCode) {
      scheduleClaudeManualCodeRetry();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn({ err: error }, "failed to flush queued Claude manual auth code");
    currentSession.codeDeliveryState = "failed";
    currentSession.codeDeliveryError = message;
    scheduleClaudeManualCodeRetry();
  } finally {
    manualCodeWriteInFlight = false;
  }
}

export async function startClaudeInstanceAuth(): Promise<InstanceClaudeAuthSession> {
  if (activeChild && currentSession.state === "pending") {
    return cloneSession();
  }

  const runtime = await resolveRuntime();
  const loginSpawn = buildClaudeSetupTokenSpawn(runtime);
  currentSession = {
    state: "pending",
    loginUrl: null,
    awaitingManualCode: false,
    manualCodePrompt: null,
    codeSubmittedAt: null,
    promptDetectedAt: null,
    codeDeliveryState: "idle",
    codeDeliveryError: null,
    codeDeliveryAttemptCount: 0,
    lastCodeDeliveryAttemptAt: null,
    lastActivityAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    finishedAt: null,
    exitCode: null,
    signal: null,
    stdout: "",
    stderr: "",
  };
  queuedManualCode = null;
  manualCodeWriteInFlight = false;
  clearClaudeManualCodeRetryTimer();

  const child = spawn(loginSpawn.command, loginSpawn.args, {
    cwd: runtime.cwd,
    env: runtime.env,
    shell: false,
    stdio: ["pipe", "pipe", "pipe"],
  });
  activeChild = child;

  child.stdout?.on("data", (chunk: unknown) => {
    currentSession.stdout = appendWithCap(currentSession.stdout, String(chunk));
    markClaudeSessionActivity();
    try {
      refreshSessionHints();
    } catch (error) {
      logger.warn({ err: error }, "failed to refresh Claude auth session hints from stdout");
    }
  });

  child.stderr?.on("data", (chunk: unknown) => {
    currentSession.stderr = appendWithCap(currentSession.stderr, String(chunk));
    markClaudeSessionActivity();
    try {
      refreshSessionHints();
    } catch (error) {
      logger.warn({ err: error }, "failed to refresh Claude auth session hints from stderr");
    }
  });

  child.on("error", (err) => {
    logger.warn({ err }, "claude instance auth failed to start");
    currentSession.stderr = appendWithCap(
      currentSession.stderr,
      `${err instanceof Error ? err.message : String(err)}\n`,
    );
    markSessionFinished("failed", { exitCode: null, signal: null });
  });

  child.on("close", (code, signal) => {
    markSessionFinished(code === 0 ? "succeeded" : "failed", {
      exitCode: code,
      signal,
    });
  });

  return cloneSession();
}

export function getClaudeInstanceAuthSession(): InstanceClaudeAuthSession {
  return cloneSession();
}

export async function submitClaudeInstanceAuthCode(code: string): Promise<InstanceClaudeAuthSession> {
  const trimmed = code.trim();
  if (!trimmed) {
    throw new Error("Authentication code is required.");
  }
  if (!activeChild || currentSession.state !== "pending") {
    throw new Error("Claude login is not waiting for an authentication code.");
  }
  currentSession.codeSubmittedAt = new Date().toISOString();
  currentSession.codeDeliveryState = "queued";
  currentSession.codeDeliveryError = null;
  queuedManualCode = trimmed;
  await flushQueuedClaudeManualCode({ force: true });
  scheduleClaudeManualCodeRetry();
  return cloneSession();
}

export async function getClaudeInstanceSubscriptionStatus(): Promise<InstanceClaudeSubscriptionStatus> {
  const runtime = await resolveRuntime();
  const proc = await runChildProcess("claude-instance-auth-status", runtime.command, ["auth", "status", "--json"], {
    cwd: runtime.cwd,
    env: buildClaudeRuntimeEnv(runtime, {
      mode: "subscription",
      oauthTokenOverride: loadConfig().claudeInstanceOauthToken ?? "",
    }),
    timeoutSec: 20,
    graceSec: 5,
    onLog: async () => {},
  });
  const parsed = parseStatusJson(proc.stdout);
  lastKnownStatus = {
    command: runtime.command,
    sharedConfigDir: runtime.sharedConfigDir,
    checkedAt: new Date().toISOString(),
    loggedIn: parsed.loggedIn,
    authMethod: parsed.authMethod,
    apiProvider: parsed.apiProvider,
    exitCode: proc.exitCode,
    stdout: proc.stdout,
    stderr: proc.stderr,
  };

  return cloneStatus(lastKnownStatus);
}

export async function getClaudeInstanceSubscriptionAuth(): Promise<InstanceClaudeSubscriptionAuthResponse> {
  const status = await getClaudeInstanceSubscriptionStatus();
  return {
    command: status.command,
    sharedConfigDir: status.sharedConfigDir,
    session: getClaudeInstanceAuthSession(),
    loginStatus: status,
  };
}

export async function getClaudeInstanceSubscriptionAuthSnapshot(): Promise<InstanceClaudeSubscriptionAuthResponse> {
  const runtime = await resolveRuntime();
  const fallbackStatus: InstanceClaudeSubscriptionStatus = lastKnownStatus
    ? {
        ...cloneStatus(lastKnownStatus),
        command: runtime.command,
        sharedConfigDir: runtime.sharedConfigDir,
      }
    : {
        command: runtime.command,
        sharedConfigDir: runtime.sharedConfigDir,
        checkedAt: new Date().toISOString(),
        loggedIn: false,
        authMethod: null,
        apiProvider: null,
        exitCode: null,
        stdout: "",
        stderr: "",
      };

  return {
    command: runtime.command,
    sharedConfigDir: runtime.sharedConfigDir,
    session: getClaudeInstanceAuthSession(),
    loginStatus: fallbackStatus,
  };
}

export async function probeClaudeInstanceConnection(
  mode: "api_key" | "subscription",
  options?: {
    apiKeyOverride?: string | null;
    oauthTokenOverride?: string | null;
  },
): Promise<InstanceClaudeConnectionProbeResult> {
  const runtimeConfig = loadConfig();
  const runtime = await resolveRuntime();
  const effectiveApiKey = options?.apiKeyOverride?.trim() || runtimeConfig.claudeInstanceApiKey || "";
  const effectiveOauthToken = options?.oauthTokenOverride?.trim() || runtimeConfig.claudeInstanceOauthToken || "";

  if (mode === "api_key" && !effectiveApiKey) {
    return {
      mode,
      command: runtime.command,
      sharedConfigDir: null,
      checkedAt: new Date().toISOString(),
      ok: false,
      exitCode: null,
      summary: "No Anthropic API key is stored for Claude.",
      detail: "Save an instance-level Anthropic key first, then retry the API key probe.",
      stdout: "",
      stderr: "",
    };
  }

  if (mode === "subscription" && !effectiveOauthToken) {
    return {
      mode,
      command: runtime.command,
      sharedConfigDir: runtime.sharedConfigDir,
      checkedAt: new Date().toISOString(),
      ok: false,
      exitCode: null,
      summary: "No Claude setup-token is stored.",
      detail: "Generate a token with `claude setup-token`, save it in Instance Settings, then retry the subscription probe.",
      stdout: "",
      stderr: "",
    };
  }

  const env = buildClaudeRuntimeEnv(runtime, {
    mode,
    apiKeyOverride: effectiveApiKey,
    oauthTokenOverride: effectiveOauthToken,
  });
  const probe = await runInteractiveChildProcess(
    `claude-instance-probe-${mode}-${Date.now()}`,
    runtime.command,
    ["--print", "-", "--output-format", "stream-json", "--verbose"],
    {
      cwd: runtime.cwd,
      env,
      timeoutSec: 45,
      graceSec: 5,
      stdin: "Respond with exactly: connection ok",
      onLog: async () => {},
      onLogError: () => {},
    },
  );

  const parsed = parseClaudeStreamJson(probe.stdout);
  const loginMeta = detectClaudeLoginRequired({
    parsed: parsed.resultJson,
    stdout: probe.stdout,
    stderr: probe.stderr,
  });
  const detail =
    parsed.summary && parsed.summary !== "connection ok"
      ? parsed.summary.replace(/\s+/g, " ").trim().slice(0, 240)
      : summarizeProbeOutput(probe.stdout, probe.stderr);

  if (probe.timedOut) {
    return {
      mode,
      command: runtime.command,
      sharedConfigDir: mode === "subscription" ? runtime.sharedConfigDir : null,
      checkedAt: new Date().toISOString(),
      ok: false,
      exitCode: probe.exitCode,
      summary: "Connection probe timed out.",
      detail: "Retry the probe. If this keeps happening, inspect the Paperclip runtime environment directly.",
      stdout: probe.stdout,
      stderr: probe.stderr,
    };
  }

  if (loginMeta.requiresLogin) {
    return {
      mode,
      command: runtime.command,
      sharedConfigDir: mode === "subscription" ? runtime.sharedConfigDir : null,
      checkedAt: new Date().toISOString(),
      ok: false,
      exitCode: probe.exitCode,
      summary: "Authentication is not ready.",
      detail: detail ?? loginMeta.loginUrl,
      stdout: probe.stdout,
      stderr: probe.stderr,
    };
  }

  if ((probe.exitCode ?? 1) === 0) {
    return {
      mode,
      command: runtime.command,
      sharedConfigDir: mode === "subscription" ? runtime.sharedConfigDir : null,
      checkedAt: new Date().toISOString(),
      ok: true,
      exitCode: probe.exitCode,
      summary: "Connection working.",
      detail,
      stdout: probe.stdout,
      stderr: probe.stderr,
    };
  }

  return {
    mode,
    command: runtime.command,
    sharedConfigDir: mode === "subscription" ? runtime.sharedConfigDir : null,
    checkedAt: new Date().toISOString(),
    ok: false,
    exitCode: probe.exitCode,
    summary: "Connection probe failed.",
    detail,
    stdout: probe.stdout,
    stderr: probe.stderr,
  };
}
