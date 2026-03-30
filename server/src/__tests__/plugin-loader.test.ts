import { describe, expect, it } from "vitest";
import { getManifestImportTarget, getNpmExecOptions } from "../services/plugin-loader.js";

describe("plugin-loader windows compatibility helpers", () => {
  it("runs npm through the shell on Windows", () => {
    expect(getNpmExecOptions("win32")).toEqual({ shell: true });
    expect(getNpmExecOptions("linux")).toEqual({});
  });

  it("converts Windows absolute manifest paths into file URLs", () => {
    expect(
      getManifestImportTarget(
        "C:\\Users\\alice\\paperclip-plugin\\dist\\manifest.js",
        "win32",
      ),
    ).toBe("file:///C:/Users/alice/paperclip-plugin/dist/manifest.js");
  });

  it("leaves non-Windows manifest paths unchanged", () => {
    expect(getManifestImportTarget("/tmp/plugin/dist/manifest.js", "linux")).toBe(
      "/tmp/plugin/dist/manifest.js",
    );
    expect(getManifestImportTarget("./dist/manifest.js", "win32")).toBe("./dist/manifest.js");
  });
});
