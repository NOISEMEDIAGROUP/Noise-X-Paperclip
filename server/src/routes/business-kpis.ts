// @ts-nocheck
import { Router } from "express";
import { createBusinessKpiSchema } from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { businessKpiService, logActivity } from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";
function businessKpiRoutes(db) {
  const router = Router();
  const svc = businessKpiService(db);
  router.post("/companies/:companyId/kpis", validate(createBusinessKpiSchema), async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    const kpi = await svc.upsert(companyId, req.body);
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "business_kpis.upserted",
      entityType: "business_kpi",
      entityId: kpi.id,
      details: { kpiDate: kpi.kpiDate }
    });
    res.status(201).json(kpi);
  });
  router.get("/companies/:companyId/kpis", async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    res.json(await svc.summary(companyId));
  });
  router.get("/companies/:companyId/pnl", async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    res.json(
      await svc.pnl(companyId, {
        from: typeof req.query.from === "string" ? req.query.from : void 0,
        to: typeof req.query.to === "string" ? req.query.to : void 0
      })
    );
  });
  return router;
}
export {
  businessKpiRoutes
};
