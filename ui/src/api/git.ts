import type { GitStatus, GitLogEntry, GitCommitResult, GitResetResult } from "@paperclipai/shared";
import { api } from "./client";

function gitPath(workspaceId: string, suffix: string) {
  return `/git/${encodeURIComponent(workspaceId)}${suffix}`;
}

export const gitApi = {
  status: (workspaceId: string) =>
    api.get<GitStatus>(gitPath(workspaceId, "/status")),

  log: (workspaceId: string, maxCount = 20) =>
    api.get<GitLogEntry[]>(gitPath(workspaceId, `/log?maxCount=${maxCount}`)),

  branches: (workspaceId: string) =>
    api.get<{ current: string; all: string[] }>(gitPath(workspaceId, "/branches")),

  createBranch: (workspaceId: string, name: string) =>
    api.post<{ branch: string }>(gitPath(workspaceId, "/branch"), { name }),

  checkout: (workspaceId: string, branch: string) =>
    api.post<{ branch: string }>(gitPath(workspaceId, "/checkout"), { branch }),

  commit: (workspaceId: string, message: string) =>
    api.post<GitCommitResult>(gitPath(workspaceId, "/commit"), { message }),

  push: (workspaceId: string, setUpstream = false) =>
    api.post<{ success: boolean }>(gitPath(workspaceId, "/push"), { setUpstream }),

  fetch: (workspaceId: string) =>
    api.post<{ success: boolean }>(gitPath(workspaceId, "/fetch"), {}),

  pull: (workspaceId: string) =>
    api.post<{ success: boolean }>(gitPath(workspaceId, "/pull"), {}),

  resetToRemote: (workspaceId: string) =>
    api.post<GitResetResult>(gitPath(workspaceId, "/reset-to-remote"), {}),

  discardFile: (workspaceId: string, path: string) =>
    api.post<{ success: boolean }>(gitPath(workspaceId, "/discard-file"), { path }),

  stage: (workspaceId: string, files: string[]) =>
    api.post<{ success: boolean }>(gitPath(workspaceId, "/stage"), { files }),

  unstage: (workspaceId: string, files: string[]) =>
    api.post<{ success: boolean }>(gitPath(workspaceId, "/unstage"), { files }),

  diff: (workspaceId: string, path?: string) =>
    api.get<{ diff: string }>(gitPath(workspaceId, `/diff${path ? `?path=${encodeURIComponent(path)}` : ""}`)),

  stash: (workspaceId: string, message?: string) =>
    api.post<{ success: boolean }>(gitPath(workspaceId, "/stash"), { message }),

  stashPop: (workspaceId: string) =>
    api.post<{ success: boolean }>(gitPath(workspaceId, "/stash-pop"), {}),
};
