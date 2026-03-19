# Surface PR Numbers in Issue UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface PR numbers from issue work products throughout the Paperclip UI — in issue lists, detail headers, properties panel, and kanban board.

**Architecture:** Add a batch method to the existing `workProductService` to fetch PR-type work products for multiple issues. Enrich the issue list route response with this data. Create a shared `PrBadge` UI component and render it in all issue display surfaces.

**Tech Stack:** TypeScript, Drizzle ORM, Express, React, TanStack Query, Tailwind CSS, Lucide icons

**Spec:** `docs/superpowers/specs/2026-03-19-surface-pr-numbers-design.md`

---

### Task 1: Add batch PR work products method to server

**Files:**
- Modify: `server/src/services/work-products.ts:33-121` (add method to `workProductService`)
- Test: `server/src/__tests__/work-products.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `server/src/__tests__/work-products.test.ts`:

```typescript
it("listPrWorkProductsForIssues returns PR work products grouped by issue", async () => {
  const pr1 = createWorkProductRow({ id: "wp-1", issueId: "issue-1", type: "pull_request", isPrimary: true });
  const pr2 = createWorkProductRow({ id: "wp-2", issueId: "issue-2", type: "pull_request", isPrimary: false });
  const branch = createWorkProductRow({ id: "wp-3", issueId: "issue-1", type: "branch" });

  const selectOrderBy = vi.fn(async () => [pr1, pr2]);
  const selectWhere = vi.fn(() => ({ orderBy: selectOrderBy }));
  const selectFrom = vi.fn(() => ({ where: selectWhere }));
  const dbSelect = vi.fn(() => ({ from: selectFrom }));

  const svc = workProductService({ select: dbSelect } as any);
  const result = await svc.listPrWorkProductsForIssues(
    ["issue-1", "issue-2"],
    "company-1",
  );

  expect(dbSelect).toHaveBeenCalledTimes(1);
  expect(result.size).toBe(2);
  expect(result.get("issue-1")).toHaveLength(1);
  expect(result.get("issue-1")![0].id).toBe("wp-1");
  expect(result.get("issue-2")).toHaveLength(1);
  expect(result.get("issue-2")![0].id).toBe("wp-2");
});

