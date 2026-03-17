import type { IssueReviewBundle } from "@paperclipai/shared";
import { api } from "./client";

export const reviewBundlesApi = {
  get: (issueId: string) =>
    api.get<IssueReviewBundle | null>(`/issues/${issueId}/review-bundle`),
  saveDraft: (issueId: string, data: Record<string, unknown>) =>
    api.patch<IssueReviewBundle>(`/issues/${issueId}/review-bundle`, data),
  submit: (issueId: string, data?: Record<string, unknown>) =>
    api.post<IssueReviewBundle>(`/issues/${issueId}/review-bundle/submit`, data ?? {}),
  approve: (issueId: string, data?: Record<string, unknown>) =>
    api.post<IssueReviewBundle>(`/issues/${issueId}/review-bundle/approve`, data ?? {}),
  requestChanges: (issueId: string, data?: Record<string, unknown>) =>
    api.post<IssueReviewBundle>(`/issues/${issueId}/review-bundle/request-changes`, data ?? {}),
};
