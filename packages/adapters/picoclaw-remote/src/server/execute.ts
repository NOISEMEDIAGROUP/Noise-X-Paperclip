import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { AdapterExecutionContext, AdapterExecutionResult } from "@paperclipai/adapter-utils";
import {
  asNumber,
  asString,
  buildPaperclipEnv,
  parseObject,
  redactEnvForLogs,
  renderTemplate,
} from "@paperclipai/adapter-utils/server-utils";
import { extractPicoClawSummary } from "@paperclipai/adapter-picoclaw-local/server";
import {
  buildBridgeHeaders,
  buildFetchTimeoutMs,
  canResumeSession,
  firstNonEmptyLine,
  resolveBridgeUrl,
} from "./common.js";

function hashForSession(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function buildStableSessionKey(agentId: string, cwd: string): string {
  return `paperclip:${agentId}:${hashForSession(path.resolve(cwd))}`;
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { runId, agent, runtime, config, context, onLog, onMeta, authToken } = ctx;

  const promptTemplate = asString(
    config.promptTemplate,
    "You are agent {{agent.id}} ({{agent.name}}). Continue your Paperclip work.",
  );
  const workspaceCwd = asString(parseObject(context.paperclipWorkspace).cwd, "");
  const cwd = asString(config.cwd, workspaceCwd || process.cwd());
  const model = asString(config.model, "").trim();
  const timeoutSec = asNumber(config.timeoutSec, 120);
  const graceSec = asNumber(config.graceSec, 20);

  const runtimeSessionParams = parseObject(runtime.sessionParams);
  const runtimeSessionId = asString(runtimeSessionParams.sessionId, runtime.sessionId ?? "");
  const runtimeSessionCwd = asString(runtimeSessionParams.cwd, "");
  const sessionId = canResumeSession(runtimeSessionId, runtimeSessionCwd, cwd)
    ? runtimeSessionId
    : buildStableSessionKey(agent.id, cwd);

  const instructionsFilePath = asString(config.instructionsFilePath, "").trim();
  const resolvedInstructionsFilePath = instructionsFilePath ? path.resolve(instructionsFilePath) : "";
  let instructionsPrefix = "";
  if (resolvedInstructionsFilePath) {
    try {
      const instructionsContents = await fs.readFile(resolvedInstructionsFilePath, "utf8");
      instructionsPrefix = `${instructionsContents}\n\nThe above agent instructions were loaded from ${resolvedInstructionsFilePath}.\n\n`;
      await onLog("stderr", `[paperclip] Loaded agent instructions file: ${resolvedInstructionsFilePath}\n`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await onLog("stderr", `[paperclip] Warning: could not read agent instructions file \"${resolvedInstructionsFilePath}\": ${reason}\n`);
    }
  }

  const renderedPrompt = renderTemplate(promptTemplate, {
    agentId: agent.id,
    companyId: agent.companyId,
    runId,
    company: { id: agent.companyId },
    agent,
    run: { id: runId, source: "on_demand" },
    context,
  });
  const finalPrompt = `${instructionsPrefix}${renderedPrompt}`.trim();

  const env = { ...buildPaperclipEnv(agent), PAPERCLIP_RUN_ID: runId } as Record<string, string>;
  if (authToken) env.PAPERCLIP_API_KEY = authToken;

  const executeUrl = resolveBridgeUrl(config.url, "v1/execute");
  const headers = buildBridgeHeaders(config);
  const timeoutMs = buildFetchTimeoutMs(config, 120);
  const controller = timeoutMs > 0 ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  if (onMeta) {
    await onMeta({
      adapterType: "picoclaw_remote",
      command: `POST ${executeUrl}`,
      cwd,
      commandNotes: resolvedInstructionsFilePath
        ? [`Loaded agent instructions from ${resolvedInstructionsFilePath}`]
        : [],
      env: redactEnvForLogs(env),
      prompt: finalPrompt,
      context,
    });
  }

  try {
    const response = await fetch(executeUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        sessionId,
        cwd,
        model: model || undefined,
        timeoutSec,
        graceSec,
        env,
      }),
      signal: controller?.signal,
    });

    const rawBody = await response.text();
    const parsedBody = rawBody.trim() ? JSON.parse(rawBody) as Record<string, unknown> : {};
    if (!response.ok) {
      throw new Error(asString(parsedBody.message, rawBody || `Bridge request failed with status ${response.status}`));
    }

    const stdout = asString(parsedBody.stdout, "");
    const stderr = asString(parsedBody.stderr, "");
    const summary = asString(parsedBody.summary, extractPicoClawSummary(stdout) ?? "").trim() || null;
    const parsedSessionId = asString(parsedBody.sessionId, sessionId);
    const parsedSessionParams = parseObject(parsedBody.sessionParams);
    const exitCode = typeof parsedBody.exitCode === "number" ? parsedBody.exitCode : 0;
    const timedOut = parsedBody.timedOut === true;
    const errorMessage = asString(
      parsedBody.errorMessage,
      timedOut ? `Timed out after ${timeoutSec}s` : exitCode === 0 ? "" : firstNonEmptyLine(stderr) || firstNonEmptyLine(stdout),
    );

    return {
      exitCode,
      signal: typeof parsedBody.signal === "string" ? parsedBody.signal : null,
      timedOut,
      errorMessage: errorMessage || null,
      sessionId: parsedSessionId,
      sessionParams: Object.keys(parsedSessionParams).length > 0 ? parsedSessionParams : { sessionId: parsedSessionId, cwd },
      sessionDisplayId: parsedSessionId,
      model: model || null,
      billingType: "unknown",
      costUsd: null,
      resultJson: parsedBody,
      summary,
    };
  } catch (error) {
    if (controller?.signal.aborted) {
      return {
        exitCode: null,
        signal: null,
        timedOut: true,
        errorMessage: `Timed out after ${timeoutSec}s`,
        sessionId,
        sessionParams: { sessionId, cwd },
        sessionDisplayId: sessionId,
        model: model || null,
        billingType: "unknown",
        costUsd: null,
        resultJson: null,
        summary: null,
      };
    }
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
