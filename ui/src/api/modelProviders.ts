import { api } from "./client";

export type ProviderId = "openai" | "anthropic" | "alibaba" | "groq" | "xai" | "minimax";

export interface DiscoveredModel {
  id: string;
  label: string;
}

export interface DiscoverModelsResponse {
  provider: ProviderId;
  label: string;
  secretName: string;
  endpoint: string;
  baseUrl?: string;
  validatedModel?: string;
  models: DiscoveredModel[];
  attempts: Array<{
    endpoint: string;
    ok: boolean;
    status: number | null;
    error: string | null;
  }>;
  detectedAt: string;
}

export const modelProvidersApi = {
  discoverModels: (companyId: string, provider: ProviderId, opts?: { model?: string }) =>
    api.get<DiscoverModelsResponse>(
      `/companies/${companyId}/model-providers/${encodeURIComponent(provider)}/models${
        opts?.model ? `?model=${encodeURIComponent(opts.model)}` : ""
      }`,
    ),
};
