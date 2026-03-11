import { describe, expect, it } from "vitest";
import { resolveIssueGoalForCreate } from "../services/issues.ts";

describe("resolveIssueGoalForCreate", () => {
  it("prefers explicitly provided goalId", () => {
    expect(
      resolveIssueGoalForCreate({
        explicitGoalId: "goal-explicit",
        parentGoalId: "goal-parent",
        projectGoalId: "goal-project",
        companyActiveGoalId: "goal-company",
      }),
    ).toBe("goal-explicit");
  });

  it("falls back to parent issue goal, then project goal, then active company goal", () => {
    expect(
      resolveIssueGoalForCreate({
        explicitGoalId: undefined,
        parentGoalId: "goal-parent",
        projectGoalId: "goal-project",
        companyActiveGoalId: "goal-company",
      }),
    ).toBe("goal-parent");

    expect(
      resolveIssueGoalForCreate({
        explicitGoalId: undefined,
        parentGoalId: null,
        projectGoalId: "goal-project",
        companyActiveGoalId: "goal-company",
      }),
    ).toBe("goal-project");

    expect(
      resolveIssueGoalForCreate({
        explicitGoalId: undefined,
        parentGoalId: null,
        projectGoalId: null,
        companyActiveGoalId: "goal-company",
      }),
    ).toBe("goal-company");
  });

  it("returns null when no goal source is available", () => {
    expect(
      resolveIssueGoalForCreate({
        explicitGoalId: undefined,
        parentGoalId: null,
        projectGoalId: null,
        companyActiveGoalId: null,
      }),
    ).toBeNull();
  });
});
