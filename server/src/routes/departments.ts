import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { departmentBootstrapSchema } from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { departmentService } from "../services/departments.js";
import { logActivity } from "../services/activity-log.js";
import { assertBoard, assertCompanyAccess } from "./authz.js";

export function departmentRoutes(db: Db) {
  const router = Router();
  const svc = departmentService(db);

  router.get("/companies/:companyId/departments/status", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await svc.status(companyId));
  });

  router.post("/companies/:companyId/departments/bootstrap", validate(departmentBootstrapSchema), async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const result = await svc.bootstrap(companyId);
    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: "departments.bootstrapped",
      entityType: "company",
      entityId: companyId,
      details: {
        createdAgents: result.createdAgents.length,
        updatedAgents: result.updatedAgents.length,
        createdSkills: result.createdSkills,
      },
    });
    res.status(201).json(result);
  });

  return router;
}
