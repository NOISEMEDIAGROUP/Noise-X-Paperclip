/**
 * Cost estimation for Vercel Sandbox + Claude API sessions.
 *
 * Pricing sources (as of 2025):
 *   - Active CPU:        ~$0.13 / vCPU-hour
 *   - Provisioned Memory: ~$0.043 / GB-hour
 *   - Sandbox Creation:   $0.0000006 per creation
 *   - Claude API:         per-model token pricing
 */

import type { TokenUsage } from "./types.js";

// ---------------------------------------------------------------------------
// Pricing constants
// ---------------------------------------------------------------------------

const VCPU_HOUR_COST = 0.13;
const MEMORY_GB_HOUR_COST = 0.043;
const MEMORY_PER_VCPU_GB = 2;
const CREATION_FEE = 0.0000006;

/** Model pricing (input / output per million tokens). */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-4-6": { input: 15.0, output: 75.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-haiku-4-6": { input: 0.8, output: 4.0 },
  "claude-haiku-4-5-20251001": { input: 0.8, output: 4.0 },
};

const DEFAULT_MODEL = "claude-sonnet-4-6";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface CostBreakdown {
  sandboxComputeCost: number;
  sandboxMemoryCost: number;
  sandboxCreationCost: number;
  apiCost: number;
  totalCost: number;
}

export function estimateSessionCost(params: {
  durationMs: number;
  vcpus: number;
  usage?: TokenUsage;
  model?: string;
  cpuUtilizationFactor?: number;
}): CostBreakdown {
  const {
    durationMs,
    vcpus,
    usage,
    model = DEFAULT_MODEL,
    cpuUtilizationFactor = 0.25,
  } = params;

  const wallClockHours = durationMs / (1000 * 60 * 60);
  const activeHours = wallClockHours * cpuUtilizationFactor;

  const sandboxComputeCost = round(activeHours * vcpus * VCPU_HOUR_COST);
  const memoryGb = vcpus * MEMORY_PER_VCPU_GB;
  const sandboxMemoryCost = round(wallClockHours * memoryGb * MEMORY_GB_HOUR_COST);
  const sandboxCreationCost = CREATION_FEE;

  let apiCost = 0;
  if (usage) {
    const pricing = MODEL_PRICING[model] ?? MODEL_PRICING[DEFAULT_MODEL]!;
    apiCost += (usage.inputTokens / 1_000_000) * pricing.input;
    apiCost += (usage.outputTokens / 1_000_000) * pricing.output;
    apiCost = round(apiCost);
  }

  return {
    sandboxComputeCost,
    sandboxMemoryCost,
    sandboxCreationCost,
    apiCost,
    totalCost: round(sandboxComputeCost + sandboxMemoryCost + sandboxCreationCost + apiCost),
  };
}

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
