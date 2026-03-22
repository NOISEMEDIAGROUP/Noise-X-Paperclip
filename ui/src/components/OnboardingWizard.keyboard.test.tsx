// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  setSelectedCompanyId: vi.fn(),
  closeOnboarding: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: () => ({
    data: [],
    error: null,
    isLoading: false,
    isFetching: false,
  }),
}));

vi.mock("@/lib/router", () => ({
  useLocation: () => ({ pathname: "/onboarding" }),
  useNavigate: () => mocks.navigate,
  useParams: () => ({}),
}));

vi.mock("../context/DialogContext", () => ({
  useDialog: () => ({
    onboardingOpen: true,
    onboardingOptions: {},
    closeOnboarding: mocks.closeOnboarding,
  }),
}));

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({
    companies: [],
    setSelectedCompanyId: mocks.setSelectedCompanyId,
    loading: false,
  }),
}));

vi.mock("../api/companies", () => ({
  companiesApi: { create: vi.fn(), list: vi.fn() },
}));

vi.mock("../api/goals", () => ({
  goalsApi: { create: vi.fn() },
}));

vi.mock("../api/agents", () => ({
  agentsApi: {
    create: vi.fn(),
    adapterModels: vi.fn().mockResolvedValue([]),
    testEnvironment: vi.fn(),
  },
}));

vi.mock("../api/issues", () => ({
  issuesApi: { create: vi.fn() },
}));

vi.mock("../adapters", () => ({
  getUIAdapter: () => ({
    label: "Mock adapter",
    buildAdapterConfig: () => ({}),
  }),
}));

vi.mock("./AsciiArtAnimation", () => ({
  AsciiArtAnimation: () => <div data-testid="ascii-art" />,
}));

vi.mock("./agent-config-primitives", () => ({
  HintIcon: () => <span data-testid="hint-icon" />,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <>{children}</> : null,
  DialogPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogOverlay: () => <div />,
  DialogClose: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  DialogTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

import { OnboardingWizard } from "./OnboardingWizard";

describe("OnboardingWizard keyboard tabs", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("moves focus and selection to the next step tab on ArrowRight", () => {
    act(() => {
      root.render(<OnboardingWizard />);
    });

    const companyTab = container.querySelector("#onboarding-step-1-tab");
    const agentTab = container.querySelector("#onboarding-step-2-tab");

    if (!(companyTab instanceof HTMLButtonElement) || !(agentTab instanceof HTMLButtonElement)) {
      throw new Error("Expected onboarding step tab buttons to be rendered.");
    }

    companyTab.focus();
    expect(companyTab.getAttribute("aria-selected")).toBe("true");

    act(() => {
      companyTab.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
    });

    expect(agentTab.getAttribute("aria-selected")).toBe("true");
    expect(agentTab.getAttribute("tabindex")).toBe("0");
    expect(companyTab.getAttribute("aria-selected")).toBe("false");
    expect(companyTab.getAttribute("tabindex")).toBe("-1");
  });
});
