import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import type { AdapterExecutionContext, AdapterExecutionResult, UsageSummary } from "../types.js";
import { asString, asNumber, asStringArray, parseObject, buildPaperclipEnv, ensurePathInEnv, redactEnvForLogs } from "../utils.js";

// ---------------------------------------------------------------------------
// ACP (Agent Client Protocol) adapter — execute
//
// ACP is a stdio-based JSON-RPC 2.0 protocol (like MCP) where the client
// spawns an agent process and communicates over stdin/stdout.
//
// Lifecycle:
//   1. Spawn the ACP agent command (e.g. `kiro-cli acp`)
//   2. Send `initialize` with client capabilities
//   3. Send `session/new` or `session/load` (if resuming)
//   4. Send `session/prompt` with the task prompt
//   5. Stream `session/notification` events (AgentMessageChunk, ToolCall,
//      ToolCallUpdate, TurnEnd)
//   6. Close stdin when done
// ---------------------------------------------------------------------------

let nextRpcId = 1;
function rpcId(): number { return nextRpcId++; }

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: Record<string, unknown>;
}

interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string; data?: unknown };
}

type JsonRpcMessage = JsonRpcResponse | JsonRpcNotification;

function sendRpc(proc: ChildProcess, msg: JsonRpcRequest | JsonRpcNotification): void {
  proc.stdin?.write(JSON.stringify(msg) + "\n");
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { config, runId, agent, onLog, onMeta } = ctx;

  const command = asString(config.command, "kiro-cli");
  const args = asStringArray(config.args).length > 0 ? asStringArray(config.args) : ["acp"];
  const cwd = asString(config.cwd, process.cwd());
  const timeoutSec = asNumber(config.timeoutSec, 300);
  const envConfig = parseObject(config.env);

  const sessionId = ctx.runtime.sessionId;

  // Build environment
  const env: Record<string, string> = {
    ...buildPaperclipEnv(agent),
  };
  for (const [k, v] of Object.entries(envConfig)) {
    if (typeof v === "string") env[k] = v;
  }
  const fullEnv = ensurePathInEnv({ ...process.env, ...env }) as Record<string, string>;

  if (onMeta) {
    await onMeta({
      adapterType: "acp",
      command,
      cwd,
      commandArgs: args,
      commandNotes: [
        sessionId ? `Resuming session: ${sessionId}` : "New session",
        "Protocol: ACP (JSON-RPC 2.0 over stdio)",
      ],
      env: redactEnvForLogs(env),
    });
  }

  // --- Spawn the ACP agent process ---
  const proc = spawn(command, args, {
    cwd,
    env: fullEnv,
    stdio: ["pipe", "pipe", "pipe"],
  });

  // Track pending RPC responses
  const pendingRequests = new Map<number, {
    resolve: (res: JsonRpcResponse) => void;
    reject: (err: Error) => void;
  }>();

  // State
  let acpSessionId: string | null = sessionId;
  let turnComplete = false;
  const usage: UsageSummary = { inputTokens: 0, outputTokens: 0 };
  let model: string | null = null;
  let summary: string | null = null;
  let errorMessage: string | null = null;

  // --- Parse stdout as newline-delimited JSON-RPC ---
  const rl = createInterface({ input: proc.stdout! });

  rl.on("line", (line) => {
    // Log raw line for visibility
    void onLog("stdout", line + "\n");

    let msg: JsonRpcMessage;
    try {
      msg = JSON.parse(line);
    } catch {
      return; // Not JSON — skip
    }

    // Response to a request we sent
    if ("id" in msg && typeof msg.id === "number") {
      const pending = pendingRequests.get(msg.id);
      if (pending) {
        pendingRequests.delete(msg.id);
        pending.resolve(msg as JsonRpcResponse);
      }
      return;
    }

    // Notification from the agent
    if ("method" in msg) {
      void handleNotification(msg as JsonRpcNotification);
    }
  });

  async function handleNotification(notif: JsonRpcNotification): Promise<void> {
    const params = notif.params ?? {};

    if (notif.method === "session/notification") {
      const updateType = params.type as string | undefined;
      switch (updateType) {
        case "AgentMessageChunk": {
          // Streaming text from the agent
          const text = params.text ?? params.content ?? "";
          if (text) summary = (summary ?? "") + String(text);
          break;
        }
        case "ToolCall": {
          await onLog("stdout", JSON.stringify({
            type: "acp:tool_call",
            name: params.name ?? params.toolName,
            input: params.input ?? params.arguments,
          }) + "\n");
          break;
        }
        case "ToolCallUpdate": {
          await onLog("stdout", JSON.stringify({
            type: "acp:tool_update",
            name: params.name ?? params.toolName,
            content: params.content ?? params.output,
          }) + "\n");
          break;
        }
        case "TurnEnd": {
          turnComplete = true;
          if (params.usage && typeof params.usage === "object") {
            const u = params.usage as Record<string, unknown>;
            if (typeof u.inputTokens === "number") usage.inputTokens += u.inputTokens;
            if (typeof u.outputTokens === "number") usage.outputTokens += u.outputTokens;
          }
          if (typeof params.model === "string") model = params.model;
          break;
        }
        default: {
          // Log unknown notification types
          await onLog("stdout", JSON.stringify({ type: "acp:notification", ...params }) + "\n");
        }
      }
    }
  }

  // --- Collect stderr ---
  let stderrBuf = "";
  proc.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    stderrBuf += text;
    void onLog("stderr", text);
  });

  // --- Send RPC request and wait for response ---
  function request(method: string, params: Record<string, unknown>): Promise<JsonRpcResponse> {
    return new Promise<JsonRpcResponse>((resolve, reject) => {
      const id = rpcId();
      const timer = setTimeout(() => {
        pendingRequests.delete(id);
        reject(new Error(`ACP request ${method} timed out (${timeoutSec}s)`));
      }, timeoutSec * 1000);

      pendingRequests.set(id, {
        resolve: (res) => {
          clearTimeout(timer);
          resolve(res);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });

      sendRpc(proc, { jsonrpc: "2.0", id, method, params });
    });
  }

  // --- Wait for process exit ---
  function waitForExit(): Promise<{ exitCode: number | null; signal: string | null }> {
    return new Promise((resolve) => {
      proc.on("close", (code, signal) => {
        resolve({ exitCode: code, signal: signal ?? null });
      });
    });
  }

  // --- ACP Protocol Flow ---
  try {
    // 1. Initialize
    const initRes = await request("initialize", {
      protocolVersion: 1,
      clientCapabilities: {
        fs: { readTextFile: true, writeTextFile: true },
        terminal: true,
      },
      clientInfo: { name: "paperclip", version: "1.0.0" },
    });

    if (initRes.error) {
      throw new Error(`ACP initialize failed: ${initRes.error.message}`);
    }

    await onLog("stdout", JSON.stringify({
      type: "acp:initialized",
      agent: initRes.result?.agentInfo,
      capabilities: initRes.result?.agentCapabilities,
    }) + "\n");

    // 2. Create or load session
    if (acpSessionId) {
      const loadRes = await request("session/load", { sessionId: acpSessionId });
      if (loadRes.error) {
        // Session not found — create new
        await onLog("stderr", `ACP session/load failed (${loadRes.error.message}), creating new session\n`);
        const newRes = await request("session/new", {});
        if (newRes.error) throw new Error(`ACP session/new failed: ${newRes.error.message}`);
        acpSessionId = (newRes.result?.sessionId as string) ?? null;
      }
    } else {
      const newRes = await request("session/new", {});
      if (newRes.error) throw new Error(`ACP session/new failed: ${newRes.error.message}`);
      acpSessionId = (newRes.result?.sessionId as string) ?? null;
    }

    // 3. Send the prompt
    const prompt = asString(ctx.context.prompt, "");
    if (!prompt) throw new Error("ACP adapter: no prompt provided in context");

    const promptRes = await request("session/prompt", {
      content: [{ type: "text", text: prompt }],
    });

    if (promptRes.error) {
      throw new Error(`ACP session/prompt failed: ${promptRes.error.message}`);
    }

    // 4. Wait for TurnEnd notification or process exit
    // The prompt response may come back immediately, but notifications
    // (AgentMessageChunk, ToolCall, TurnEnd) stream asynchronously.
    // We wait for the process to exit naturally.

  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    // Try graceful shutdown
    try { proc.stdin?.end(); } catch { /* ignore */ }
  }

  // Close stdin to signal we're done
  try { proc.stdin?.end(); } catch { /* ignore */ }

  // Wait for process to finish
  const exitResult = await waitForExit();

  // Cleanup
  rl.close();

  return {
    exitCode: exitResult.exitCode,
    signal: exitResult.signal,
    timedOut: false,
    errorMessage,
    usage: usage.inputTokens > 0 || usage.outputTokens > 0 ? usage : undefined,
    model,
    sessionId: acpSessionId,
    sessionParams: acpSessionId ? { sessionId: acpSessionId } : null,
    sessionDisplayId: acpSessionId,
    summary: summary?.slice(0, 500) ?? null,
  };
}
