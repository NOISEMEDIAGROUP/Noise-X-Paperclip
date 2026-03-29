import { describe, expect, it } from "vitest";
import { normalizeVitestRunArgs } from "../../../scripts/vitest-run-args.mjs";

describe("normalizeVitestRunArgs", () => {
  it("strips a forwarded pnpm delimiter", () => {
    expect(normalizeVitestRunArgs(["--", "server/src/__tests__/paperclip-skill-utils.test.ts"])).toEqual([
      "server/src/__tests__/paperclip-skill-utils.test.ts",
    ]);
  });

  it("preserves args that do not start with a delimiter", () => {
    expect(normalizeVitestRunArgs(["server/src/__tests__/paperclip-skill-utils.test.ts"])).toEqual([
      "server/src/__tests__/paperclip-skill-utils.test.ts",
    ]);
  });
});
