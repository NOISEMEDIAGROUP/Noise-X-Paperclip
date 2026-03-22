import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { createProductSchema, updateProductSchema } from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { logActivity, productService } from "../services/index.js";
import { assertBoard, assertCompanyAccess } from "./authz.js";

export function productRoutes(db: Db) {
  const router = Router();
  const svc = productService(db);

  router.get("/companies/:companyId/products", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await svc.list(companyId));
  });

  router.post("/companies/:companyId/products", validate(createProductSchema), async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const product = await svc.create(companyId, req.body);
    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: "product.created",
      entityType: "product",
      entityId: product.id,
      details: { slug: product.slug, name: product.name },
    });
    res.status(201).json(product);
  });

  router.patch("/companies/:companyId/products/:productId", validate(updateProductSchema), async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    const productId = req.params.productId as string;
    assertCompanyAccess(req, companyId);
    const product = await svc.update(companyId, productId, req.body);
    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: "product.updated",
      entityType: "product",
      entityId: product.id,
      details: req.body,
    });
    res.json(product);
  });

  router.get("/companies/:companyId/products/:productId/analytics", async (req, res) => {
    const companyId = req.params.companyId as string;
    const productId = req.params.productId as string;
    assertCompanyAccess(req, companyId);
    res.json(await svc.analytics(companyId, productId));
  });

  return router;
}
