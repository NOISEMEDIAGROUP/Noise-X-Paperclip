import { describe, it, expect } from "vitest";
import { calculateCost, hasPricing, getPricing, MODEL_PRICING } from "../services/pricing.js";

describe("pricing", () => {
  describe("calculateCost", () => {
    it("calculates cost for alibaba qwen3.5-plus", () => {
      const cost = calculateCost({
        provider: "alibaba",
        model: "qwen3.5-plus",
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        cachedInputTokens: 0,
      });
      expect(cost).toBe(2.0);
    });

    it("applies cache discount for alibaba models", () => {
      const cost = calculateCost({
        provider: "alibaba",
        model: "qwen3.5-plus",
        inputTokens: 1_000_000,
        outputTokens: 0,
        cachedInputTokens: 500_000,
      });
      expect(cost).toBeCloseTo(0.375, 3);
    });

    it("returns null for unknown provider", () => {
      const cost = calculateCost({
        provider: "unknown",
        model: "some-model",
        inputTokens: 1000,
        outputTokens: 1000,
      });
      expect(cost).toBeNull();
    });

    it("returns null for unknown model", () => {
      const cost = calculateCost({
        provider: "alibaba",
        model: "unknown-model",
        inputTokens: 1000,
        outputTokens: 1000,
      });
      expect(cost).toBeNull();
    });

    it("handles zero tokens", () => {
      const cost = calculateCost({
        provider: "alibaba",
        model: "qwen3.5-plus",
        inputTokens: 0,
        outputTokens: 0,
      });
      expect(cost).toBe(0);
    });

    it("applies high cache discount for OpenAI models (90%)", () => {
      const cost = calculateCost({
        provider: "openai",
        model: "gpt-4o",
        inputTokens: 1_000_000,
        outputTokens: 0,
        cachedInputTokens: 1_000_000,
      });
      expect(cost).toBe(2.25);
    });

    it("handles subscription billing with no cache discount", () => {
      const cost = calculateCost({
        provider: "openai",
        model: "o1",
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        cachedInputTokens: 500_000,
      });
      expect(cost).toBe(67.5);
    });
  });

  describe("hasPricing", () => {
    it("returns true for known provider and model", () => {
      expect(hasPricing("alibaba", "qwen3.5-plus")).toBe(true);
    });

    it("returns false for unknown provider", () => {
      expect(hasPricing("unknown", "some-model")).toBe(false);
    });

    it("returns false for unknown model", () => {
      expect(hasPricing("alibaba", "unknown-model")).toBe(false);
    });
  });

  describe("getPricing", () => {
    it("returns pricing for known model", () => {
      const pricing = getPricing("alibaba", "qwen3.5-plus");
      expect(pricing).toEqual({
        inputPer1M: 0.5,
        outputPer1M: 1.5,
        cacheHitDiscount: 0.5,
      });
    });

    it("returns null for unknown model", () => {
      expect(getPricing("alibaba", "unknown")).toBeNull();
    });
  });

  describe("MODEL_PRICING", () => {
    it("includes alibaba models", () => {
      expect(MODEL_PRICING.alibaba).toBeDefined();
      expect(Object.keys(MODEL_PRICING.alibaba).length).toBeGreaterThan(0);
    });

    it("includes openai models", () => {
      expect(MODEL_PRICING.openai).toBeDefined();
      expect(Object.keys(MODEL_PRICING.openai).length).toBeGreaterThan(0);
    });

    it("includes anthropic models", () => {
      expect(MODEL_PRICING.anthropic).toBeDefined();
    });
  });
});