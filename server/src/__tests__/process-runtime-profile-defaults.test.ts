import { describe, expect, it } from "vitest";
import {
  applyProcessRuntimeProfileDefaults,
  listProcessRuntimeProfiles,
} from "../adapters/process/runtime-profiles.js";

describe("process runtime profile defaults", () => {
  it("applies command/args/cwd defaults from selected profile", () => {
    const profile = listProcessRuntimeProfiles()[0];
    expect(profile).toBeDefined();

    const next = applyProcessRuntimeProfileDefaults("process", {
      processRuntimeProfile: profile!.id,
    });

    expect(next.command).toBe(profile!.command);
    expect(next.args).toEqual(profile!.args);
    expect(next.cwd).toBe(profile!.cwd);
  });

  it("does not overwrite explicitly provided process runtime fields", () => {
    const profile = listProcessRuntimeProfiles()[0];
    const explicit = {
      processRuntimeProfile: profile!.id,
      command: "python",
      args: ["worker.py", "--fast"],
      cwd: "/tmp/custom",
    };

    const next = applyProcessRuntimeProfileDefaults("process", explicit);

    expect(next.command).toBe("python");
    expect(next.args).toEqual(["worker.py", "--fast"]);
    expect(next.cwd).toBe("/tmp/custom");
  });

  it("throws on unknown runtime profile id", () => {
    expect(() =>
      applyProcessRuntimeProfileDefaults("process", {
        processRuntimeProfile: "missing_profile",
      }),
    ).toThrowError("Unknown process runtime profile: missing_profile");
  });

  it("does nothing for non-process adapters", () => {
    const input = { processRuntimeProfile: "alibaba_worker_python" };
    const next = applyProcessRuntimeProfileDefaults("codex_local", input);
    expect(next).toBe(input);
  });
});
