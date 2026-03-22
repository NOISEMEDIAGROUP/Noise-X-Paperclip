// @ts-nocheck
import { Router } from "express";
import { createProductHealthCheckSchema } from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { logActivity, productHealthService } from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";
function productHealthRoutes(db) {
  const router = Router();
  const svc = productHealthService(db);
  router.post("/companies/:companyId/health", validate(createProductHealthCheckSchema), async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    const check = await svc.record(companyId, req.body);
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "product_health.recorded",
      entityType: "product_health_check",
      entityId: check.id,
      details: { status: check.status, endpointUrl: check.endpointUrl }
    });
    res.status(201).json(check);
  });
  router.get("/companies/:companyId/health", async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    res.json(await svc.summary(companyId));
  });
  return router;
}
export {
  productHealthRoutes
};
