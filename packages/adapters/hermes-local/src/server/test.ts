/**
 * Environment test for Hermes Agent adapter.
 *
 * Verifies that Hermes CLI is available and configured.
 */

import { spawn } from "node:child_process";
import type { AdapterEnvironmentTestContext, AdapterEnvironmentTestResult, AdapterEnvironmentCheck } from "@paperclipai/adapter-utils";
import { HERMES_CLI } from "./constants.js";

/**
 * Test that Hermes CLI is available and can be invoked.
 * Uses the configured hermesCommand if set, otherwise falls back to default.
 */
export async function testEnvironment(ctx: AdapterEnvironmentTestContext): Promise<AdapterEnvironmentTestResult> {
  const checks: AdapterEnvironmentCheck[] = [];
  const hermesCmd = typeof ctx.config?.hermesCommand === "string" && ctx.config.hermesCommand
    ? ctx.config.hermesCommand
    : HERMES_CLI;

  const versionCheck = await new Promise<AdapterEnvironmentCheck>((resolve) => {
    const proc = spawn(hermesCmd, ["--version"], {
      timeout: 5000,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({
          code: "hermes_cli_available",
          level: "info",
          message: `Hermes CLI available: ${stdout.trim() || "ok"}`,
          detail: stdout.trim() || undefined,
        });
      } else {
        resolve({
          code: "hermes_cli_failed",
          level: "error",
          message: `Hermes CLI exited with code ${code}: ${stderr.trim() || stdout.trim()}`,
        });
      }
    });

    proc.on("error", (err) => {
      resolve({
        code: "hermes_cli_not_found",
        level: "error",
        message: `Hermes CLI not found: ${err.message}`,
        hint: "Install with: pip install hermes-agent",
      });
    });
  });

  checks.push(versionCheck);

  const status = checks.some(c => c.level === "error") 
    ? "fail" 
    : checks.some(c => c.level === "warn") 
      ? "warn" 
      : "pass";

  return {
    adapterType: ctx.adapterType,
    status,
    checks,
    testedAt: new Date().toISOString(),
  };
}