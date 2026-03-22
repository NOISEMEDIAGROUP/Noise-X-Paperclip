import { describe, expect, it } from "vitest";
import { assessGovernedAction, recommendedRuntimePolicy } from "../services/governance.js";

describe("governance service", () => {
  it("builds recommended CEO runtime policy", () => {
    const policy = recommendedRuntimePolicy({ role: "ceo", budgetMonthlyCents: 0 });
    expect(policy.mode).toBe("hybrid");
    expect(policy.classes).toContain("guardian");
    expect(policy.allowedActions).toContain("create_objective");
    expect(policy.budgets.monthlyCents).toBeGreaterThan(0);
  });

  it("requires approval when spend threshold is exceeded", () => {
    const policy = recommendedRuntimePolicy({ role: "engineer", budgetMonthlyCents: 1200 });
    const assessment = assessGovernedAction(
      {
        id: "agent-1",
        companyId: "company-1",
        role: "engineer",
        budgetMonthlyCents: 1200,
        mode: policy.mode,
        classes: policy.classes,
        runtimeEnvironment: policy.environment,
        runtimePolicy: policy,
      },
      {
        agentId: "agent-1",
        actionId: "open_pr",
        reason: "Prepare the implementation for review",
        moneyImpactCents: 6000,
        rollbackPlan: "Close the pull request",
      },
    );

    expect(assessment.disposition).toBe("require_approval");
    expect(assessment.requiresApproval).toBe(true);
    expect(assessment.moneyImpactCents).toBe(6000);
  });

  it("blocks actions outside the allowed set", () => {
    const policy = recommendedRuntimePolicy({ role: "cfo", budgetMonthlyCents: 400 });
    const assessment = assessGovernedAction(
      {
        id: "agent-2",
        companyId: "company-1",
        role: "cfo",
        budgetMonthlyCents: 400,
        mode: policy.mode,
        classes: policy.classes,
        runtimeEnvironment: policy.environment,
        runtimePolicy: policy,
      },
      {
        agentId: "agent-2",
        actionId: "deploy_staging",
        reason: "Attempting an engineering-only action",
      },
    );

    expect(assessment.disposition).toBe("blocked");
  });
});