it("listPrWorkProductsForIssues returns empty map for empty input", async () => {
  const dbSelect = vi.fn();
  const svc = workProductService({ select: dbSelect } as any);
  const result = await svc.listPrWorkProductsForIssues([], "company-1");

  expect(dbSelect).not.toHaveBeenCalled();
  expect(result.size).toBe(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/ericbrookfield/Development/paperclip && npx vitest run server/src/__tests__/work-products.test.ts`
Expected: FAIL — `listPrWorkProductsForIssues` is not a function

- [ ] **Step 3: Write the implementation**

In `server/src/services/work-products.ts`, add `inArray` to the drizzle-orm import, then add this method inside the returned object (after `listForIssue`):

```typescript
listPrWorkProductsForIssues: async (
  issueIds: string[],
  companyId: string,
): Promise<Map<string, IssueWorkProduct[]>> => {
  const map = new Map<string, IssueWorkProduct[]>();
  if (issueIds.length === 0) return map;

  const rows = await db
    .select()
    .from(issueWorkProducts)
    .where(
      and(
        eq(issueWorkProducts.companyId, companyId),
        inArray(issueWorkProducts.issueId, issueIds),
        eq(issueWorkProducts.type, "pull_request"),
      ),
    )
    .orderBy(
      desc(issueWorkProducts.isPrimary),
      desc(issueWorkProducts.updatedAt),
    );

  for (const row of rows) {
    const product = toIssueWorkProduct(row);
    const existing = map.get(row.issueId);
    if (existing) existing.push(product);
    else map.set(row.issueId, [product]);
  }
  return map;
},
```

Also add `inArray` to the import from `drizzle-orm`:

```typescript
import { and, desc, eq, inArray } from "drizzle-orm";
```

And add `IssueWorkProduct` to the import from `@paperclipai/shared` (it's already there).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/ericbrookfield/Development/paperclip && npx vitest run server/src/__tests__/work-products.test.ts`
Expected: all 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/services/work-products.ts server/src/__tests__/work-products.test.ts
git commit -m "feat: add batch PR work products query to workProductService"
```

---

### Task 2: Enrich issue list route with PR work products

**Files:**
- Modify: `server/src/routes/issues.ts:230-241` (enrich list response)

- [ ] **Step 1: Update the list route handler**

In `server/src/routes/issues.ts`, replace the list route's response (lines 230-241):

```typescript
    const result = await svc.list(companyId, {
      status: req.query.status as string | undefined,
      assigneeAgentId: req.query.assigneeAgentId as string | undefined,
      assigneeUserId,
      touchedByUserId,
      unreadForUserId,
      projectId: req.query.projectId as string | undefined,
      parentId: req.query.parentId as string | undefined,
      labelId: req.query.labelId as string | undefined,
      q: req.query.q as string | undefined,
    });
    res.json(result);
```

With:

```typescript
    const result = await svc.list(companyId, {
      status: req.query.status as string | undefined,
      assigneeAgentId: req.query.assigneeAgentId as string | undefined,
      assigneeUserId,
      touchedByUserId,
      unreadForUserId,
      projectId: req.query.projectId as string | undefined,
      parentId: req.query.parentId as string | undefined,
      labelId: req.query.labelId as string | undefined,
      q: req.query.q as string | undefined,
    });

    // Enrich with PR work products
    const issueIds = result.map((issue) => issue.id);
    const prMap = await workProductsSvc.listPrWorkProductsForIssues(issueIds, companyId);
    const enriched = result.map((issue) => ({
      ...issue,
      workProducts: prMap.get(issue.id) ?? [],
    }));
    res.json(enriched);
```

- [ ] **Step 2: Verify the server compiles**

Run: `cd /Users/ericbrookfield/Development/paperclip && npx tsc --noEmit -p server/tsconfig.json 2>&1 | head -20`
Expected: No errors (or only pre-existing ones)

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/issues.ts
git commit -m "feat: include PR work products in issue list response"
```

---

### Task 3: Create PrBadge component

**Files:**
- Create: `ui/src/components/PrBadge.tsx`
- Create: `ui/src/lib/pr-utils.ts`
- Test: `ui/src/lib/pr-utils.test.ts`

- [ ] **Step 1: Write the failing test for PR number extraction**

Create `ui/src/lib/pr-utils.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { extractPrNumber } from "./pr-utils";

describe("extractPrNumber", () => {
  it("returns externalId when it looks numeric", () => {
    expect(extractPrNumber({ externalId: "123", url: null, title: "Some PR" })).toBe("123");
  });

  it("extracts number from GitHub PR URL", () => {
    expect(
      extractPrNumber({
        externalId: null,
        url: "https://github.com/org/repo/pull/456",
        title: "Some PR",
      }),
    ).toBe("456");
  });

  it("extracts number from GitLab MR URL", () => {
    expect(
      extractPrNumber({
        externalId: null,
        url: "https://gitlab.com/org/repo/-/merge_requests/789",
        title: "Some MR",
      }),
    ).toBe("789");
  });

  it("extracts #N from title as fallback", () => {
    expect(
      extractPrNumber({ externalId: null, url: null, title: "Fix bug #42" }),
    ).toBe("42");
  });

  it("returns null when no number found", () => {
    expect(
      extractPrNumber({ externalId: null, url: null, title: "Fix bug" }),
    ).toBeNull();
  });

  it("handles non-numeric externalId by trying URL", () => {
    expect(
      extractPrNumber({
        externalId: "abc-node-id",
        url: "https://github.com/org/repo/pull/99",
        title: "PR title",
      }),
    ).toBe("99");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/ericbrookfield/Development/paperclip && npx vitest run ui/src/lib/pr-utils.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the utility**

Create `ui/src/lib/pr-utils.ts`:

```typescript
/**
 * Extracts a human-readable PR number from work product fields.
 * Returns the number as a string, or null if none found.
 */
export function extractPrNumber(wp: {
  externalId: string | null;
  url: string | null;
  title: string;
}): string | null {
  // 1. externalId if numeric
  if (wp.externalId && /^\d+$/.test(wp.externalId)) {
    return wp.externalId;
  }

  // 2. Parse from URL (GitHub /pull/N, GitLab /merge_requests/N)
  if (wp.url) {
    const urlMatch = wp.url.match(/\/(?:pull|merge_requests)\/(\d+)/);
    if (urlMatch) return urlMatch[1];
  }

  // 3. Parse #N from title
  const titleMatch = wp.title.match(/#(\d+)/);
  if (titleMatch) return titleMatch[1];

  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/ericbrookfield/Development/paperclip && npx vitest run ui/src/lib/pr-utils.test.ts`
Expected: all 6 tests PASS

- [ ] **Step 5: Create the PrBadge component**

Create `ui/src/components/PrBadge.tsx`:

```tsx
import type { IssueWorkProduct } from "@paperclipai/shared";
import { GitPullRequest } from "lucide-react";
import { extractPrNumber } from "../lib/pr-utils";
import { cn } from "../lib/utils";

function statusStyle(status: string): string {
  switch (status) {
    case "merged":
      return "bg-purple-500/15 border-purple-500/30 text-purple-600 dark:text-purple-400";
    case "active":
    case "ready_for_review":
    case "draft":
    case "approved":
      return "bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400";
    case "closed":
    case "failed":
    case "changes_requested":
    case "archived":
      return "bg-muted border-border text-muted-foreground";
    default:
      return "bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400";
  }
}

interface PrBadgeProps {
  workProducts: IssueWorkProduct[] | undefined;
  className?: string;
}

export function PrBadge({ workProducts, className }: PrBadgeProps) {
  const prs = (workProducts ?? []).filter((wp) => wp.type === "pull_request");
  if (prs.length === 0) return null;

  const primary = prs.find((pr) => pr.isPrimary) ?? prs[0];
  const prNumber = extractPrNumber(primary);
  const label = prNumber ? `PR #${prNumber}` : primary.title.slice(0, 20);
  const rest = prs.length - 1;

  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0",
        statusStyle(primary.status),
        className,
      )}
    >
      <GitPullRequest className="h-3 w-3" />
      {label}
      {rest > 0 && (
        <span className="text-current opacity-60">+{rest}</span>
      )}
    </span>
  );

  if (primary.url) {
    return (
      <a
        href={primary.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex no-underline"
        onClick={(e) => e.stopPropagation()}
        title={primary.title}
      >
        {badge}
      </a>
    );
  }

  return badge;
}
```

- [ ] **Step 6: Verify the UI compiles**

Run: `cd /Users/ericbrookfield/Development/paperclip && npx tsc --noEmit -p ui/tsconfig.json 2>&1 | head -20`
Expected: No errors (or only pre-existing ones)

- [ ] **Step 7: Commit**

```bash
git add ui/src/lib/pr-utils.ts ui/src/lib/pr-utils.test.ts ui/src/components/PrBadge.tsx
git commit -m "feat: add PrBadge component and PR number extraction utility"
```

---

### Task 4: Add PrBadge to IssueDetail header

**Files:**
- Modify: `ui/src/pages/IssueDetail.tsx`

- [ ] **Step 1: Add import**

Add to the imports at the top of `ui/src/pages/IssueDetail.tsx`:

```typescript
import { PrBadge } from "../components/PrBadge";
```

- [ ] **Step 2: Add PrBadge after the Live badge**

In the header area, find the closing of the Live badge block (the `</span>` after `Live`), which is followed by the project link conditional `{issue.projectId ? (`. Insert the PrBadge between them:

Find:
```tsx
          )}

          {issue.projectId ? (
```

(The first `)}` closes the Live badge conditional block.)

Replace with:
```tsx
          )}

          <PrBadge workProducts={issue.workProducts} />

          {issue.projectId ? (
```

- [ ] **Step 3: Verify the UI compiles**

Run: `cd /Users/ericbrookfield/Development/paperclip && npx tsc --noEmit -p ui/tsconfig.json 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add ui/src/pages/IssueDetail.tsx
git commit -m "feat: show PR badge in issue detail header"
```

---

### Task 5: Add PrBadge to IssuesList rows

**Files:**
- Modify: `ui/src/components/IssuesList.tsx`

- [ ] **Step 1: Add import**

Add to the imports in `ui/src/components/IssuesList.tsx`:

```typescript
import { PrBadge } from "./PrBadge";
```

- [ ] **Step 2: Add PrBadge in desktopMetaLeading**

In the `desktopMetaLeading` prop passed to `IssueRow`, after the Live badge conditional block (the `)}` that closes `{liveIssueIds?.has(issue.id) && (`) and before the closing `</>`, insert:

Find (note: indentation uses spaces — match exactly):
```tsx
                      )}
                    </>
                  )}
                  mobileMeta={timeAgo(issue.updatedAt)}
