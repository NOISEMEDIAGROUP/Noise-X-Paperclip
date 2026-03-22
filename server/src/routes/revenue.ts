// @ts-nocheck
import { Router } from "express";
import { revenueService } from "../services/revenue.js";
import { assertCompanyAccess } from "./authz.js";
function revenueRoutes(db) {
  const router = Router();
  const svc = revenueService(db);
  router.get("/companies/:companyId/revenue", async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    const granularity = ["day", "week", "month"].includes(String(req.query.granularity)) ? req.query.granularity : "day";
    const result = await svc.summary(companyId, {
      from: typeof req.query.from === "string" ? req.query.from : void 0,
      to: typeof req.query.to === "string" ? req.query.to : void 0,
      granularity
    });
    res.json(result);
  });
  router.get("/companies/:companyId/revenue/events", async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    const limit = Number(req.query.limit) || 50;
    const result = await svc.listEvents(companyId, {
      limit,
      type: typeof req.query.type === "string" ? req.query.type : void 0
    });
    res.json(result);
  });
  return router;
}
export {
  revenueRoutes
};
