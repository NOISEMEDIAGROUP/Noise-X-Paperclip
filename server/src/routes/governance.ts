// @ts-nocheck
import { Router } from "express";
import { governanceActionProposalSchema } from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { governanceService, logActivity } from "../services/index.js";
import { assertBoard, assertCompanyAccess } from "./authz.js";
function governanceRoutes(db) {
  const router = Router();
  const svc = governanceService(db);
  router.get("/companies/:companyId/governance/action-catalog", async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    res.json(svc.actionCatalog());
  });
  router.post(
    "/companies/:companyId/governance/evaluate-action",
    validate(governanceActionProposalSchema),
    async (req, res) => {
      const companyId = req.params.companyId;
      assertCompanyAccess(req, companyId);
      const assessment = await svc.evaluateAction(companyId, req.body);
      await logActivity(db, {
        companyId,
        actorType: req.actor.type === "agent" ? "agent" : "user",
        actorId: req.actor.agentId ?? req.actor.userId ?? "board",
        agentId: req.actor.agentId,
        action: "governance.action_evaluated",
        entityType: "governance_action",
        entityId: `${req.body.agentId}:${req.body.actionId}`,
        details: {
          actionId: req.body.actionId,
          disposition: assessment.disposition,
          riskScore: assessment.riskScore
        }
      });
      res.json(assessment);
    }
  );
  router.post(
    "/companies/:companyId/governance/request-approval",
    validate(governanceActionProposalSchema),
    async (req, res) => {
      assertBoard(req);
      const companyId = req.params.companyId;
      assertCompanyAccess(req, companyId);
      const result = await svc.createApprovalForProposal(companyId, req.body);
      await logActivity(db, {
        companyId,
        actorType: "user",
        actorId: req.actor.userId ?? "board",
        action: "governance.approval_requested",
        entityType: "approval",
        entityId: result.approval.id,
        details: {
          type: result.approval.type,
          actionId: result.approval.actionId,
          disposition: result.assessment.disposition,
          riskScore: result.assessment.riskScore
        }
      });
      res.status(201).json(result);
    }
  );
  return router;
}
export {
  governanceRoutes
};
