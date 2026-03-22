// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";

import { focusOnboardingStepTab, getOnboardingStepTabId } from "./onboarding-step-nav";

describe("focusOnboardingStepTab (dom)", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("moves browser focus to the resolved onboarding tab element", () => {
    const tabId = getOnboardingStepTabId(2);

    document.body.innerHTML = `
      <button id="${getOnboardingStepTabId(1)}">Step 1</button>
      <button id="${tabId}">Step 2</button>
    `;

    const target = document.getElementById(tabId);
    expect(target).not.toBeNull();

    focusOnboardingStepTab(2);

    expect(document.activeElement).toBe(target);
  });
});
