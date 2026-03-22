import { describe, expect, it } from "vitest";

import {
  focusOnboardingStepTab,
  getNextOnboardingStep,
  getOnboardingStepTabId,
} from "./onboarding-step-nav";

describe("getNextOnboardingStep", () => {
  it("moves right and wraps from step 4 to step 1", () => {
    expect(getNextOnboardingStep(1, "ArrowRight")).toBe(2);
    expect(getNextOnboardingStep(4, "ArrowRight")).toBe(1);
  });

  it("moves left and wraps from step 1 to step 4", () => {
    expect(getNextOnboardingStep(3, "ArrowLeft")).toBe(2);
    expect(getNextOnboardingStep(1, "ArrowLeft")).toBe(4);
  });

  it("supports Home and End shortcuts", () => {
    expect(getNextOnboardingStep(3, "Home")).toBe(1);
    expect(getNextOnboardingStep(2, "End")).toBe(4);
  });

  it("ignores unrelated keys", () => {
    expect(getNextOnboardingStep(2, "Enter")).toBeNull();
    expect(getNextOnboardingStep(2, "Tab")).toBeNull();
  });

  it("returns null for out-of-range step values", () => {
    expect(getNextOnboardingStep(0 as 1 | 2 | 3 | 4, "ArrowRight")).toBeNull();
    expect(getNextOnboardingStep(5 as 1 | 2 | 3 | 4, "ArrowLeft")).toBeNull();
  });
});

describe("onboarding tab focus helpers", () => {
  it("builds stable tab ids for each onboarding step", () => {
    expect(getOnboardingStepTabId(1)).toBe("onboarding-step-1-tab");
    expect(getOnboardingStepTabId(4)).toBe("onboarding-step-4-tab");
  });

  it("focuses the resolved tab when available", () => {
    const focus = { focus: 0 };
    const focusTarget = {
      focus: () => {
        focus.focus += 1;
      },
    };
    const getElementById = (id: string) =>
      id === "onboarding-step-2-tab" ? focusTarget : null;

    focusOnboardingStepTab(2, getElementById);

    expect(focus.focus).toBe(1);
  });

  it("does nothing when no tab is found", () => {
    const getElementById = () => null;

    expect(() => focusOnboardingStepTab(3, getElementById)).not.toThrow();
  });
});
