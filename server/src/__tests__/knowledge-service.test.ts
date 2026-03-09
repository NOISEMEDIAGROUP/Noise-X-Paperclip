import { describe, expect, it, vi } from "vitest";
import { assets, issueKnowledgeItems, issues, knowledgeItems } from "@paperclipai/db";
import { knowledgeService } from "../services/knowledge.js";

type IssueRow = typeof issues.$inferSelect;
type KnowledgeRow = typeof knowledgeItems.$inferSelect;
type AssetRow = typeof assets.$inferSelect;
type AttachmentRow = typeof issueKnowledgeItems.$inferSelect;

function createDbStub() {
  const issueRow: IssueRow = {
    id: "11111111-1111-4111-8111-111111111111",
    companyId: "cmp-1",
    projectId: null,
    parentIssueId: null,
    approvalId: null,
    identifier: "CMP-1",
    title: "Issue with asset knowledge",
    description: null,
    status: "todo",
    priority: "medium",
    assigneeAgentId: null,
    assigneeUserId: null,
    requesterUserId: null,
    boardOrder: null,
    commentsCount: 0,
    lastCommentAt: null,
    checkoutRunId: null,
    checkoutLockedAt: null,
    executionRunId: null,
    executionAgentNameKey: null,
    executionLockedAt: null,
    createdByAgentId: null,
    createdByUserId: null,
    createdAt: new Date("2026-03-09T09:00:00Z"),
    updatedAt: new Date("2026-03-09T09:00:00Z"),
  };

  const assetRow: AssetRow = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    companyId: "cmp-1",
    provider: "local_disk",
    objectKey: "knowledge/audit.md",
    contentType: "text/markdown",
    byteSize: 128,
    sha256: "deadbeef",
    originalFilename: "audit.md",
    width: null,
    height: null,
    createdByAgentId: null,
    createdByUserId: "user-1",
    createdAt: new Date("2026-03-09T09:00:00Z"),
    updatedAt: new Date("2026-03-09T09:00:00Z"),
  };

  const knowledgeRow: KnowledgeRow = {
    id: "22222222-2222-4222-8222-222222222222",
    companyId: "cmp-1",
    title: "Audit artifact",
    kind: "asset",
    summary: "Latest audit attachment",
    body: null,
    assetId: assetRow.id,
    sourceUrl: null,
    createdByAgentId: null,
    createdByUserId: "user-1",
    updatedByAgentId: null,
    updatedByUserId: "user-1",
    createdAt: new Date("2026-03-09T09:00:00Z"),
    updatedAt: new Date("2026-03-09T09:00:00Z"),
  };

  const attachmentRow: AttachmentRow = {
    id: "33333333-3333-4333-8333-333333333333",
    companyId: "cmp-1",
    issueId: issueRow.id,
    knowledgeItemId: knowledgeRow.id,
    sortOrder: 0,
    createdByAgentId: null,
    createdByUserId: "user-1",
    createdAt: new Date("2026-03-09T09:05:00Z"),
    updatedAt: new Date("2026-03-09T09:05:00Z"),
  };

  const select = vi.fn((_shape?: unknown) => ({
    from(table: unknown) {
      if (table === issues) {
        return {
          where: vi.fn().mockResolvedValue([issueRow]),
        };
      }

      if (table === knowledgeItems) {
        return {
          where: vi.fn().mockResolvedValue([knowledgeRow]),
        };
      }

      if (table === assets) {
        return {
          where: vi.fn().mockResolvedValue([assetRow]),
        };
      }

      if (table === issueKnowledgeItems) {
        return {
          where: vi.fn(() => ({
            orderBy: vi.fn().mockResolvedValue([]),
          })),
        };
      }

      throw new Error("Unexpected table in select()");
    },
  }));

  const returning = vi.fn().mockResolvedValue([attachmentRow]);
  const values = vi.fn().mockReturnValue({ returning });
  const insert = vi.fn(() => ({ values }));

  return {
    select,
    insert,
    update: vi.fn(),
    delete: vi.fn(),
  };
}

describe("knowledgeService.attachToIssue", () => {
  it("returns embedded asset metadata for asset-backed knowledge items", async () => {
    const db = createDbStub();
    const svc = knowledgeService(db as any);

    const result = await svc.attachToIssue(
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      { userId: "user-1" },
    );

    expect(result.knowledgeItem.asset).toMatchObject({
      assetId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      contentType: "text/markdown",
      originalFilename: "audit.md",
    });
  });
});
