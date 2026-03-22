export type OnboardingStep = 1 | 2 | 3 | 4;

const ONBOARDING_STEPS: OnboardingStep[] = [1, 2, 3, 4];

export function getOnboardingStepTabId(step: OnboardingStep): string {
  return `onboarding-step-${step}-tab`;
}

export function focusOnboardingStepTab(
  step: OnboardingStep,
  getElementById: (id: string) => { focus: () => void } | null = (id) =>
    document.getElementById(id) as HTMLElement | null,
): void {
  const tabId = getOnboardingStepTabId(step);
  const tab = getElementById(tabId);
  tab?.focus();
}

export function getNextOnboardingStep(
  currentStep: OnboardingStep,
  key: string,
): OnboardingStep | null {
  const currentIndex = ONBOARDING_STEPS.indexOf(currentStep);
  if (currentIndex === -1) return null;

  if (key === "ArrowRight") {
    return ONBOARDING_STEPS[(currentIndex + 1) % ONBOARDING_STEPS.length] ?? null;
  }

  if (key === "ArrowLeft") {
    return ONBOARDING_STEPS[(currentIndex - 1 + ONBOARDING_STEPS.length) % ONBOARDING_STEPS.length] ?? null;
  }

  if (key === "Home") {
    return ONBOARDING_STEPS[0] ?? null;
  }

  if (key === "End") {
    return ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1] ?? null;
  }

  return null;
}
