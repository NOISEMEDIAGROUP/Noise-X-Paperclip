import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { createPicoclawBridgeServer } from "@paperclipai/picoclaw-bridge";
import type { PicoclawBridgeConfig } from "@paperclipai/picoclaw-bridge";
import { testEnvironment } from "./test.js";

const servers: Server[] = [];

async function createFixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "picoclaw-remote-test-"));
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

describe("picoclaw_remote testEnvironment", () => {
  it("validates a healthy bridge", async () => {
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

    const result = await testEnvironment({
      companyId: "company_1",
      adapterType: "picoclaw_remote",
      config: { url: baseUrl, authToken: "secret", model: "gpt-5.4" },
    });

    expect(result.status).toBe("pass");
    expect(result.checks.some((check) => check.code === "picoclaw_remote_bridge_ok")).toBe(true);
    expect(result.checks.some((check) => check.code === "picoclaw_remote_model_configured")).toBe(true);
  });
});
