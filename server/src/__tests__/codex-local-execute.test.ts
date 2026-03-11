import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execute } from "@paperclipai/adapter-codex-local/server";

async function writeFakeCodexCommand(commandPath: string): Promise<void> {
  const script = `#!/usr/bin/env node
const fs = require("node:fs");

const capturePath = process.env.PAPERCLIP_TEST_CAPTURE_PATH;
const payload = {
  argv: process.argv.slice(2),
  prompt: fs.readFileSync(0, "utf8"),
  agentHome: process.env.AGENT_HOME || "",
  apiKey: process.env.PAPERCLIP_API_KEY || "",
  capturePathEnv: process.env.PAPERCLIP_TEST_CAPTURE_PATH || "",
};
if (capturePath) {
  fs.writeFileSync(capturePath, JSON.stringify(payload), "utf8");
}
console.log(JSON.stringify({ type: "thread.started", thread_id: "thread-1" }));
console.log(JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "done" } }));
console.log(JSON.stringify({ type: "turn.completed", usage: { input_tokens: 1, output_tokens: 1 } }));
`;
  await fs.writeFile(commandPath, script, "utf8");
  await fs.chmod(commandPath, 0o755);
}

type CapturePayload = {
  argv: string[];
  prompt: string;
  agentHome: string;
  apiKey: string;
  capturePathEnv: string;
};

describe("codex execute", () => {
  it("ignores reserved env overrides and keeps AGENT_HOME from instructions path", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-execute-"));
    const workspace = path.join(root, "workspace");
    const agentHome = path.join(root, "agent-home");
    const instructionsPath = path.join(agentHome, "AGENTS.md");
    const commandPath = path.join(root, "codex");
    const capturePath = path.join(root, "capture.json");
    await fs.mkdir(workspace, { recursive: true });
    await fs.mkdir(agentHome, { recursive: true });
    await fs.writeFile(instructionsPath, "# agent instructions", "utf8");
    await writeFakeCodexCommand(commandPath);

    const logs: string[] = [];
    try {
      const result = await execute({
        runId: "run-1",
        agent: {
          id: "agent-1",
          companyId: "company-1",
          name: "Founding Engineer",
          adapterType: "codex_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: commandPath,
          cwd: workspace,
          instructionsFilePath: instructionsPath,
          env: {
            AGENT_HOME: "/tmp/evil-home",
            PAPERCLIP_API_KEY: "evil-api-key",
            PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
          },
          promptTemplate: "Continue the task.",
        },
        context: {},
        authToken: "run-jwt-token",
        onLog: async (stream, chunk) => {
          if (stream === "stderr") logs.push(chunk);
        },
      });

      expect(result.exitCode).toBe(0);
      expect(result.errorMessage).toBeNull();

      const capture = JSON.parse(await fs.readFile(capturePath, "utf8")) as CapturePayload;
      expect(capture.capturePathEnv).toBe(capturePath);
      expect(capture.agentHome).toBe(agentHome);
      expect(capture.apiKey).toBe("run-jwt-token");

      const stderrText = logs.join("");
      expect(stderrText).toContain("Ignored reserved env key overrides");
      expect(stderrText).toContain("AGENT_HOME");
      expect(stderrText).toContain("PAPERCLIP_API_KEY");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
