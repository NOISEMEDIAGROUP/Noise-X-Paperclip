type ModelPricingPerToken = {
  input: number;
  output: number;
};

const MODEL_PRICING_PER_MILLION: Record<string, { input: number; output: number }> = {
  "codex-mini": { input: 1.5, output: 6.0 },
  "codex-mini-latest": { input: 1.5, output: 6.0 },
  "codex-mini-2025-01-31": { input: 1.5, output: 6.0 },
};

const UNKNOWN_MODEL_ESTIMATE_PER_MILLION = { input: 3.0, output: 15.0 };

function toPerTokenPricing(pricingPerMillion: { input: number; output: number }): ModelPricingPerToken {
  return {
    input: pricingPerMillion.input / 1_000_000,
    output: pricingPerMillion.output / 1_000_000,
  };
}

function normalizeModelId(modelId: string): string {
  return modelId.trim().toLowerCase();
}

export function resolveCodexModelPricingPerToken(modelId: string): ModelPricingPerToken {
  const normalizedModelId = normalizeModelId(modelId);
  if (MODEL_PRICING_PER_MILLION[normalizedModelId]) {
    return toPerTokenPricing(MODEL_PRICING_PER_MILLION[normalizedModelId]);
  }
  if (/^codex-mini-\d{4}-\d{2}-\d{2}$/.test(normalizedModelId)) {
    return toPerTokenPricing(MODEL_PRICING_PER_MILLION["codex-mini"]);
  }

  console.warn(`Unknown model pricing: ${modelId}, using estimate`);
  return toPerTokenPricing(UNKNOWN_MODEL_ESTIMATE_PER_MILLION);
}

export function calculateCodexUsageCostUsd(
  modelId: string,
  usage: { inputTokens: number; cachedInputTokens: number; outputTokens: number },
): number {
  const pricing = resolveCodexModelPricingPerToken(modelId);
  const inputTokens = Math.max(0, Math.floor(usage.inputTokens));
  const cachedInputTokens = Math.max(0, Math.floor(usage.cachedInputTokens));
  const outputTokens = Math.max(0, Math.floor(usage.outputTokens));
  const billableInputTokens = inputTokens + cachedInputTokens;

  const totalCost = (billableInputTokens * pricing.input) + (outputTokens * pricing.output);
  return Math.round(totalCost * 1_000_000) / 1_000_000;
}
