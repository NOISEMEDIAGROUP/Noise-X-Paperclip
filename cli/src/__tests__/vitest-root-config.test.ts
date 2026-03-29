import { describe, expect, it } from "vitest";
import {
  resolveVitestRootConfigContext,
  resolveVitestSourceRoot,
} from "../../../scripts/vitest-root-config.mjs";

const REQUIRED_MANIFESTS = [
  "packages/db/package.json",
  "packages/shared/package.json",
  "packages/adapter-utils/package.json",
  "packages/adapters/codex-local/package.json",
  "packages/adapters/cursor-local/package.json",
  "packages/adapters/opencode-local/package.json",
];

function withBase(baseDir: string, relativePath: string): string {
  return `${baseDir}/${relativePath}`;
}

describe("vitest root config resolver", () => {
  it("uses root source when required workspace manifests exist in root", () => {
    const root = "/repo";
    const existing = new Set(REQUIRED_MANIFESTS.map((relativePath) => withBase(root, relativePath)));

    const sourceRoot = resolveVitestSourceRoot({
      repoRoot: root,
      fileExists: (candidate) => existing.has(candidate),
    });

    expect(sourceRoot).toBe("/repo");
  });

  it("builds root projects/aliases and keeps root-only excludes in root mode", () => {
    const root = "/repo";
    const existing = new Set(REQUIRED_MANIFESTS.map((relativePath) => withBase(root, relativePath)));

    const context = resolveVitestRootConfigContext({
      repoRoot: root,
      fileExists: (candidate) => existing.has(candidate),
    });

    expect(context.projects).toEqual([
      "packages/db",
      "packages/shared",
      "packages/adapters/opencode-local",
      "server",
      "ui",
      "cli",
    ]);
    expect(context.exclude).toContain("**/paperclip-orginal/**");
    expect(context.alias["@paperclipai/adapter-utils/server-utils"]).toBe(
      "/repo/packages/adapter-utils/src/server-utils.ts",
    );
  });

  it("falls back to paperclip-orginal when root manifests are missing", () => {
    const root = "/repo";
    const fallbackRoot = "/repo/paperclip-orginal";
    const existing = new Set(
      REQUIRED_MANIFESTS.map((relativePath) => withBase(fallbackRoot, relativePath)),
    );

    const sourceRoot = resolveVitestSourceRoot({
      repoRoot: root,
      fileExists: (candidate) => existing.has(candidate),
    });

    expect(sourceRoot).toBe("/repo/paperclip-orginal");
  });

  it("builds fallback projects/aliases and relaxes root-only excludes in fallback mode", () => {
    const root = "/repo";
    const fallbackRoot = "/repo/paperclip-orginal";
    const existing = new Set(
      REQUIRED_MANIFESTS.map((relativePath) => withBase(fallbackRoot, relativePath)),
    );

    const context = resolveVitestRootConfigContext({
      repoRoot: root,
      fileExists: (candidate) => existing.has(candidate),
    });

    expect(context.projects).toEqual([
      "paperclip-orginal/packages/db",
      "paperclip-orginal/packages/shared",
      "paperclip-orginal/packages/adapters/opencode-local",
      "paperclip-orginal/server",
      "paperclip-orginal/ui",
      "paperclip-orginal/cli",
    ]);
    expect(context.exclude).not.toContain("**/paperclip-orginal/**");
    expect(context.alias["@paperclipai/db"]).toBe(
      "/repo/paperclip-orginal/packages/db/src/index.ts",
    );
    expect(context.alias["@paperclipai/adapter-utils/server-utils"]).toBe(
      "/repo/paperclip-orginal/packages/adapter-utils/src/server-utils.ts",
    );
  });
});
