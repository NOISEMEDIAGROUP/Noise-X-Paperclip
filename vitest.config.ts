import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/db", "packages/adapters/opencode-local", "server", "ui", "cli", "tests/aj-ai-services", "tests/cloudops-pro", "tests/support-genius", "tests/cybershield-ai", "tests/devlaunch-studio", "tests/apiconnect-services"],
  },
});
