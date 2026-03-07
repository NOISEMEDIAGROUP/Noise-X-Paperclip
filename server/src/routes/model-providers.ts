import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { assertBoard, assertCompanyAccess } from "./authz.js";
import { secretService } from "../services/index.js";

type ProviderId = "openai" | "anthropic" | "alibaba" | "groq" | "xai" | "minimax";

type ProviderProfile = {
  id: ProviderId;
  label: string;
  secretNames: string[];
  modelEndpoints: string[];
  chatValidationEndpoints?: string[];
  catalogModels?: ModelDescriptor[];
  authMode: "bearer" | "x-api-key";
  extraHeaders?: Record<string, string>;
};

type ModelDescriptor = {
  id: string;
  label: string;
};

type ProbeAttempt = {
  endpoint: string;
  ok: boolean;
  status: number | null;
  error: string | null;
};

const PROVIDERS: Record<ProviderId, ProviderProfile> = {
  openai: {
    id: "openai",
    label: "OpenAI",
    secretNames: ["provider-openai-api-key", "openai-api-key"],
    modelEndpoints: ["https://api.openai.com/v1/models"],
    authMode: "bearer",
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic",
    secretNames: ["provider-anthropic-api-key", "anthropic-api-key"],
    modelEndpoints: ["https://api.anthropic.com/v1/models"],
    authMode: "x-api-key",
    extraHeaders: { "anthropic-version": "2023-06-01" },
  },
  alibaba: {
    id: "alibaba",
    label: "Alibaba DashScope",
    secretNames: ["provider-alibaba-api-key", "alibaba-api-key"],
    modelEndpoints: [
      "https://coding-intl.dashscope.aliyuncs.com/v1/models",
      "https://coding.dashscope.aliyuncs.com/v1/models",
      "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models",
      "https://dashscope.aliyuncs.com/compatible-mode/v1/models",
    ],
    chatValidationEndpoints: [
      "https://coding-intl.dashscope.aliyuncs.com/v1/chat/completions",
      "https://coding.dashscope.aliyuncs.com/v1/chat/completions",
    ],
    catalogModels: [
      { id: "qwen3.5-plus", label: "qwen3.5-plus" },
      { id: "qwen3-max-2026-01-23", label: "qwen3-max-2026-01-23" },
      { id: "qwen3-coder-next", label: "qwen3-coder-next" },
      { id: "qwen3-coder-plus", label: "qwen3-coder-plus" },
      { id: "glm-5", label: "glm-5" },
      { id: "glm-4.7", label: "glm-4.7" },
      { id: "kimi-k2.5", label: "kimi-k2.5" },
      { id: "MiniMax-M2.5", label: "MiniMax-M2.5" },
    ],
    authMode: "bearer",
  },
  groq: {
    id: "groq",
    label: "Groq",
    secretNames: ["provider-groq-api-key", "groq-api-key"],
    modelEndpoints: ["https://api.groq.com/openai/v1/models"],
    authMode: "bearer",
  },
  xai: {
    id: "xai",
    label: "xAI",
    secretNames: ["provider-xai-api-key", "xai-api-key"],
    modelEndpoints: ["https://api.x.ai/v1/models"],
    authMode: "bearer",
  },
  minimax: {
    id: "minimax",
    label: "MiniMax",
    secretNames: ["provider-minimax-api-key", "minimax-api-key"],
    modelEndpoints: [
      "https://api.minimax.chat/v1/models",
      "https://api.minimaxi.chat/openapi/v1/models",
    ],
    authMode: "bearer",
  },
};

function isProviderId(value: string): value is ProviderId {
  return Object.prototype.hasOwnProperty.call(PROVIDERS, value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function extractModels(payload: unknown): ModelDescriptor[] {
  const candidates: unknown[] = [];

  if (Array.isArray(payload)) candidates.push(payload);

  const root = asRecord(payload);
  if (root) {
    if (Array.isArray(root.data)) candidates.push(root.data);
    if (Array.isArray(root.models)) candidates.push(root.models);

    const output = asRecord(root.output);
    if (output) {
      if (Array.isArray(output.models)) candidates.push(output.models);
      if (Array.isArray(output.data)) candidates.push(output.data);
    }

    const result = asRecord(root.result);
    if (result && Array.isArray(result.models)) candidates.push(result.models);
  }

  const map = new Map<string, ModelDescriptor>();

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    for (const item of candidate) {
      const rec = asRecord(item);
      if (!rec) continue;
      const idRaw = rec.id ?? rec.model ?? rec.name;
      if (typeof idRaw !== "string" || idRaw.trim().length === 0) continue;
      const id = idRaw.trim();
      const labelRaw = rec.display_name ?? rec.label ?? rec.name ?? rec.id;
      const label = typeof labelRaw === "string" && labelRaw.trim().length > 0 ? labelRaw.trim() : id;
      if (!map.has(id)) {
        map.set(id, { id, label });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));
}

function buildAuthHeaders(profile: ProviderProfile, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(profile.extraHeaders ?? {}),
  };

  if (profile.authMode === "bearer") {
    headers.Authorization = `Bearer ${apiKey}`;
  } else {
    headers["x-api-key"] = apiKey;
  }

  return headers;
}

async function probeModels(
  endpoint: string,
  profile: ProviderProfile,
  apiKey: string,
): Promise<{ attempt: ProbeAttempt; models: ModelDescriptor[] }> {
  const headers = buildAuthHeaders(profile, apiKey);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const rec = asRecord(parsed);
      const errObj = asRecord(rec?.error);
      const errMsg =
        (typeof errObj?.message === "string" && errObj.message) ||
        (typeof rec?.message === "string" && rec.message) ||
        `HTTP ${response.status}`;
      return {
        attempt: {
          endpoint,
          ok: false,
          status: response.status,
          error: errMsg,
        },
        models: [],
      };
    }

    const models = extractModels(parsed);
    if (models.length === 0) {
      return {
        attempt: {
          endpoint,
          ok: false,
          status: response.status,
          error: "No models found in provider response",
        },
        models: [],
      };
    }

    return {
      attempt: {
        endpoint,
        ok: true,
        status: response.status,
        error: null,
      },
      models,
    };
  } catch (error) {
    return {
      attempt: {
        endpoint,
        ok: false,
        status: null,
        error: error instanceof Error ? error.message : "Request failed",
      },
      models: [],
    };
  } finally {
    clearTimeout(timer);
  }
}