```

Replace with:
```tsx
                      )}
                      <PrBadge workProducts={issue.workProducts} />
                    </>
                  )}
                  mobileMeta={timeAgo(issue.updatedAt)}
```

- [ ] **Step 3: Verify the UI compiles**

Run: `cd /Users/ericbrookfield/Development/paperclip && npx tsc --noEmit -p ui/tsconfig.json 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add ui/src/components/IssuesList.tsx
git commit -m "feat: show PR badge in issue list rows"
```

---

### Task 6: Add PrBadge to Inbox

**Files:**
- Modify: `ui/src/pages/Inbox.tsx`

- [ ] **Step 1: Add import**

Add to the imports in `ui/src/pages/Inbox.tsx`:

```typescript
import { PrBadge } from "../components/PrBadge";
```

- [ ] **Step 2: Add PrBadge in the issue row's desktopMetaLeading**

In the `desktopMetaLeading` prop for issue rows in Inbox, after the Live badge conditional block and before the closing `</>`:

Find:
```tsx
                        )}
                      </>
                    )}
                    mobileMeta={
```

Replace with:
```tsx
                        )}
                        <PrBadge workProducts={issue.workProducts} />
                      </>
                    )}
                    mobileMeta={
```

- [ ] **Step 3: Commit**

```bash
git add ui/src/pages/Inbox.tsx
git commit -m "feat: show PR badge in inbox issue rows"
```

---

### Task 7: Add PrBadge to KanbanBoard

**Files:**
- Modify: `ui/src/components/KanbanBoard.tsx`

- [ ] **Step 1: Add import**

Add to the imports in `ui/src/components/KanbanBoard.tsx`:

```typescript
import { PrBadge } from "./PrBadge";
```

- [ ] **Step 2: Add PrBadge after the Live badge in kanban cards**

In the kanban card header `<div className="flex items-start gap-1.5 mb-1.5">`, after the Live badge conditional closes and before the `</div>` that closes the header row, insert PrBadge:

Find:
```tsx
            </span>
          )}
        </div>
        <p className="text-sm leading-snug line-clamp-2 mb-2">{issue.title}</p>
