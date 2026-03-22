import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { autonomyTestService } from "../services/autonomy-test.js";
import { assertBoard, assertCompanyAccess } from "./authz.js";

export function autonomyTestRoutes(db: Db) {
  const router = Router();
  const svc = autonomyTestService(db);

  router.post("/companies/:companyId/autonomy-test/run", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const result = await svc.run(companyId, baseUrl);
    res.status(201).json(result);
  });

  return router;
}
