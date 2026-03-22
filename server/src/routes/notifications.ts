// @ts-nocheck
import { Router } from "express";
import { createInfraCostSchema, createNotificationSchema } from "@paperclipai/shared";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { businessKpiService, logActivity, telegramBriefService, telegramNotifierService, slackNotifierService } from "../services/index.js";
import { assertBoard, assertCompanyAccess } from "./authz.js";
import { infraCosts } from "@paperclipai/db";
const briefRequestSchema = z.object({
  type: z.enum(["daily", "weekly", "monthly"]).default("daily")
});
function notificationRoutes(db) {
  const router = Router();
  const notifier = telegramNotifierService(db);
  const slackNotifier = slackNotifierService(db);
  const briefs = telegramBriefService(db);
  const kpis = businessKpiService(db);
  router.post("/companies/:companyId/notify", validate(createNotificationSchema), async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    const notification = req.body.channel === "slack"
      ? await slackNotifier.send(companyId, req.body)
      : await notifier.send(companyId, req.body);
    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: "notification.sent",
      entityType: "notification",
      entityId: notification.id,
      details: { channel: notification.channel, status: notification.status }
    });
    res.status(201).json(notification);
  });
  router.get("/companies/:companyId/notifications", async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    const limit = Number(req.query.limit) || 50;
    res.json(await notifier.list(companyId, limit));
  });
  router.post("/companies/:companyId/notify/brief", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    const parsed = briefRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid brief request" });
      return;
    }
    const result = await briefs.sendTestBrief(companyId, parsed.data.type);
    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: "notification.brief_sent",
      entityType: "notification",
      entityId: result.notificationId ?? companyId,
      details: { type: parsed.data.type, success: result.success }
    });
    if (!result.success) {
      res.status(422).json({ error: result.error ?? "Failed to send brief", brief: result.brief ?? null });
      return;
    }
    res.status(201).json(result);
  });
  router.post("/companies/:companyId/infra-costs", validate(createInfraCostSchema), async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    const entry = await db.insert(infraCosts).values({ ...req.body, companyId, currency: req.body.currency ?? "usd", updatedAt: /* @__PURE__ */ new Date() }).returning().then((rows) => rows[0]);
    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: "infra_cost.created",
      entityType: "infra_cost",
      entityId: entry.id,
      details: { category: entry.category, amountCents: entry.amountCents }
    });
    res.status(201).json(entry);
  });
  router.get("/companies/:companyId/infra-costs", async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    const pnl = await kpis.pnl(companyId, {
      from: typeof req.query.from === "string" ? req.query.from : void 0,
      to: typeof req.query.to === "string" ? req.query.to : void 0
    });
    res.json(pnl.activeInfraCosts);
  });
  return router;
}
export {
  notificationRoutes
};
