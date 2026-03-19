import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  addApprovalCommentSchema,
  createApprovalSchema,
  requestApprovalRevisionSchema,
  resolveApprovalSchema,
  resubmitApprovalSchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { logger } from "../middleware/logger.js";
import {
  agentService,
  approvalService,
  companyService,
  heartbeatService,
  issueApprovalService,
  logActivity,
  secretService,
} from "../services/index.js";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";
import { forbidden } from "../errors.js";
import { redactEventPayload } from "../redaction.js";
import type { IntegrationsService } from "../services/integrations.js";

function redactApprovalPayload<T extends { payload: Record<string, unknown> }>(approval: T): T {
  return {
    ...approval,
    payload: redactEventPayload(approval.payload) ?? {},
  };
}

/**
 * Assert that the request is from a board user or the designated reviewer agent.
 * Returns `{ isAgent: true, agentId }` when the reviewer agent is acting,
 * or `{ isAgent: false }` when a board user is acting.
 */
function assertBoardOrReviewerAgent(
  req: Express.Request,
  reviewerAgentId: string | null,
): { isAgent: true; agentId: string } | { isAgent: false } {
  if (req.actor.type === "board") {
    return { isAgent: false };
  }
  if (
    req.actor.type === "agent" &&
    reviewerAgentId &&
    req.actor.agentId === reviewerAgentId
  ) {
    return { isAgent: true, agentId: reviewerAgentId };
  }
  throw forbidden("Board access or designated reviewer agent required");
}

