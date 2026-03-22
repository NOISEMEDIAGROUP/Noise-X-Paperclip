// @ts-nocheck
import { Router } from "express";
import { assertBoard, assertCompanyAccess } from "./authz.js";
import { objectivesService } from "../services/objectives.js";
import {
  createObjectiveSchema,
  updateObjectiveSchema,
  createKeyResultSchema,
  updateKeyResultSchema
} from "@paperclipai/shared";
function requireParam(value, name) {
  if (typeof value === "string") return value;
  throw new Error(`Missing route param: ${name}`);
}
function objectivesRoutes(db) {
  const router = Router({ mergeParams: true });
  const svc = objectivesService(db);
  router.get("/", async (req, res) => {
    try {
      const companyId = requireParam(req.params.companyId, "companyId");
      assertBoard(req);
      assertCompanyAccess(req, companyId);
      const objectives = await svc.list(companyId);
      res.json(objectives);
    } catch (err) {
      res.status(500).json({ error: "Failed to list objectives" });
    }
  });
  router.post("/", async (req, res) => {
    try {
      const companyId = requireParam(req.params.companyId, "companyId");
      assertBoard(req);
      assertCompanyAccess(req, companyId);
      const payload = createObjectiveSchema.parse(req.body);
      const objective = await svc.create(companyId, payload);
      res.status(201).json(objective);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
  router.get("/:id", async (req, res) => {
    try {
      const companyId = requireParam(req.params.companyId, "companyId");
      const objectiveId = requireParam(req.params.id, "id");
      assertBoard(req);
      assertCompanyAccess(req, companyId);
      const objective = await svc.getById(objectiveId, companyId);
      res.json(objective);
    } catch (err) {
      res.status(404).json({ error: "Objective not found" });
    }
  });
  router.patch("/:id", async (req, res) => {
    try {
      const companyId = requireParam(req.params.companyId, "companyId");
      const objectiveId = requireParam(req.params.id, "id");
      assertBoard(req);
      assertCompanyAccess(req, companyId);
      const payload = updateObjectiveSchema.parse(req.body);
      const objective = await svc.update(objectiveId, companyId, payload);
      res.json(objective);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
  router.delete("/:id", async (req, res) => {
    try {
      const companyId = requireParam(req.params.companyId, "companyId");
      const objectiveId = requireParam(req.params.id, "id");
      assertBoard(req);
      assertCompanyAccess(req, companyId);
      await svc.delete(objectiveId, companyId);
      res.status(204).end();
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
  router.post("/:id/key-results", async (req, res) => {
    try {
      const companyId = requireParam(req.params.companyId, "companyId");
      const objectiveId = requireParam(req.params.id, "id");
      assertBoard(req);
      assertCompanyAccess(req, companyId);
      const payload = createKeyResultSchema.parse(req.body);
      const kr = await svc.addKeyResult(objectiveId, companyId, payload);
      res.status(201).json(kr);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
  router.patch("/:id/key-results/:krId", async (req, res) => {
    try {
      const companyId = requireParam(req.params.companyId, "companyId");
      const objectiveId = requireParam(req.params.id, "id");
      const keyResultId = requireParam(req.params.krId, "krId");
      assertBoard(req);
      assertCompanyAccess(req, companyId);
      const payload = updateKeyResultSchema.parse(req.body);
      const kr = await svc.updateKeyResult(keyResultId, objectiveId, companyId, payload);
      res.json(kr);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
  router.delete("/:id/key-results/:krId", async (req, res) => {
    try {
      const companyId = requireParam(req.params.companyId, "companyId");
      const objectiveId = requireParam(req.params.id, "id");
      const keyResultId = requireParam(req.params.krId, "krId");
      assertBoard(req);
      assertCompanyAccess(req, companyId);
      await svc.deleteKeyResult(keyResultId, objectiveId, companyId);
      res.status(204).end();
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
  return router;
}
export {
  objectivesRoutes
};
