export interface GitFileStatus {
  path: string;
  /** X = index status, Y = working tree status (same as git short format) */
  index: string;
  workingDir: string;
}

export interface GitBranchInfo {
  current: string;
  branches: string[];
  tracking: string | null;
  ahead: number;
  behind: number;
}

export interface GitStatus {
  isRepo: boolean;
  branch: GitBranchInfo | null;
  files: GitFileStatus[];
  /** Total count of changed files */
  changedCount: number;
}

export interface GitLogEntry {
  hash: string;
  hashShort: string;
  message: string;
  author: string;
  date: string;
}

export interface GitCommitResult {
  hash: string;
  branch: string;
  summary: { changes: number; insertions: number; deletions: number };
}

export interface GitResetResult {
  success: boolean;
  branch: string;
  ref: string;
}
