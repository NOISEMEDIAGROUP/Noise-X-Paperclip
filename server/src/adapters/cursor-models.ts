import type { AdapterModel } from "./types.js";
import { models as cursorFallbackModels } from "@paperclipai/adapter-cursor-local";
import { runChildProcess } from "@paperclipai/adapter-utils/server-utils";
import { logger } from "../middleware/logger.js";

const CURSOR_MODELS_ENDPOINT = "https://api.cursor.com/v0/models";
const CURSOR_MODELS_TIMEOUT_MS = 5000;
const CURSOR_MODELS_CACHE_TTL_MS = 60_000;
const CURSOR_CLI_MODELS_TIMEOUT_SEC = 15;
const CURSOR_CLI_DEFAULT_COMMAND = "agent";

type CacheEntry =
  | { source: "cli"; expiresAt: number; models: AdapterModel[] }
  | { source: "api"; keyFingerprint: string; expiresAt: number; models: AdapterModel[] };
let cached: CacheEntry | null = null;

function fingerprint(apiKey: string): string {
  return `${apiKey.length}:${apiKey.slice(-6)}`;
}

function dedupeModels(models: AdapterModel[]): AdapterModel[] {
  const seen = new Set<string>();
  const deduped: AdapterModel[] = [];
  for (const model of models) {
    const id = model.id.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    deduped.push({ id, label: model.label?.trim() || id });
  }
  return deduped;
}

function mergedWithFallback(models: AdapterModel[]): AdapterModel[] {
  return dedupeModels([...models, ...cursorFallbackModels]).sort((a, b) =>
    a.id.localeCompare(b.id, "en", { numeric: true, sensitivity: "base" }),
  );
}

/**
 * Parse stdout from `agent models` (or `agent --list-models`).
 * Lines are like: "gpt-5.3-codex - GPT-5.3 Codex" or "auto - Auto  (current)".
 */
function parseCliModelsOutput(stdout: string): AdapterModel[] {
  const models: AdapterModel[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const dashIndex = trimmed.indexOf(" - ");
    if (dashIndex <= 0) continue;
    const id = trimmed.slice(0, dashIndex).trim();
    let label = trimmed.slice(dashIndex + 3).trim();
    if (!id) continue;
    label = label.replace(/\s*\((current|default)\)\s*$/i, "").trim();
    models.push({ id, label: label || id });
  }
  return dedupeModels(models);
}

/**
 * List models via Cursor CLI (`agent models`). Returns the same full list the user sees in the terminal.
 * Uses process.env (including CURSOR_API_KEY if set or agent login).
 */
async function fetchCursorModelsViaCli(command: string): Promise<AdapterModel[]> {
  const runId = `cursor-models-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  try {
    const result = await runChildProcess(runId, command, ["models"], {
      cwd: process.cwd(),
      env: {},
      timeoutSec: CURSOR_CLI_MODELS_TIMEOUT_SEC,
      graceSec: 2,
      onLog: async () => {},
    });
    if ((result.exitCode ?? 1) !== 0) return [];
    return parseCliModelsOutput(result.stdout);
  } catch (err) {
    logger.debug({ err, command }, "Cursor CLI list models failed");
    return [];
  }
}

function resolveCursorApiKey(): string | null {
  const envKey = process.env.CURSOR_API_KEY?.trim();
  return envKey && envKey.length > 0 ? envKey : null;
}

/**
 * Cloud API returns only a small "recommended subset" (e.g. 4 models). Use when CLI is not available.
 */
async function fetchCursorModelsViaApi(apiKey: string): Promise<AdapterModel[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CURSOR_MODELS_TIMEOUT_MS);
  try {
    const auth = Buffer.from(`${apiKey}:`, "utf8").toString("base64");
    const response = await fetch(CURSOR_MODELS_ENDPOINT, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
      signal: controller.signal,
    });
    if (!response.ok) return [];

    const payload = (await response.json()) as { models?: unknown };
    const data = Array.isArray(payload.models) ? payload.models : [];
    const models: AdapterModel[] = [];
    for (const item of data) {
      if (typeof item !== "string" || item.trim().length === 0) continue;
      models.push({ id: item.trim(), label: item.trim() });
    }
    return dedupeModels(models);
  } catch (err) {
    logger.warn({ err }, "Cursor API list models request failed");
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function listCursorModels(): Promise<AdapterModel[]> {
  const now = Date.now();
  const fallback = dedupeModels(cursorFallbackModels);

  if (cached && cached.expiresAt > now) {
    if (cached.source === "api") {
      const apiKey = resolveCursorApiKey();
      if (apiKey && cached.keyFingerprint === fingerprint(apiKey)) return cached.models;
    } else {
      return cached.models;
    }
  }

  // 1) Prefer CLI: same full list as `agent models` in the terminal (API only returns a small subset).
  const cliModels = await fetchCursorModelsViaCli(CURSOR_CLI_DEFAULT_COMMAND);
  if (cliModels.length > 0) {
    const merged = mergedWithFallback(cliModels);
    cached = {
      source: "cli",
      expiresAt: now + CURSOR_MODELS_CACHE_TTL_MS,
      models: merged,
    };
    logger.debug({ count: merged.length }, "Cursor models from CLI");
    return merged;
  }

  // 2) Fall back to Cloud API (recommended subset only) when CURSOR_API_KEY is set.
  const apiKey = resolveCursorApiKey();
  if (apiKey) {
    const apiModels = await fetchCursorModelsViaApi(apiKey);
    if (apiModels.length > 0) {
      const merged = mergedWithFallback(apiModels);
      cached = {
        source: "api",
        keyFingerprint: fingerprint(apiKey),
        expiresAt: now + CURSOR_MODELS_CACHE_TTL_MS,
        models: merged,
      };
      logger.info(
        { count: merged.length, source: "api" },
        "Cursor models from API (subset; use CLI for full list)",
      );
      return merged;
    }
  }

  if (cached && cached.models.length > 0) return cached.models;
  return fallback;
}

export function resetCursorModelsCacheForTests() {
  cached = null;
}
