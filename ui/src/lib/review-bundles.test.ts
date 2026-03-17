import { describe, expect, it } from "vitest";
import { resolveEffectiveReviewBundleMode } from "./review-bundles";

describe("resolveEffectiveReviewBundleMode", () => {
  it("uses issue override when project allows overrides", () => {
    const result = resolveEffectiveReviewBundleMode({
      projectPolicy: {
        enabled: true,
        defaultMode: "optional",
        allowIssueOverride: true,
      },
      issueMode: "required",
    });
    expect(result).toEqual({
      enabled: true,
      mode: "required",
      source: "issue",
    });
  });

  it("uses project default when override is disabled", () => {
    const result = resolveEffectiveReviewBundleMode({
      projectPolicy: {
        enabled: true,
        defaultMode: "required",
        allowIssueOverride: false,
      },
      issueMode: "optional",
    });
    expect(result).toEqual({
      enabled: true,
      mode: "required",
      source: "project",
    });
  });

  it("falls back to optional when policy disabled", () => {
    const result = resolveEffectiveReviewBundleMode({
      projectPolicy: {
        enabled: false,
        defaultMode: "required",
      },
      issueMode: "inherit",
    });
    expect(result).toEqual({
      enabled: false,
      mode: "optional",
      source: "project",
    });
  });
});
