import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { createPicoclawBridgeServer } from "./server.js";
import type { PicoclawBridgeConfig } from "./config.js";

const servers: Server[] = [];

async function createFixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "picoclaw-bridge-"));
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
  MESSAGE=""
  SESSION=""
  MODEL="default"
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --message)
        shift
        MESSAGE="$1"
        ;;
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
  echo "$MESSAGE" >&2
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
  if (!address || typeof address === "string") {
    throw new Error("Failed to resolve test server port.");
  }
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
    ),
  );
});

describe("picoclaw bridge", () => {
  it("requires auth when configured", async () => {
    const fixture = await createFixture();
    const { baseUrl } = await listen({
      host: "127.0.0.1",
      port: 3210,
      authToken: "secret",
      command: fixture.commandPath,
      defaultCwd: fixture.dir,
      configPath: fixture.configPath,
      allowedCwds: [],
    });

    const response = await fetch(`${baseUrl}/v1/health`);
    expect(response.status).toBe(401);
  });

  it("reports health and models", async () => {
    const fixture = await createFixture();
    const { baseUrl } = await listen({
      host: "127.0.0.1",
      port: 3210,
      authToken: "secret",
      command: fixture.commandPath,
      defaultCwd: fixture.dir,
      configPath: fixture.configPath,
      allowedCwds: [],
    });

    const health = await fetch(`${baseUrl}/v1/health`, {
      headers: { authorization: "Bearer secret" },
    }).then((res) => res.json());
    expect(health.status).toBe("ok");
    expect(health.commandAvailable).toBe(true);

    const models = await fetch(`${baseUrl}/v1/models`, {
      headers: { authorization: "Bearer secret" },
    }).then((res) => res.json());
    expect(models.models).toEqual([{ id: "gpt-5.4", label: "gpt-5.4 (openai/gpt-5.4)" }]);
  });

  it("executes a remote PicoClaw run", async () => {
    const fixture = await createFixture();
    const { baseUrl } = await listen({
      host: "127.0.0.1",
      port: 3210,
      authToken: null,
      command: fixture.commandPath,
      defaultCwd: fixture.dir,
      configPath: fixture.configPath,
      allowedCwds: [fixture.dir],
    });

    const result = await fetch(`${baseUrl}/v1/execute`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        prompt: "Respond with hello.",
        sessionId: "paperclip:test",
        cwd: fixture.dir,
        model: "gpt-5.4",
      }),
    }).then((res) => res.json());

    expect(result.exitCode).toBe(0);
    expect(result.sessionId).toBe("paperclip:test");
    expect(result.sessionParams).toEqual({ sessionId: "paperclip:test", cwd: fixture.dir });
    expect(result.summary).toContain("remote run for paperclip:test");
  });
});