```

Replace with:
```tsx
            </span>
          )}
          <PrBadge workProducts={issue.workProducts} />
        </div>
        <p className="text-sm leading-snug line-clamp-2 mb-2">{issue.title}</p>
```

- [ ] **Step 3: Verify the UI compiles**

Run: `cd /Users/ericbrookfield/Development/paperclip && npx tsc --noEmit -p ui/tsconfig.json 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add ui/src/components/KanbanBoard.tsx
git commit -m "feat: show PR badge in kanban board cards"
```

---

### Task 8: Add PR property row to IssueProperties

**Files:**
- Modify: `ui/src/components/IssueProperties.tsx`

- [ ] **Step 1: Add imports**

In `ui/src/components/IssueProperties.tsx`, add `GitPullRequest` to the existing lucide-react import:

Find:
```typescript
import { User, Hexagon, ArrowUpRight, Tag, Plus, Trash2, Copy, Check } from "lucide-react";
```

Replace with:
```typescript
import { User, Hexagon, ArrowUpRight, Tag, Plus, Trash2, Copy, Check, GitPullRequest } from "lucide-react";
```

Add `IssueWorkProduct` to the shared types import:

Find:
```typescript
import type { Issue } from "@paperclipai/shared";
```

Replace with:
```typescript
import type { Issue, IssueWorkProduct } from "@paperclipai/shared";
```

Add the pr-utils import after the existing imports:

Find:
```typescript
import { timeAgo } from "../lib/timeAgo";
```

Replace with:
```typescript
import { timeAgo } from "../lib/timeAgo";
import { extractPrNumber } from "../lib/pr-utils";
```

- [ ] **Step 2: Add PR property row**

In the `IssueProperties` component, after the Project `PropertyPicker` block (which ends around line 659) and before the workspace conditional, add:

Find:
```tsx
        </PropertyPicker>

        {currentProjectSupportsExecutionWorkspace && (
```

Replace with:
```tsx
        </PropertyPicker>

        {(issue.workProducts ?? []).some((wp) => wp.type === "pull_request") && (
          <PropertyRow label="PR">
            <div className="space-y-1">
              {(issue.workProducts ?? [])
                .filter((wp): wp is IssueWorkProduct => wp.type === "pull_request")
                .map((pr) => {
                  const prNumber = extractPrNumber(pr);
                  return (
                    <div key={pr.id} className="flex items-center gap-1.5 min-w-0">
                      <GitPullRequest className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      {pr.url ? (
                        <a
                          href={pr.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm hover:underline truncate"
                        >
                          {prNumber ? `#${prNumber}` : pr.title}
                        </a>
                      ) : (
                        <span className="text-sm truncate">
                          {prNumber ? `#${prNumber}` : pr.title}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {pr.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  );
                })}
            </div>
          </PropertyRow>
        )}

        {currentProjectSupportsExecutionWorkspace && (
```

- [ ] **Step 3: Verify the UI compiles**

Run: `cd /Users/ericbrookfield/Development/paperclip && npx tsc --noEmit -p ui/tsconfig.json 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add ui/src/components/IssueProperties.tsx
git commit -m "feat: show PR details in issue properties panel"
```

---

### Task 9: Run full test suite and verify

- [ ] **Step 1: Run all tests**

Run: `cd /Users/ericbrookfield/Development/paperclip && npx vitest run`
Expected: All tests pass, including the new ones in `work-products.test.ts` and `pr-utils.test.ts`

- [ ] **Step 2: Run type checks**

Run: `cd /Users/ericbrookfield/Development/paperclip && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 3: Manual verification notes**

To verify visually:
1. Start the dev server and navigate to an issue that has a PR work product
2. Confirm the PR badge appears in the issue detail header
3. Navigate to the issues list — confirm the badge appears in list rows
4. Switch to board view — confirm the badge appears on kanban cards
5. Check the properties panel — confirm the PR row appears with link and status
6. Check the Inbox — confirm PR badge appears for issues with PRs
