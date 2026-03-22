// @ts-nocheck
import { Router } from "express";
import { newsletterCheckoutSchema, newsletterSubscribeSchema, newsletterUnsubscribeSchema } from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { newsletterService } from "../services/index.js";
import { assertBoard, assertCompanyAccess } from "./authz.js";
function newsletterRoutes(db) {
  const router = Router();
  const svc = newsletterService(db);
  router.get("/companies/:companyId/newsletter", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    res.json(await svc.summary(companyId));
  });
  router.get("/companies/:companyId/newsletter/subscribers", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    res.json(await svc.listSubscribers(companyId));
  });
  router.get("/public/newsletter/:companyPrefix", async (req, res) => {
    res.json(await svc.landingInfo(req.params.companyPrefix));
  });
  router.post("/public/newsletter/:companyPrefix/subscribe", validate(newsletterSubscribeSchema), async (req, res) => {
    const subscriber = await svc.subscribe(req.params.companyPrefix, req.body);
    res.status(201).json(subscriber);
  });
  router.post("/public/newsletter/:companyPrefix/checkout", validate(newsletterCheckoutSchema), async (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const result = await svc.createCheckout(req.params.companyPrefix, req.body, baseUrl);
    res.status(201).json(result);
  });
  router.get("/public/newsletter/:companyPrefix/demo-checkout/:subscriberId", async (req, res) => {
    const result = await svc.completeDemoCheckout(req.params.companyPrefix, req.params.subscriberId);
    res.redirect(result.redirectUrl);
  });
  router.post("/public/newsletter/:companyPrefix/unsubscribe", validate(newsletterUnsubscribeSchema), async (_req, res) => {
    const subscriber = await svc.unsubscribe(_req.params.companyPrefix, _req.body.email);
    res.json(subscriber);
  });
  router.get("/public/newsletter/:companyPrefix/health", async (req, res) => {
    res.json(await svc.publicHealth(req.params.companyPrefix));
  });
  return router;
}
export {
  newsletterRoutes
};
