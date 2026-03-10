import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Use a non-default port to avoid colliding with `pnpm dev` (defaults to 3100).
const PORT = Number(process.env.PAPERCLIP_E2E_PORT ?? 3105);
const BASE_URL = `http://127.0.0.1:${PORT}`;

const CONFIG_DIR = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  // Start an isolated server instance with a clean PAPERCLIP_HOME so E2E is
  // deterministic even when local dev data already exists.
  webServer: {
    // Ensure the command resolves regardless of where Playwright is invoked from.
    command: `bash start-server.sh`,
    cwd: CONFIG_DIR,
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
  outputDir: "./test-results",
  reporter: [["list"], ["html", { open: "never", outputFolder: "./playwright-report" }]],
});
