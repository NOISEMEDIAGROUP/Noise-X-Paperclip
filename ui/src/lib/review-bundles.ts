import type { IssueReviewBundleMode, ProjectReviewBundlePolicy } from "@paperclipai/shared";

export function resolveEffectiveReviewBundleMode(input: {
  projectPolicy: ProjectReviewBundlePolicy | null | undefined;
  issueMode: IssueReviewBundleMode | null | undefined;
}) {
  const projectPolicy = input.projectPolicy ?? null;
  const issueMode = input.issueMode ?? "inherit";
  const allowIssueOverride = projectPolicy?.allowIssueOverride ?? true;

  if (allowIssueOverride && issueMode !== "inherit") {
    return {
      enabled: true,
      mode: issueMode,
      source: "issue" as const,
    };
  }

  if (!projectPolicy?.enabled) {
    return {
      enabled: false,
      mode: "optional" as const,
      source: "project" as const,
    };
  }

  return {
    enabled: true,
    mode: projectPolicy.defaultMode === "required" ? "required" : "optional",
    source: "project" as const,
  };
}
