import os from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { buildChildProcessEnv, runChildProcess } from "@paperclipai/adapter-utils/server-utils";

const originalDatabaseUrl = process.env.DATABASE_URL;

afterEach(() => {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
});

describe("local adapter child process env", () => {
  it("strips inherited DATABASE_URL when no explicit override is provided", async () => {
    process.env.DATABASE_URL = "postgres://paperclip:paperclip@db:5432/paperclip";

    const env = buildChildProcessEnv({});
    expect(env.DATABASE_URL).toBeUndefined();

    const result = await runChildProcess(
      "server-utils-database-url-strip",
      process.execPath,
      ["-e", "process.stdout.write(process.env.DATABASE_URL ?? '')"],
      {
        cwd: os.tmpdir(),
        env: {},
        timeoutSec: 5,
        graceSec: 1,
        onLog: async () => {},
      },
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
  });

  it("preserves an explicit DATABASE_URL override", async () => {
    process.env.DATABASE_URL = "postgres://paperclip:paperclip@db:5432/paperclip";
    const expected = "postgres://override:override@localhost:5432/override";

    const env = buildChildProcessEnv({ DATABASE_URL: expected });
    expect(env.DATABASE_URL).toBe(expected);

    const result = await runChildProcess(
      "server-utils-database-url-override",
      process.execPath,
      ["-e", "process.stdout.write(process.env.DATABASE_URL ?? '')"],
      {
        cwd: os.tmpdir(),
        env: { DATABASE_URL: expected },
        timeoutSec: 5,
        graceSec: 1,
        onLog: async () => {},
      },
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(expected);
  });
});
