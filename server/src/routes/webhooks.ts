// @ts-nocheck
import { Router } from "express";
import { newsletterService } from "../services/newsletter.js";
import { revenueService } from "../services/revenue.js";
function webhookRoutes(db) {
  const router = Router();
  const revenue = revenueService(db);
  const newsletter = newsletterService(db);
  router.post("/companies/:companyId/webhooks/stripe", async (req, res) => {
    const companyId = req.params.companyId;
    const rawBody = req.rawBody ?? JSON.stringify(req.body ?? {});
    const result = await revenue.ingestStripeWebhook(
      companyId,
      req.body ?? {},
      req.header("stripe-signature") ?? void 0,
      rawBody
    );
    const newsletterResult = await newsletter.handleStripeEvent(
      companyId,
      req.body ?? {}
    );
    res.status(200).json({ ...result, newsletter: newsletterResult });
  });
  return router;
}
export {
  webhookRoutes
};
