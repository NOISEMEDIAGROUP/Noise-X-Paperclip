export type ModelPricing = {
  inputPer1M: number;
  outputPer1M: number;
  cacheHitDiscount: number;
};

export type ProviderPricing = Record<string, ModelPricing>;

export const MODEL_PRICING: Record<string, ProviderPricing> = {
  alibaba: {
    "qwen3.5-plus": { inputPer1M: 0.5, outputPer1M: 1.5, cacheHitDiscount: 0.5 },
    "qwen3-coder-plus": { inputPer1M: 0.8, outputPer1M: 2.0, cacheHitDiscount: 0.5 },
    "qwen3-coder-next": { inputPer1M: 1.0, outputPer1M: 3.0, cacheHitDiscount: 0.5 },
    "qwen3-max-2026-01-23": { inputPer1M: 2.0, outputPer1M: 8.0, cacheHitDiscount: 0.5 },
    "glm-5": { inputPer1M: 0.8, outputPer1M: 2.0, cacheHitDiscount: 0.5 },
    "glm-4.7": { inputPer1M: 0.4, outputPer1M: 1.2, cacheHitDiscount: 0.5 },
    "kimi-k2.5": { inputPer1M: 0.6, outputPer1M: 1.8, cacheHitDiscount: 0.5 },
    "MiniMax-M2.5": { inputPer1M: 0.5, outputPer1M: 1.5, cacheHitDiscount: 0.5 },
  },
  openai: {
    "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10.0, cacheHitDiscount: 0.9 },
    "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6, cacheHitDiscount: 0.9 },
    "gpt-4-turbo": { inputPer1M: 10.0, outputPer1M: 30.0, cacheHitDiscount: 0.9 },
    "gpt-4": { inputPer1M: 30.0, outputPer1M: 60.0, cacheHitDiscount: 0.9 },
    "o1": { inputPer1M: 15.0, outputPer1M: 60.0, cacheHitDiscount: 0 },
    "o1-mini": { inputPer1M: 3.0, outputPer1M: 12.0, cacheHitDiscount: 0 },
    "o3-mini": { inputPer1M: 1.1, outputPer1M: 4.4, cacheHitDiscount: 0 },
  },
  anthropic: {
    "claude-sonnet-4-20250514": { inputPer1M: 3.0, outputPer1M: 15.0, cacheHitDiscount: 0.9 },
    "claude-3-5-sonnet-20241022": { inputPer1M: 3.0, outputPer1M: 15.0, cacheHitDiscount: 0.9 },
    "claude-3-5-haiku-20241022": { inputPer1M: 0.8, outputPer1M: 4.0, cacheHitDiscount: 0.9 },
    "claude-3-opus-20240229": { inputPer1M: 15.0, outputPer1M: 75.0, cacheHitDiscount: 0.9 },
    "claude-3-haiku-20240307": { inputPer1M: 0.25, outputPer1M: 1.25, cacheHitDiscount: 0.9 },
  },
  groq: {
    "llama-3.1-70b-versatile": { inputPer1M: 0.7, outputPer1M: 0.8, cacheHitDiscount: 0 },
    "llama-3.1-8b-instant": { inputPer1M: 0.05, outputPer1M: 0.08, cacheHitDiscount: 0 },
    "mixtral-8x7b-32768": { inputPer1M: 0.24, outputPer1M: 0.24, cacheHitDiscount: 0 },
  },
  xai: {
    "grok-2": { inputPer1M: 1.0, outputPer1M: 5.0, cacheHitDiscount: 0 },
    "grok-2-vision-1212": { inputPer1M: 1.0, outputPer1M: 5.0, cacheHitDiscount: 0 },
    "grok-beta": { inputPer1M: 5.0, outputPer1M: 15.0, cacheHitDiscount: 0 },
  },
  minimax: {
    "abab6.5s-chat": { inputPer1M: 0.4, outputPer1M: 1.2, cacheHitDiscount: 0.5 },
    "abab6.5g-chat": { inputPer1M: 0.8, outputPer1M: 2.4, cacheHitDiscount: 0.5 },
  },
};

export interface CostCalculationInput {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
}

export function calculateCost(input: CostCalculationInput): number | null {
  const providerPricing = MODEL_PRICING[input.provider];
  if (!providerPricing) return null;

  const modelPricing = providerPricing[input.model];
  if (!modelPricing) return null;

  const { inputPer1M, outputPer1M, cacheHitDiscount } = modelPricing;
  const { inputTokens, outputTokens, cachedInputTokens = 0 } = input;

  const cachedTokens = Math.min(cachedInputTokens, inputTokens);
  const nonCachedTokens = inputTokens - cachedTokens;

  const inputCost = (nonCachedTokens / 1_000_000) * inputPer1M;
  const cachedCost = (cachedTokens / 1_000_000) * inputPer1M * cacheHitDiscount;
  const outputCost = (outputTokens / 1_000_000) * outputPer1M;

  return inputCost + cachedCost + outputCost;
}

export function hasPricing(provider: string, model: string): boolean {
  const providerPricing = MODEL_PRICING[provider];
  if (!providerPricing) return false;
  return model in providerPricing;
}

export function getPricing(provider: string, model: string): ModelPricing | null {
  const providerPricing = MODEL_PRICING[provider];
  if (!providerPricing) return null;
  return providerPricing[model] ?? null;
}