export function approvalRoutes(db: Db, integrations?: IntegrationsService | null) {
  const router = Router();
  const svc = approvalService(db);
  const agentsSvc = agentService(db);
  const companySvc = companyService(db);
  const heartbeat = heartbeatService(db);
  const issueApprovalsSvc = issueApprovalService(db);
  const secretsSvc = secretService(db);
  const strictSecretsMode = process.env.PAPERCLIP_SECRETS_STRICT_MODE === "true";

  router.get("/companies/:companyId/approvals", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const status = req.query.status as string | undefined;
    const result = await svc.list(companyId, status);
    res.json(result.map((approval) => redactApprovalPayload(approval)));
  });

  router.get("/approvals/:id", async (req, res) => {
    const id = req.params.id as string;
    const approval = await svc.getById(id);
    if (!approval) {
      res.status(404).json({ error: "Approval not found" });
      return;
    }
    assertCompanyAccess(req, approval.companyId);
    res.json(redactApprovalPayload(approval));
  });

  router.post("/companies/:companyId/approvals", validate(createApprovalSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const rawIssueIds = req.body.issueIds;
    const issueIds = Array.isArray(rawIssueIds)
      ? rawIssueIds.filter((value: unknown): value is string => typeof value === "string")
      : [];
    const uniqueIssueIds = Array.from(new Set(issueIds));
    const { issueIds: _issueIds, ...approvalInput } = req.body;
    const normalizedPayload =
      approvalInput.type === "hire_agent"
        ? await secretsSvc.normalizeHireApprovalPayloadForPersistence(
            companyId,
            approvalInput.payload,
            { strictMode: strictSecretsMode },
          )
        : approvalInput.payload;

    const actor = getActorInfo(req);
    const approval = await svc.create(companyId, {
      ...approvalInput,
      payload: normalizedPayload,
      requestedByUserId: actor.actorType === "user" ? actor.actorId : null,
      requestedByAgentId:
        approvalInput.requestedByAgentId ?? (actor.actorType === "agent" ? actor.actorId : null),
      reviewerAgentId: approvalInput.reviewerAgentId ?? null,
      escalateToBoardOnApproval: approvalInput.escalateToBoardOnApproval ?? false,
      status: "pending",
      decisionNote: null,
      decidedByUserId: null,
      decidedByAgentId: null,
      decidedAt: null,
      updatedAt: new Date(),
    });

    if (uniqueIssueIds.length > 0) {
      await issueApprovalsSvc.linkManyForApproval(approval.id, uniqueIssueIds, {
        agentId: actor.agentId,
        userId: actor.actorType === "user" ? actor.actorId : null,
      });
    }

    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "approval.created",
      entityType: "approval",
      entityId: approval.id,
      details: { type: approval.type, issueIds: uniqueIssueIds },
    });

    // Fire integration hooks (fire-and-forget)
    if (integrations) {
      void (async () => {
        const desc = typeof approval.payload?.description === "string" ? approval.payload.description : null;
        const [actorAgent, company] = await Promise.all([
          actor.agentId ? agentsSvc.getById(actor.agentId).catch(() => null) : null,
          companySvc.getById(companyId).catch(() => null),
        ]);
        const prefix = company?.issuePrefix ?? "ORG";
        await integrations.onApprovalCreated(
          { id: approval.id, type: approval.type, description: desc, companyId, companyPrefix: prefix },
          actorAgent ? { id: actorAgent.id, name: actorAgent.name } : null,
        );
      })();
    }

    res.status(201).json(redactApprovalPayload(approval));
  });

  router.get("/approvals/:id/issues", async (req, res) => {
    const id = req.params.id as string;
    const approval = await svc.getById(id);
    if (!approval) {
      res.status(404).json({ error: "Approval not found" });
      return;
    }
    assertCompanyAccess(req, approval.companyId);
    const issues = await issueApprovalsSvc.listIssuesForApproval(id);
    res.json(issues);
  });

  router.post("/approvals/:id/approve", validate(resolveApprovalSchema), async (req, res) => {
    const id = req.params.id as string;
    const existing = await svc.getById(id);
    if (!existing) {
      res.status(404).json({ error: "Approval not found" });
      return;
    }
    const reviewer = assertBoardOrReviewerAgent(req, existing.reviewerAgentId);
    const decidedByAgentId = reviewer.isAgent ? reviewer.agentId : (req.body.decidedByAgentId ?? null);
    const actorType = reviewer.isAgent ? ("agent" as const) : ("user" as const);
    const actorId = reviewer.isAgent ? reviewer.agentId : (req.actor.userId ?? "board");

    const { approval, applied, escalatedApproval } = await svc.approve(
      id,
      req.body.decidedByUserId ?? (reviewer.isAgent ? null : "board"),
      req.body.decisionNote,
      decidedByAgentId,
    );

    if (applied) {
      const linkedIssues = await issueApprovalsSvc.listIssuesForApproval(approval.id);
      const linkedIssueIds = linkedIssues.map((issue) => issue.id);
      const primaryIssueId = linkedIssueIds[0] ?? null;

      await logActivity(db, {
        companyId: approval.companyId,
        actorType,
        actorId,
        agentId: reviewer.isAgent ? reviewer.agentId : null,
        action: "approval.approved",
        entityType: "approval",
        entityId: approval.id,
        details: {
          type: approval.type,
          requestedByAgentId: approval.requestedByAgentId,
          decidedByAgentId,
          linkedIssueIds,
        },
      });

      if (escalatedApproval) {
        await logActivity(db, {
          companyId: approval.companyId,
          actorType,
          actorId,
          agentId: reviewer.isAgent ? reviewer.agentId : null,
          action: "approval.escalated_to_board",
          entityType: "approval",
          entityId: escalatedApproval.id,
          details: {
            originalApprovalId: approval.id,
            type: approval.type,
            reviewerAgentId: decidedByAgentId,
          },
        });
      }

      if (approval.requestedByAgentId && !escalatedApproval) {
        try {
          const wakeRun = await heartbeat.wakeup(approval.requestedByAgentId, {
            source: "automation",
            triggerDetail: "system",
            reason: "approval_approved",
            payload: {
              approvalId: approval.id,
              approvalStatus: approval.status,
              issueId: primaryIssueId,
              issueIds: linkedIssueIds,
            },
            requestedByActorType: actorType,
            requestedByActorId: actorId,
            contextSnapshot: {
              source: "approval.approved",
              approvalId: approval.id,
              approvalStatus: approval.status,
              issueId: primaryIssueId,
              issueIds: linkedIssueIds,
              taskId: primaryIssueId,
              wakeReason: "approval_approved",
            },
          });

          await logActivity(db, {
            companyId: approval.companyId,
            actorType,
            actorId,
            agentId: reviewer.isAgent ? reviewer.agentId : null,
            action: "approval.requester_wakeup_queued",
            entityType: "approval",
            entityId: approval.id,
            details: {
              requesterAgentId: approval.requestedByAgentId,
              wakeRunId: wakeRun?.id ?? null,
              linkedIssueIds,
            },
          });
        } catch (err) {
          logger.warn(
            {
              err,
              approvalId: approval.id,
              requestedByAgentId: approval.requestedByAgentId,
            },
            "failed to queue requester wakeup after approval",
          );
          await logActivity(db, {
            companyId: approval.companyId,
            actorType,
            actorId,
            agentId: reviewer.isAgent ? reviewer.agentId : null,
            action: "approval.requester_wakeup_failed",
            entityType: "approval",
            entityId: approval.id,
            details: {
              requesterAgentId: approval.requestedByAgentId,
              linkedIssueIds,
              error: err instanceof Error ? err.message : String(err),
            },
          });
        }
      }
    }

    res.json(redactApprovalPayload(approval));
  });

  router.post("/approvals/:id/reject", validate(resolveApprovalSchema), async (req, res) => {
    const id = req.params.id as string;
    const existing = await svc.getById(id);
    if (!existing) {
      res.status(404).json({ error: "Approval not found" });
      return;
    }
    const reviewer = assertBoardOrReviewerAgent(req, existing.reviewerAgentId);
    const decidedByAgentId = reviewer.isAgent ? reviewer.agentId : (req.body.decidedByAgentId ?? null);
    const actorType = reviewer.isAgent ? ("agent" as const) : ("user" as const);
    const actorId = reviewer.isAgent ? reviewer.agentId : (req.actor.userId ?? "board");

    const { approval, applied } = await svc.reject(
      id,
      req.body.decidedByUserId ?? (reviewer.isAgent ? null : "board"),
      req.body.decisionNote,
      decidedByAgentId,
    );

    if (applied) {
      await logActivity(db, {
        companyId: approval.companyId,
        actorType,
        actorId,
        agentId: reviewer.isAgent ? reviewer.agentId : null,
        action: "approval.rejected",
        entityType: "approval",
        entityId: approval.id,
        details: { type: approval.type, decidedByAgentId },
      });
    }

    res.json(redactApprovalPayload(approval));
  });

  router.post(
    "/approvals/:id/request-revision",
    validate(requestApprovalRevisionSchema),
    async (req, res) => {
      const id = req.params.id as string;
      const existing = await svc.getById(id);
      if (!existing) {
        res.status(404).json({ error: "Approval not found" });
        return;
      }
      const reviewer = assertBoardOrReviewerAgent(req, existing.reviewerAgentId);
      const decidedByAgentId = reviewer.isAgent ? reviewer.agentId : null;
      const actorType = reviewer.isAgent ? ("agent" as const) : ("user" as const);
      const actorId = reviewer.isAgent ? reviewer.agentId : (req.actor.userId ?? "board");

      const approval = await svc.requestRevision(
        id,
        req.body.decidedByUserId ?? (reviewer.isAgent ? null : "board"),
        req.body.decisionNote,
        decidedByAgentId,
      );

      await logActivity(db, {
        companyId: approval.companyId,
        actorType,
        actorId,
        agentId: reviewer.isAgent ? reviewer.agentId : null,
        action: "approval.revision_requested",
        entityType: "approval",
        entityId: approval.id,
        details: { type: approval.type, decidedByAgentId },
      });

      res.json(redactApprovalPayload(approval));
    },
  );

  router.post("/approvals/:id/resubmit", validate(resubmitApprovalSchema), async (req, res) => {
    const id = req.params.id as string;
    const existing = await svc.getById(id);
    if (!existing) {
      res.status(404).json({ error: "Approval not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);

    if (req.actor.type === "agent" && req.actor.agentId !== existing.requestedByAgentId) {
      res.status(403).json({ error: "Only requesting agent can resubmit this approval" });
      return;
    }

    const normalizedPayload = req.body.payload
      ? existing.type === "hire_agent"
        ? await secretsSvc.normalizeHireApprovalPayloadForPersistence(
            existing.companyId,
            req.body.payload,
            { strictMode: strictSecretsMode },
          )
        : req.body.payload
      : undefined;
    const approval = await svc.resubmit(id, normalizedPayload);
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: approval.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "approval.resubmitted",
      entityType: "approval",
      entityId: approval.id,
      details: { type: approval.type },
    });
    res.json(redactApprovalPayload(approval));
  });

  router.get("/approvals/:id/comments", async (req, res) => {
    const id = req.params.id as string;
    const approval = await svc.getById(id);
    if (!approval) {
      res.status(404).json({ error: "Approval not found" });
      return;
    }
    assertCompanyAccess(req, approval.companyId);
    const comments = await svc.listComments(id);
    res.json(comments);
  });

  router.post("/approvals/:id/comments", validate(addApprovalCommentSchema), async (req, res) => {
    const id = req.params.id as string;
    const approval = await svc.getById(id);
    if (!approval) {
      res.status(404).json({ error: "Approval not found" });
      return;
    }
    assertCompanyAccess(req, approval.companyId);
    const actor = getActorInfo(req);
    const comment = await svc.addComment(id, req.body.body, {
      agentId: actor.agentId ?? undefined,
      userId: actor.actorType === "user" ? actor.actorId : undefined,
    });

    await logActivity(db, {
      companyId: approval.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "approval.comment_added",
      entityType: "approval",
      entityId: approval.id,
      details: { commentId: comment.id },
    });

    res.status(201).json(comment);
  });

  return router;
}
