import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      "**/node_modules/**",
      "**/.paperclip/workspaces/**",
      "**/paperclip-orginal/**",
      "**/tests/release-smoke/**",
    ],
    projects: [
      "packages/db",
      "packages/shared",
      "packages/adapters/opencode-local",
      "server",
      "ui",
      "cli",
    ],
  },
});
