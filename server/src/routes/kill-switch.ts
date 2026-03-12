import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { assertBoard, assertCompanyAccess } from "./authz.js";
import { killSwitchService } from "../services/kill-switch.js";
import { logActivity } from "../services/activity-log.js";

export function killSwitchRoutes(db: Db) {
  const router = Router();
  const svc = killSwitchService(db);

  router.get("/companies/:companyId/kill-switch/status", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const status = await svc.getStatus(companyId);
    res.json(status);
  });

  router.post("/companies/:companyId/kill-switch/kill-all", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const result = await svc.killAllAgents(companyId);

    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: "kill_switch.kill_all",
      entityType: "company",
      entityId: companyId,
    });

    res.json(result);
  });

  router.post("/kill-switch/shutdown", async (req, res) => {
    assertBoard(req);
    res.json({ ok: true, message: "Server shutting down" });
    svc.shutdownServer();
  });

  return router;
}
