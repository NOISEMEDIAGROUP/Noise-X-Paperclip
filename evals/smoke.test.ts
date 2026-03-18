import { describe, it, expect } from "vitest";
import { runScenario } from "./runners/scenario-runner.js";
import * as coreCases from "./cases/core/index.js";

describe("Evals Smoke Suite", () => {
  const cases = Object.values(coreCases);

  for (const evalCase of cases) {
    it(`${evalCase.id}: ${evalCase.description}`, () => {
      const trace = runScenario(evalCase);
      expect(trace.passed, `Failed checks: ${trace.failedChecks.join(", ")}`).toBe(true);
      expect(trace.durationMs).toBeLessThan(5000);
    });
  }

  it("should have exactly 5 core cases", () => {
    expect(cases).toHaveLength(5);
  });
});
