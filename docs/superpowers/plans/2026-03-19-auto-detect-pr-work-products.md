# Auto-Detect PR Work Products — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically detect PR creation in Claude-local agent runs by parsing stdout for PR URLs and creating work products in real-time.

**Architecture:** A new detection module (`work-product-detection.ts`) provides URL extraction and dedup-aware creation. The heartbeat service hooks this into the `onLog` callback for claude_local stdout. Detection is fire-and-forget — never blocks the log stream.

**Tech Stack:** TypeScript, Drizzle ORM, Vitest

**Spec:** `docs/superpowers/specs/2026-03-19-auto-detect-pr-work-products-design.md`

---

### Task 1: Create `extractPrUrls` utility with tests

**Files:**
- Create: `server/src/services/work-product-detection.ts`
- Create: `server/src/__tests__/work-product-detection.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `server/src/__tests__/work-product-detection.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { extractPrUrls } from "../services/work-product-detection.ts";

describe("extractPrUrls", () => {
  it("extracts GitHub PR URL", () => {
    const text = "Created PR: https://github.com/paperclipai/paperclip/pull/47";
    const results = extractPrUrls(text);
    expect(results).toEqual([
      {
        url: "https://github.com/paperclipai/paperclip/pull/47",
        provider: "github",
        owner: "paperclipai",
        repo: "paperclip",
        number: "47",
      },
    ]);
  });

  it("extracts GitLab MR URL", () => {
    const text = "MR: https://gitlab.com/org/repo/-/merge_requests/123";
    const results = extractPrUrls(text);
    expect(results).toEqual([
      {
        url: "https://gitlab.com/org/repo/-/merge_requests/123",
        provider: "gitlab",
        owner: "org",
        repo: "repo",
        number: "123",
      },
    ]);
  });

  it("extracts multiple URLs from one chunk", () => {
    const text =
      "PR1: https://github.com/a/b/pull/1 and PR2: https://github.com/c/d/pull/2";
    expect(extractPrUrls(text)).toHaveLength(2);
  });

  it("returns empty array for text without PR URLs", () => {
    expect(extractPrUrls("just some log output")).toEqual([]);
  });

  it("handles URL embedded in JSON string", () => {
    const text = '{"content":"https://github.com/org/repo/pull/99"}';
    const results = extractPrUrls(text);
    expect(results).toHaveLength(1);
    expect(results[0].number).toBe("99");
  });

  it("deduplicates same URL appearing twice in one chunk", () => {
    const text =
      "https://github.com/a/b/pull/5 then again https://github.com/a/b/pull/5";
    expect(extractPrUrls(text)).toHaveLength(1);
  });

  it("handles nested GitHub org/repo paths", () => {
    const text = "https://github.com/my-org/my-repo/pull/100";
    const results = extractPrUrls(text);
    expect(results[0].owner).toBe("my-org");
    expect(results[0].repo).toBe("my-repo");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/ericbrookfield/Development/paperclip && npx vitest run server/src/__tests__/work-product-detection.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `extractPrUrls`**

Create `server/src/services/work-product-detection.ts`:

```typescript
import { logger } from "../middleware/logger.js";
import type { IssueWorkProduct } from "@paperclipai/shared";

export interface ExtractedPr {
  url: string;
  provider: "github" | "gitlab";
  owner: string;
  repo: string;
  number: string;
}

const PR_URL_PATTERNS = [
  // GitHub: https://github.com/{owner}/{repo}/pull/{number}
  /https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)/g,
  // GitLab: https://gitlab.com/{owner}/{repo}/-/merge_requests/{number}
  /https:\/\/gitlab\.com\/([\w.-]+)\/([\w.-]+)\/-\/merge_requests\/(\d+)/g,
];

export function extractPrUrls(text: string): ExtractedPr[] {
  const seen = new Set<string>();
  const results: ExtractedPr[] = [];

  for (const pattern of PR_URL_PATTERNS) {
    // Reset lastIndex since we reuse the regex with /g flag
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const url = match[0];
      if (seen.has(url)) continue;
      seen.add(url);
      const provider = url.includes("github.com") ? "github" : "gitlab";
      results.push({
        url,
        provider,
        owner: match[1],
        repo: match[2],
        number: match[3],
      });
    }
  }

  return results;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/ericbrookfield/Development/paperclip && npx vitest run server/src/__tests__/work-product-detection.test.ts`
Expected: all 7 tests PASS

- [ ] **Step 5: Add `"gitlab"` to `IssueWorkProductProvider` union**

In `packages/shared/src/types/work-product.ts`, find:

```typescript
export type IssueWorkProductProvider =
  | "paperclip"
  | "github"
  | "vercel"
  | "s3"
  | "custom";
```

Replace with:

```typescript
export type IssueWorkProductProvider =
  | "paperclip"
  | "github"
  | "gitlab"
  | "vercel"
  | "s3"
  | "custom";
```

- [ ] **Step 6: Commit**

```bash
git add server/src/services/work-product-detection.ts server/src/__tests__/work-product-detection.test.ts packages/shared/src/types/work-product.ts
git commit -m "feat: add extractPrUrls utility for PR URL detection

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Add `createPrWorkProductIfNew` and `detectPrFromLogChunk`

**Files:**
- Modify: `server/src/services/work-product-detection.ts`
- Modify: `server/src/__tests__/work-product-detection.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `server/src/__tests__/work-product-detection.test.ts`:

```typescript
import { extractPrUrls, createPrWorkProductIfNew, detectPrFromLogChunk } from "../services/work-product-detection.ts";
import { vi } from "vitest";

describe("createPrWorkProductIfNew", () => {
  const pr: ExtractedPr = {
    url: "https://github.com/org/repo/pull/42",
    provider: "github",
    owner: "org",
    repo: "repo",
    number: "42",
  };

  it("skips if URL already in seenUrls", async () => {
    const seenUrls = new Set(["https://github.com/org/repo/pull/42"]);
    const listForIssue = vi.fn();
    const createForIssue = vi.fn();
    const svc = { listForIssue, createForIssue } as any;

    await createPrWorkProductIfNew({
      issueId: "issue-1",
      companyId: "company-1",
      runId: "run-1",
      pr,
      seenUrls,
      workProductsSvc: svc,
    });

    expect(listForIssue).not.toHaveBeenCalled();
    expect(createForIssue).not.toHaveBeenCalled();
  });

  it("skips if work product with same URL already exists in DB", async () => {
    const seenUrls = new Set<string>();
    const listForIssue = vi.fn().mockResolvedValue([
      { id: "wp-1", type: "pull_request", url: "https://github.com/org/repo/pull/42" },
    ]);
    const createForIssue = vi.fn();
    const svc = { listForIssue, createForIssue } as any;

    await createPrWorkProductIfNew({
      issueId: "issue-1",
      companyId: "company-1",
      runId: "run-1",
      pr,
      seenUrls,
      workProductsSvc: svc,
    });

    expect(seenUrls.has(pr.url)).toBe(true);
    expect(listForIssue).toHaveBeenCalledWith("issue-1");
    expect(createForIssue).not.toHaveBeenCalled();
  });

  it("creates work product when URL is new", async () => {
    const seenUrls = new Set<string>();
    const listForIssue = vi.fn().mockResolvedValue([]);
    const createForIssue = vi.fn().mockResolvedValue({ id: "wp-new" });
    const svc = { listForIssue, createForIssue } as any;

    await createPrWorkProductIfNew({
      issueId: "issue-1",
      companyId: "company-1",
      runId: "run-1",
      pr,
      seenUrls,
      workProductsSvc: svc,
    });

    expect(createForIssue).toHaveBeenCalledWith("issue-1", "company-1", {
      type: "pull_request",
      provider: "github",
      externalId: "42",
      title: "org/repo#42",
      url: "https://github.com/org/repo/pull/42",
      status: "active",
      isPrimary: true,
      createdByRunId: "run-1",
    });
  });

  it("sets isPrimary false when issue already has a PR work product", async () => {
    const seenUrls = new Set<string>();
    const listForIssue = vi.fn().mockResolvedValue([
      { id: "wp-1", type: "pull_request", url: "https://github.com/org/repo/pull/10" },
    ]);
    const createForIssue = vi.fn().mockResolvedValue({ id: "wp-new" });
    const svc = { listForIssue, createForIssue } as any;

    await createPrWorkProductIfNew({
      issueId: "issue-1",
      companyId: "company-1",
      runId: "run-1",
      pr,
      seenUrls,
      workProductsSvc: svc,
    });

    expect(createForIssue).toHaveBeenCalledWith(
      "issue-1",
      "company-1",
      expect.objectContaining({ isPrimary: false }),
    );
  });
});

describe("detectPrFromLogChunk", () => {
  it("detects and creates PR from log chunk", async () => {
    const seenUrls = new Set<string>();
    const listForIssue = vi.fn().mockResolvedValue([]);
    const createForIssue = vi.fn().mockResolvedValue({ id: "wp-new" });
    const svc = { listForIssue, createForIssue } as any;

    await detectPrFromLogChunk(
      'Created https://github.com/org/repo/pull/55',
      {
        issueId: "issue-1",
        companyId: "company-1",
        runId: "run-1",
        seenUrls,
        workProductsSvc: svc,
      },
    );

    expect(createForIssue).toHaveBeenCalledTimes(1);
  });

  it("does not throw on error", async () => {
    const seenUrls = new Set<string>();
    const listForIssue = vi.fn().mockRejectedValue(new Error("DB down"));
    const svc = { listForIssue } as any;

    // Should not throw
    await detectPrFromLogChunk(
      "https://github.com/org/repo/pull/1",
      {
        issueId: "issue-1",
        companyId: "company-1",
        runId: "run-1",
        seenUrls,
        workProductsSvc: svc,
      },
    );
  });
});
```

Also update the import at the top to include the new exports and the `ExtractedPr` type:

```typescript
import { describe, expect, it, vi } from "vitest";
import {
  extractPrUrls,
  createPrWorkProductIfNew,
  detectPrFromLogChunk,
  type ExtractedPr,
} from "../services/work-product-detection.ts";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/ericbrookfield/Development/paperclip && npx vitest run server/src/__tests__/work-product-detection.test.ts`
Expected: FAIL — `createPrWorkProductIfNew` is not exported

- [ ] **Step 3: Implement the functions**

Add to the bottom of `server/src/services/work-product-detection.ts`:

```typescript
interface CreatePrWorkProductData {
  type: string;
  provider: string;
  externalId?: string | null;
  title: string;
  url?: string | null;
  status: string;
  isPrimary?: boolean;
  createdByRunId?: string | null;
}

export interface PrDetectionContext {
  issueId: string;
  companyId: string;
  runId: string;
  seenUrls: Set<string>;
  workProductsSvc: {
    listForIssue: (issueId: string) => Promise<IssueWorkProduct[]>;
    createForIssue: (
      issueId: string,
      companyId: string,
      data: CreatePrWorkProductData,
    ) => Promise<IssueWorkProduct | null>;
  };
}

export async function createPrWorkProductIfNew(params: {
  issueId: string;
  companyId: string;
  runId: string;
  pr: ExtractedPr;
  seenUrls: Set<string>;
  workProductsSvc: PrDetectionContext["workProductsSvc"];
}): Promise<void> {
  const { issueId, companyId, runId, pr, seenUrls, workProductsSvc } = params;

  // In-memory dedup: skip if already seen in this run
  if (seenUrls.has(pr.url)) return;
  seenUrls.add(pr.url);

  // DB dedup: check if a work product with this URL already exists
  const existing = await workProductsSvc.listForIssue(issueId);
  if (existing.some((wp) => wp.url === pr.url)) return;

  const hasPrAlready = existing.some((wp) => wp.type === "pull_request");

  await workProductsSvc.createForIssue(issueId, companyId, {
    type: "pull_request",
    provider: pr.provider,
    externalId: pr.number,
    title: `${pr.owner}/${pr.repo}#${pr.number}`,
    url: pr.url,
    status: "active",
    isPrimary: !hasPrAlready,
    createdByRunId: runId,
  });
}

export async function detectPrFromLogChunk(
  chunk: string,
  context: PrDetectionContext,
): Promise<void> {
  try {
    const prs = extractPrUrls(chunk);
    for (const pr of prs) {
      await createPrWorkProductIfNew({
        issueId: context.issueId,
        companyId: context.companyId,
        runId: context.runId,
        pr,
        seenUrls: context.seenUrls,
        workProductsSvc: context.workProductsSvc,
      });
    }
  } catch (err) {
    logger.warn({ err }, "PR work product detection failed (non-fatal)");
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/ericbrookfield/Development/paperclip && npx vitest run server/src/__tests__/work-product-detection.test.ts`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/services/work-product-detection.ts server/src/__tests__/work-product-detection.test.ts
git commit -m "feat: add createPrWorkProductIfNew and detectPrFromLogChunk

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Hook detection into heartbeat `onLog`

**Files:**
- Modify: `server/src/services/heartbeat.ts`

- [ ] **Step 1: Add import**

At the top of `server/src/services/heartbeat.ts`, after the existing imports (after line 57), add:

```typescript
import { workProductService } from "./work-products.js";
import { detectPrFromLogChunk } from "./work-product-detection.js";
```

- [ ] **Step 2: Instantiate workProductsSvc**

Inside the `heartbeatService(db)` factory function, after line 703 (`const workspaceOperationsSvc = workspaceOperationService(db);`), add:

```typescript
  const workProductsSvc = workProductService(db);
```

- [ ] **Step 3: Add detection to onLog**

In `executeRun`, before the `onLog` definition (before line 2032), add the seenUrls set and detection context setup:

Find:
```typescript
      const onLog = async (stream: "stdout" | "stderr", chunk: string) => {
```

Replace with:
```typescript
      const prDetectionSeenUrls = new Set<string>();
      const enablePrDetection = agent.adapterType === "claude_local" && issueId != null;

      const onLog = async (stream: "stdout" | "stderr", chunk: string) => {
```

Then, at the end of the `onLog` function body, just before the closing `};` (before line 2063), add the detection call:

Find:
```typescript
        });
      };
      for (const warning of runtimeWorkspaceWarnings) {
```

Replace with:
```typescript
        });

        if (enablePrDetection && stream === "stdout") {
          void detectPrFromLogChunk(chunk, {
            issueId: issueId!,
            companyId: run.companyId,
            runId: run.id,
            seenUrls: prDetectionSeenUrls,
            workProductsSvc,
          });
        }
      };
      for (const warning of runtimeWorkspaceWarnings) {
```

- [ ] **Step 4: Verify it compiles**

Run: `cd /Users/ericbrookfield/Development/paperclip && npx tsc --noEmit -p server/tsconfig.json 2>&1 | grep -v board-claim | head -10`
Expected: No new errors (pre-existing board-claim.ts errors are unrelated)

- [ ] **Step 5: Run all server tests**

Run: `cd /Users/ericbrookfield/Development/paperclip && npx vitest run server/src/__tests__/work-product-detection.test.ts server/src/__tests__/work-products.test.ts`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/services/heartbeat.ts
git commit -m "feat: hook PR detection into heartbeat onLog for claude_local runs

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Run full test suite and verify

- [ ] **Step 1: Run all tests**

Run: `cd /Users/ericbrookfield/Development/paperclip && npx vitest run`
Expected: All tests pass (the pre-existing costs-service failure is unrelated)

- [ ] **Step 2: Run type checks**

Run: `cd /Users/ericbrookfield/Development/paperclip && npx tsc --noEmit -p server/tsconfig.json 2>&1 | grep -v board-claim | head -10`
Expected: No new errors

- [ ] **Step 3: Manual verification notes**

To verify end-to-end:
1. Restart the Paperclip server
2. Trigger an agent run on an issue where the agent will create a PR (or mock it by running a test agent that outputs a PR URL to stdout)
3. While the run is still active, check the issue in the UI — the PR badge should appear
4. Verify the work product was created via `GET /api/issues/{id}/work-products`
