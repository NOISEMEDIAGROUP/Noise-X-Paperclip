import { simpleGit, type SimpleGit, type StatusResult } from "simple-git";
import fs from "node:fs";
import type {
  GitStatus,
  GitFileStatus,
  GitBranchInfo,
  GitLogEntry,
  GitCommitResult,
  GitResetResult,
} from "@paperclipai/shared";

function createGit(cwd: string): SimpleGit {
  return simpleGit({ baseDir: cwd, binary: "git", maxConcurrentProcesses: 4 });
}

function mapFiles(status: StatusResult): GitFileStatus[] {
  const files: GitFileStatus[] = [];
  for (const f of status.files) {
    files.push({
      path: f.path,
      index: f.index,
      workingDir: f.working_dir,
    });
  }
  return files;
}

export function gitService() {
  return {
    /** Check if a path exists and is a git repo */
    async status(cwd: string): Promise<GitStatus> {
      if (!fs.existsSync(cwd)) {
        return { isRepo: false, branch: null, files: [], changedCount: 0 };
      }

      const git = createGit(cwd);
      const isRepo = await git.checkIsRepo().catch(() => false);
      if (!isRepo) {
        return { isRepo: false, branch: null, files: [], changedCount: 0 };
      }

      const status = await git.status();
      const files = mapFiles(status);

      const branch: GitBranchInfo = {
        current: status.current ?? "HEAD",
        branches: [],
        tracking: status.tracking ?? null,
        ahead: status.ahead,
        behind: status.behind,
      };

      // Get local branches
      const branchSummary = await git.branchLocal();
      branch.branches = branchSummary.all;

      return {
        isRepo: true,
        branch,
        files,
        changedCount: files.length,
      };
    },

    /** Get recent log entries */
    async log(cwd: string, maxCount = 20): Promise<GitLogEntry[]> {
      const git = createGit(cwd);
      const log = await git.log({ maxCount });
      return log.all.map((entry) => ({
        hash: entry.hash,
        hashShort: entry.hash.slice(0, 7),
        message: entry.message,
        author: entry.author_name,
        date: entry.date,
      }));
    },

    /** List branches */
    async branches(cwd: string): Promise<{ current: string; all: string[] }> {
      const git = createGit(cwd);
      const summary = await git.branchLocal();
      return { current: summary.current, all: summary.all };
    },

    /** Create a new branch and switch to it */
    async createBranch(cwd: string, name: string): Promise<void> {
      const git = createGit(cwd);
      await git.checkoutLocalBranch(name);
    },

    /** Switch to an existing branch */
    async checkout(cwd: string, branch: string): Promise<void> {
      const git = createGit(cwd);
      await git.checkout(branch);
    },

    /** Stage all + commit */
    async commit(cwd: string, message: string): Promise<GitCommitResult> {
      const git = createGit(cwd);
      await git.add("-A");
      const result = await git.commit(message);
      const status = await git.status();
      return {
        hash: result.commit || "",
        branch: status.current ?? "HEAD",
        summary: {
          changes: result.summary.changes,
          insertions: result.summary.insertions,
          deletions: result.summary.deletions,
        },
      };
    },

    /** Push current branch */
    async push(cwd: string, setUpstream = false): Promise<void> {
      const git = createGit(cwd);
      const status = await git.status();
      const branch = status.current ?? "HEAD";
      if (setUpstream || !status.tracking) {
        await git.push(["--set-upstream", "origin", branch]);
      } else {
        await git.push();
      }
    },

    /** Fetch from remote */
    async fetch(cwd: string): Promise<void> {
      const git = createGit(cwd);
      await git.fetch(["--prune"]);
    },

    /** Pull current branch */
    async pull(cwd: string): Promise<void> {
      const git = createGit(cwd);
      await git.pull();
    },

    /** Hard reset to remote tracking branch */
    async resetToRemote(cwd: string): Promise<GitResetResult> {
      const git = createGit(cwd);
      await git.fetch(["--prune"]);
      const status = await git.status();
      const branch = status.current ?? "HEAD";
      const tracking = status.tracking || `origin/${branch}`;
      await git.reset(["--hard", tracking]);
      await git.clean("f", ["-d"]);
      return { success: true, branch, ref: tracking };
    },

    /** Discard changes in a specific file */
    async discardFile(cwd: string, filePath: string): Promise<void> {
      const git = createGit(cwd);
      // Check if it's an untracked file
      const status = await git.status();
      const fileStatus = status.files.find((f) => f.path === filePath);
      if (fileStatus && fileStatus.index === "?" && fileStatus.working_dir === "?") {
        // Untracked — delete it
        const fullPath = `${cwd}/${filePath}`;
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      } else {
        await git.checkout(["--", filePath]);
      }
    },

    /** Stage specific files */
    async stageFiles(cwd: string, files: string[]): Promise<void> {
      const git = createGit(cwd);
      await git.add(files);
    },

    /** Unstage specific files */
    async unstageFiles(cwd: string, files: string[]): Promise<void> {
      const git = createGit(cwd);
      await git.reset(["HEAD", ...files]);
    },

    /** Get diff for a file (or all files if no path) */
    async diff(cwd: string, filePath?: string): Promise<string> {
      const git = createGit(cwd);
      const args = filePath ? [filePath] : [];
      return git.diff(args);
    },

    /** Stash changes */
    async stash(cwd: string, message?: string): Promise<void> {
      const git = createGit(cwd);
      if (message) {
        await git.stash(["push", "-m", message]);
      } else {
        await git.stash(["push"]);
      }
    },

    /** Pop latest stash */
    async stashPop(cwd: string): Promise<void> {
      const git = createGit(cwd);
      await git.stash(["pop"]);
    },
  };
}
