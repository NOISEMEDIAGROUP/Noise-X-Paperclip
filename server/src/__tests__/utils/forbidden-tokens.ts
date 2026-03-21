/**
 * Test utilities for forbidden tokens functionality
 * Replicated from ../scripts/check-forbidden-tokens.mjs but without shebang
 */

export function resolveDynamicForbiddenTokens(env: NodeJS.ProcessEnv = process.env, osModule: any = require('node:os')) {
  const candidates = [env.USER, env.LOGNAME, env.USERNAME];

  try {
    candidates.push(osModule.userInfo().username);
  } catch {
    // Some environments do not expose userInfo; env vars are enough fallback.
  }

  return uniqueNonEmpty(candidates);
}

export function readForbiddenTokensFile(tokensFile: string) {
  const fs = require('node:fs');
  if (!fs.existsSync(tokensFile)) return [];

  return fs.readFileSync(tokensFile, "utf8")
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line && !line.startsWith("#"));
}

export function resolveForbiddenTokens(tokensFile: string, env: NodeJS.ProcessEnv = process.env, osModule: any = require('node:os')) {
  return uniqueNonEmpty([
    ...resolveDynamicForbiddenTokens(env, osModule),
    ...readForbiddenTokensFile(tokensFile),
  ]);
}

export function runForbiddenTokenCheck({
  repoRoot,
  tokens,
  exec = require('node:child_process').execSync,
  log = console.log,
  error = console.error,
}: {
  repoRoot: string;
  tokens: string[];
  exec?: any;
  log?: any;
  error?: any;
}) {
  if (tokens.length === 0) {
    log("  ℹ  Forbidden tokens list is empty — skipping check.");
    return 0;
  }

  let found = false;

  for (const token of tokens) {
    try {
      const result = exec(
        `git grep -in --no-color -- ${JSON.stringify(token)} -- ':!pnpm-lock.yaml' ':!.git'`,
        { encoding: "utf8", cwd: repoRoot, stdio: ["pipe", "pipe", "pipe"] },
      );
      if (result.trim()) {
        if (!found) {
          error("ERROR: Forbidden tokens found in tracked files:\n");
        }
        found = true;
        const lines = result.trim().split("\n");
        for (const line of lines) {
          error(`  ${line}`);
        }
      }
    } catch {
      // git grep returns exit code 1 when no matches — that's fine
    }
  }

  if (found) {
    error("\nBuild blocked. Remove the forbidden token(s) before publishing.");
    return 1;
  }

  log("  ✓  No forbidden tokens found.");
  return 0;
}

function uniqueNonEmpty(values: (string | undefined)[]): string[] {
  return Array.from(new Set(values.map((value) => value?.trim() ?? "").filter(Boolean)));
}