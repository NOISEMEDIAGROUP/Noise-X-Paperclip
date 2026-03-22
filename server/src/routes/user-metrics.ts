// @ts-nocheck
import { Router } from "express";
import { createUserMetricsSnapshotSchema } from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { logActivity, userMetricsService } from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";
function userMetricsRoutes(db) {
  const router = Router();
  const svc = userMetricsService(db);
  router.post("/companies/:companyId/metrics", validate(createUserMetricsSnapshotSchema), async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    const snapshot = await svc.upsertSnapshot(companyId, req.body);
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "user_metrics.upserted",
      entityType: "user_metrics_snapshot",
      entityId: snapshot.id,
      details: { snapshotDate: snapshot.snapshotDate }
    });
    res.status(201).json(snapshot);
  });
  router.get("/companies/:companyId/users", async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    res.json(
      await svc.summary(companyId, {
        from: typeof req.query.from === "string" ? req.query.from : void 0,
        to: typeof req.query.to === "string" ? req.query.to : void 0
      })
    );
  });
  return router;
}
export {
  userMetricsRoutes
};
