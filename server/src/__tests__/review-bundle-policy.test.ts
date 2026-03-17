import { describe, expect, it } from "vitest";
import {
  parseIssueReviewBundleMode,
  parseProjectReviewBundlePolicy,
  resolveReviewBundleRequirement,
} from "../services/review-bundle-policy";

describe("review bundle policy helpers", () => {
  it("parses project review bundle policy payloads", () => {
    expect(
      parseProjectReviewBundlePolicy({
        enabled: true,
        defaultMode: "required",
        allowIssueOverride: false,
      }),
    ).toEqual({
      enabled: true,
      defaultMode: "required",
      allowIssueOverride: false,
    });
    expect(parseProjectReviewBundlePolicy(null)).toBeNull();
  });

  it("normalizes unknown issue modes to inherit", () => {
    expect(parseIssueReviewBundleMode("required")).toBe("required");
    expect(parseIssueReviewBundleMode("optional")).toBe("optional");
    expect(parseIssueReviewBundleMode("bad-mode")).toBe("inherit");
  });

  it("resolves effective requirement with override precedence", () => {
    expect(
      resolveReviewBundleRequirement({
        projectPolicy: {
          enabled: true,
          defaultMode: "optional",
          allowIssueOverride: true,
        },
        issueMode: "required",
      }),
    ).toEqual({
      enabled: true,
      mode: "required",
      source: "issue",
    });

    expect(
      resolveReviewBundleRequirement({
        projectPolicy: {
          enabled: true,
          defaultMode: "required",
          allowIssueOverride: false,
        },
        issueMode: "optional",
      }),
    ).toEqual({
      enabled: true,
      mode: "required",
      source: "project",
    });

    expect(
      resolveReviewBundleRequirement({
        projectPolicy: null,
        issueMode: "inherit",
      }),
    ).toEqual({
      enabled: false,
      mode: "optional",
      source: "project",
    });
  });
});
