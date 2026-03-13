import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { createPicoclawBridgeServer } from "@paperclipai/picoclaw-bridge";
import type { PicoclawBridgeConfig } from "@paperclipai/picoclaw-bridge";
import { execute } from "./execute.js";

const servers: Server[] = [];

async function createFixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "picoclaw-remote-"));
  const configPath = path.join(dir, "config.json");
  const commandPath = path.join(dir, "picoclaw");

  await fs.writeFile(configPath, JSON.stringify({ ok: true }), "utf8");
  await fs.writeFile(
    commandPath,
    `#!/bin/sh
set -eu
if [ "$1" = "model" ]; then
  echo "> - gpt-5.4 (openai/gpt-5.4)"
  exit 0
fi
if [ "$1" = "agent" ]; then
  shift
  SESSION=""
  MODEL="default"
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --session)
        shift
        SESSION="$1"
        ;;
      --model)
        shift
        MODEL="$1"
        ;;
    esac
    shift || true
  done
  echo "🦐 remote run for $SESSION using $MODEL"
  exit 0
fi
echo "unsupported" >&2
exit 1
`,
    "utf8",
  );
  await fs.chmod(commandPath, 0o755);
  return { dir, configPath, commandPath };
}

async function listen(config: PicoclawBridgeConfig) {
  const server = createPicoclawBridgeServer(config);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Failed to resolve server port.");
  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
    ),
  );
});

describe("picoclaw_remote execute", () => {
  it("invokes the configured bridge and returns session metadata", async () => {
    const fixture = await createFixture();
    const baseUrl = await listen({
      host: "127.0.0.1",
      port: 3210,
      authToken: "secret",
      command: fixture.commandPath,
      defaultCwd: fixture.dir,
      configPath: fixture.configPath,
      allowedCwds: [fixture.dir],
    });

    const result = await execute({
      runId: "run_123",
      agent: {
        id: "agent_1",
        companyId: "company_1",
        name: "CEO",
        adapterType: "picoclaw_remote",
        adapterConfig: null,
      },
      runtime: { sessionId: null, sessionParams: null, sessionDisplayId: null, taskKey: null },
      config: {
        url: baseUrl,
        authToken: "secret",
        cwd: fixture.dir,
        model: "gpt-5.4",
      },
      context: {},
      authToken: "paperclip-api-key",
      onLog: async () => {},
      onMeta: async () => {},
    });

    expect(result.exitCode).toBe(0);
    expect(result.sessionId).toMatch(/^paperclip:agent_1:/);
    expect(result.sessionParams).toEqual({ sessionId: result.sessionId, cwd: fixture.dir });
    expect(result.summary).toContain("remote run");
  });
});
