#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const mode = process.argv[2] === "watch" ? "watch" : "dev";
const cliArgs = process.argv.slice(3);

const tailscaleAuthFlagNames = new Set([
  "--tailscale-auth",
  "--authenticated-private",
]);

let tailscaleAuth = false;
const forwardedArgs = [];

for (const arg of cliArgs) {
  if (tailscaleAuthFlagNames.has(arg)) {
    tailscaleAuth = true;
    continue;
  }
  forwardedArgs.push(arg);
}

if (process.env.npm_config_tailscale_auth === "true") {
  tailscaleAuth = true;
}
if (process.env.npm_config_authenticated_private === "true") {
  tailscaleAuth = true;
}

const env = {
  ...process.env,
  PAPERCLIP_UI_DEV_MIDDLEWARE: "true",
};

if (tailscaleAuth) {
  env.PAPERCLIP_DEPLOYMENT_MODE = "authenticated";
  env.PAPERCLIP_DEPLOYMENT_EXPOSURE = "private";
  env.PAPERCLIP_AUTH_BASE_URL_MODE = "auto";
  env.HOST = "0.0.0.0";
  console.log("[paperclip] dev mode: authenticated/private (tailscale-friendly) on 0.0.0.0");
} else {
  console.log("[paperclip] dev mode: local_trusted (default)");
}

const pnpmBin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function formatPendingMigrationSummary(migrations) {
  if (migrations.length === 0) return "none";
  return migrations.length > 3
    ? `${migrations.slice(0, 3).join(", ")} (+${migrations.length - 3} more)`
    : migrations.join(", ");
}

async function runPnpm(args, options = {}) {
  return await new Promise((resolve, reject) => {
    const child = spawn(pnpmBin, args, {
      stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
      env: options.env ?? process.env,
      shell: process.platform === "win32",
    });

    let stdoutBuffer = "";
    let stderrBuffer = "";

    if (child.stdout) {
      child.stdout.on("data", (chunk) => {
        stdoutBuffer += String(chunk);
      });
    }
    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderrBuffer += String(chunk);
      });
    }

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      resolve({
        code: code ?? 0,
        signal,
        stdout: stdoutBuffer,
        stderr: stderrBuffer,
      });
    });
  });
}

async function maybePreflightMigrations() {
  if (mode !== "watch") return;
  if (process.env.PAPERCLIP_MIGRATION_PROMPT === "never") return;

  const status = await runPnpm(
    ["--filter", "@paperclipai/db", "exec", "tsx", "src/migration-status.ts", "--json"],
    { env },
  );
  if (status.code !== 0) {
    process.stderr.write(status.stderr || status.stdout);
    process.exit(status.code);
  }

  let payload;
  try {
    payload = JSON.parse(status.stdout.trim());
  } catch (error) {
    process.stderr.write(status.stderr || status.stdout);
    throw error;
  }

  if (payload.status !== "needsMigrations" || payload.pendingMigrations.length === 0) {
    return;
  }

  const autoApply = process.env.PAPERCLIP_MIGRATION_AUTO_APPLY === "true";
  let shouldApply = autoApply;

  if (!autoApply) {
    if (!stdin.isTTY || !stdout.isTTY) {
      shouldApply = true;
    } else {
      const prompt = createInterface({ input: stdin, output: stdout });
      try {
        const answer = (
          await prompt.question(
            `Apply pending migrations (${formatPendingMigrationSummary(payload.pendingMigrations)}) now? (y/N): `,
          )
        )
          .trim()
          .toLowerCase();
        shouldApply = answer === "y" || answer === "yes";
      } finally {
        prompt.close();
      }
    }
  }

  if (!shouldApply) return;

  const migrate = spawn(pnpmBin, ["db:migrate"], {
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });
  const exit = await new Promise((resolve) => {
    migrate.on("exit", (code, signal) => resolve({ code: code ?? 0, signal }));
  });
  if (exit.signal) {
    process.kill(process.pid, exit.signal);
    return;
  }
  if (exit.code !== 0) {
    process.exit(exit.code);
  }
}

await maybePreflightMigrations();

if (mode === "watch") {
  env.PAPERCLIP_MIGRATION_PROMPT = "never";
}

