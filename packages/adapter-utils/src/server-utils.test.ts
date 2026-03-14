import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { buildExecutionEnv, resolveConfiguredEnvFilePath } from "./server-utils.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

async function makeTempDir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-env-test-"));
  tempDirs.push(dir);
  return dir;
}

describe("resolveConfiguredEnvFilePath", () => {
  it("resolves relative paths against the instance config directory", () => {
    const configPath = "/tmp/paperclip/config.json";
    expect(resolveConfiguredEnvFilePath(".env.agents", configPath)).toBe(
      "/tmp/paperclip/.env.agents",
    );
  });
});

describe("buildExecutionEnv", () => {
  it("merges global env, config env, injected env, then auth fallback", async () => {
    const dir = await makeTempDir();
    const globalEnvFile = path.join(dir, ".env.agents");
    await fs.writeFile(
      globalEnvFile,
      "# shared credentials\nGOG_KEYRING_PASSWORD=shared-secret\nPAPERCLIP_AGENT_ID=from-file\n",
      "utf-8",
    );

    const env = await buildExecutionEnv({
      globalEnvFile,
      configEnv: {
        GOG_KEYRING_PASSWORD: "agent-secret",
        CUSTOM_FLAG: "per-agent",
        PAPERCLIP_AGENT_ID: "from-config",
      },
      injectedEnv: {
        PAPERCLIP_AGENT_ID: "injected-agent",
        AGENT_HOME: "/tmp/agent-home",
      },
      authToken: "jwt-token",
    });

    expect(env.GOG_KEYRING_PASSWORD).toBe("agent-secret");
    expect(env.CUSTOM_FLAG).toBe("per-agent");
    expect(env.PAPERCLIP_AGENT_ID).toBe("injected-agent");
    expect(env.AGENT_HOME).toBe("/tmp/agent-home");
    expect(env.PAPERCLIP_API_KEY).toBe("jwt-token");
  });

  it("does not override an existing PAPERCLIP_API_KEY from env sources", async () => {
    const env = await buildExecutionEnv({
      configEnv: {
        PAPERCLIP_API_KEY: "configured-token",
      },
      authToken: "jwt-token",
    });

    expect(env.PAPERCLIP_API_KEY).toBe("configured-token");
  });
});