async function probeChatValidation(
  endpoint: string,
  profile: ProviderProfile,
  apiKey: string,
  model: string,
): Promise<ProbeAttempt> {
  const headers: Record<string, string> = {
    ...buildAuthHeaders(profile, apiKey),
    "Content-Type": "application/json",
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
        temperature: 0,
      }),
    });
    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const rec = asRecord(parsed);
      const errObj = asRecord(rec?.error);
      const errMsg =
        (typeof errObj?.message === "string" && errObj.message) ||
        (typeof rec?.message === "string" && rec.message) ||
        `HTTP ${response.status}`;
      return {
        endpoint,
        ok: false,
        status: response.status,
        error: errMsg,
      };
    }

    return {
      endpoint,
      ok: true,
      status: response.status,
      error: null,
    };
  } catch (error) {
    return {
      endpoint,
      ok: false,
      status: null,
      error: error instanceof Error ? error.message : "Request failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

export function modelProviderRoutes(db: Db) {
  const router = Router();
  const secretsSvc = secretService(db);

  router.get("/companies/:companyId/model-providers/:provider/models", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const providerParam = (req.params.provider as string).toLowerCase();
    if (!isProviderId(providerParam)) {
      res.status(404).json({ error: `Unknown provider: ${providerParam}` });
      return;
    }

    const profile = PROVIDERS[providerParam];
    const requestedProbeModel =
      typeof req.query.model === "string" && req.query.model.trim().length > 0
        ? req.query.model.trim()
        : null;

    let apiKey: string | null = null;
    let usedSecretName: string | null = null;
    for (const secretName of profile.secretNames) {
      const resolved = await secretsSvc.resolveSecretValueByName(companyId, secretName, "latest");
      if (resolved && resolved.trim().length > 0) {
        apiKey = resolved.trim();
        usedSecretName = secretName;
        break;
      }
    }

    if (!apiKey || !usedSecretName) {
      res.status(404).json({
        error: `No API key secret found for ${profile.label}`,
        expectedSecretNames: profile.secretNames,
      });
      return;
    }

    const attempts: ProbeAttempt[] = [];
    for (const endpoint of profile.modelEndpoints) {
      const { attempt, models } = await probeModels(endpoint, profile, apiKey);
      attempts.push(attempt);
      if (attempt.ok) {
        res.json({
          provider: profile.id,
          label: profile.label,
          secretName: usedSecretName,
          endpoint,
          baseUrl: endpoint.replace(/\/models\/?$/, ""),
          models,
          attempts,
          detectedAt: new Date().toISOString(),
        });
        return;
      }
    }

    if (profile.catalogModels && profile.catalogModels.length > 0 && profile.chatValidationEndpoints) {
      const probeModel = requestedProbeModel ?? profile.catalogModels[0]?.id;
      if (probeModel) {
        for (const endpoint of profile.chatValidationEndpoints) {
          const attempt = await probeChatValidation(endpoint, profile, apiKey, probeModel);
          attempts.push(attempt);
          if (attempt.ok) {
            res.json({
              provider: profile.id,
              label: profile.label,
              secretName: usedSecretName,
              endpoint,
              baseUrl: endpoint.replace(/\/chat\/completions\/?$/, ""),
              models: profile.catalogModels,
              validatedModel: probeModel,
              attempts,
              detectedAt: new Date().toISOString(),
            });
            return;
          }
        }
      }
    }

    res.status(502).json({
      error: `Failed to discover models for ${profile.label}`,
      provider: profile.id,
      secretName: usedSecretName,
      attempts,
    });
  });

  return router;
}