function parseIntWithMin(value, fallback, min) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < min) {
    return fallback;
  }
  return parsed;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function runServerProcess(args) {
  return await new Promise((resolve, reject) => {
    const child = spawn(pnpmBin, args, {
      stdio: "inherit",
      env,
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      resolve({ code: code ?? 0, signal });
    });
  });
}

const watchdogEnabled = process.env.PAPERCLIP_DEV_WATCHDOG !== "false";
const watchdogMaxRestarts = parseIntWithMin(
  process.env.PAPERCLIP_DEV_WATCHDOG_MAX_RESTARTS,
  12,
  1,
);
const watchdogWindowMs = parseIntWithMin(
  process.env.PAPERCLIP_DEV_WATCHDOG_WINDOW_MS,
  120_000,
  1_000,
);
const watchdogResetAfterMs = parseIntWithMin(
  process.env.PAPERCLIP_DEV_WATCHDOG_RESET_AFTER_MS,
  60_000,
  1_000,
);
const watchdogMaxDelayMs = parseIntWithMin(
  process.env.PAPERCLIP_DEV_WATCHDOG_MAX_DELAY_MS,
  15_000,
  500,
);
const watchdogCooldownMs = parseIntWithMin(
  process.env.PAPERCLIP_DEV_WATCHDOG_COOLDOWN_MS,
  30_000,
  1_000,
);
const watchdogFailFast = process.env.PAPERCLIP_DEV_WATCHDOG_FAIL_FAST === "true";

const serverScript = mode === "watch" ? "dev:watch" : "dev";
const serverArgs = ["--filter", "@paperclipai/server", serverScript, ...forwardedArgs];

if (watchdogEnabled) {
  console.log(
    `[paperclip] dev watchdog enabled (max ${watchdogMaxRestarts} restarts / ${watchdogWindowMs}ms window)`,
  );
  if (watchdogFailFast) {
    console.log("[paperclip] dev watchdog fail-fast mode is enabled");
  }
}

let restartAttempt = 0;
const restartTimestamps = [];

while (true) {
  const startedAt = Date.now();
  let exit;
  try {
    exit = await runServerProcess(serverArgs);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[paperclip] failed to start dev server process: ${message}`);
    process.exit(1);
  }

  if (!watchdogEnabled) {
    if (exit.signal) {
      process.kill(process.pid, exit.signal);
      break;
    }
    process.exit(exit.code ?? 0);
  }

  if (exit.signal) {
    process.kill(process.pid, exit.signal);
    break;
  }

  // In dev:once mode, honor clean exit and only auto-restart on failures.
  if (mode === "dev" && (exit.code ?? 0) === 0) {
    process.exit(0);
  }

  const uptimeMs = Date.now() - startedAt;
  if (uptimeMs >= watchdogResetAfterMs) {
    restartAttempt = 0;
    restartTimestamps.length = 0;
  }

  const now = Date.now();
  restartTimestamps.push(now);
  while (restartTimestamps.length > 0 && now - restartTimestamps[0] > watchdogWindowMs) {
    restartTimestamps.shift();
  }

  if (restartTimestamps.length > watchdogMaxRestarts) {
    if (watchdogFailFast) {
      console.error(
        `[paperclip] dev server exited too often (${restartTimestamps.length} exits within ${watchdogWindowMs}ms). Stopping watchdog.`,
      );
      process.exit(exit.code ?? 1);
    }

    console.error(
      `[paperclip] dev server exited too often (${restartTimestamps.length} exits within ${watchdogWindowMs}ms). Cooling down for ${watchdogCooldownMs}ms before retrying.`,
    );
    restartAttempt = 0;
    restartTimestamps.length = 0;
    await sleep(watchdogCooldownMs);
    continue;
  }

  restartAttempt += 1;
  const delayMs = Math.min(
    watchdogMaxDelayMs,
    1_000 * 2 ** Math.min(restartAttempt - 1, 4),
  );
  console.warn(
    `[paperclip] dev server exited with code ${exit.code ?? "unknown"}; restarting in ${delayMs}ms (attempt ${restartAttempt})`,
  );
  await sleep(delayMs);
}
