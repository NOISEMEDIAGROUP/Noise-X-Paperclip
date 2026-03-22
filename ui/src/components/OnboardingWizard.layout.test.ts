// @vitest-environment node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const onboardingWizardSource = fs.readFileSync(
  path.resolve(__dirname, "OnboardingWizard.tsx"),
  "utf8",
);

describe("OnboardingWizard responsive layout contract", () => {
  it("keeps mobile-first spacing and wrapping classes for onboarding flow", () => {
    expect(onboardingWizardSource).toContain("px-4 sm:px-6 md:px-8 py-8 sm:py-12");
    expect(onboardingWizardSource).toContain("mb-8 -mx-1 border-b border-border px-1 overflow-x-auto");
    expect(onboardingWizardSource).toContain("grid grid-cols-1 sm:grid-cols-2 gap-2");
    expect(onboardingWizardSource).toContain("flex flex-wrap items-center justify-between gap-2 mt-8");
    expect(onboardingWizardSource).toContain("flex items-center gap-2 ml-auto");
    expect(onboardingWizardSource).toContain('role="tablist"');
    expect(onboardingWizardSource).toContain('aria-label="Onboarding steps"');
    expect(onboardingWizardSource).toContain('aria-orientation="horizontal"');
    expect(onboardingWizardSource).toContain('id={getOnboardingStepTabId(s)}');
    expect(onboardingWizardSource).toContain('aria-controls={`onboarding-step-${s}-panel`}');
    expect(onboardingWizardSource).toContain('role="tab"');
    expect(onboardingWizardSource).toContain('onKeyDown={(event) => handleStepTabKeyDown(event, s)}');
    expect(onboardingWizardSource).toContain('aria-selected={s === step}');
    expect(onboardingWizardSource).toContain('aria-current={s === step ? "step" : undefined}');
    expect(onboardingWizardSource).toContain('tabIndex={s === step ? 0 : -1}');
    expect(onboardingWizardSource).toContain('role="tabpanel"');
    expect(onboardingWizardSource).toContain('aria-labelledby="onboarding-step-1-tab"');
    expect(onboardingWizardSource).toContain('getNextOnboardingStep(currentStep, event.key)');
    expect(onboardingWizardSource).toContain("focusOnboardingStepTab(nextStep)");
    expect(onboardingWizardSource).toContain('adapterEnvError && (');
    expect(onboardingWizardSource).toContain("border-destructive/30 bg-destructive/10");
    expect(onboardingWizardSource).toContain('role="alert"');
    expect(onboardingWizardSource).toContain('aria-live="polite"');
  });
});
