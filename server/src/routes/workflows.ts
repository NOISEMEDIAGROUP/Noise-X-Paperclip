import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  startWorkflowRunSchema,
  advanceWorkflowRunSchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { workflowService, logActivity } from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

export function workflowRoutes(db: Db) {
  const router = Router();
  const svc = workflowService(db);

  // List workflows for a company
  router.get("/companies/:companyId/workflows", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const result = await svc.list(companyId);
    res.json(result);
  });

  // Create a workflow
  router.post(
    "/companies/:companyId/workflows",
    validate(createWorkflowSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const actor = getActorInfo(req);
      const workflow = await svc.create(companyId, req.body);

      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        action: "workflow.created",
        entityType: "workflow",
        entityId: workflow.id,
        details: { name: workflow.name },
      });

      res.status(201).json(workflow);
    },
  );

  // Get a workflow by id
  router.get("/workflows/:id", async (req, res) => {
    const id = req.params.id as string;
    const workflow = await svc.getById(id);
    assertCompanyAccess(req, workflow.companyId);
    res.json(workflow);
  });

  // Update a workflow
  router.patch("/workflows/:id", validate(updateWorkflowSchema), async (req, res) => {
    const id = req.params.id as string;
    const existing = await svc.getById(id);
    assertCompanyAccess(req, existing.companyId);
    const actor = getActorInfo(req);
    const updated = await svc.update(id, req.body);

    await logActivity(db, {
      companyId: existing.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "workflow.updated",
      entityType: "workflow",
      entityId: id,
      details: { name: updated.name },
    });

    res.json(updated);
  });

  // Delete a workflow
  router.delete("/workflows/:id", async (req, res) => {
    const id = req.params.id as string;
    const existing = await svc.getById(id);
    assertCompanyAccess(req, existing.companyId);
    const actor = getActorInfo(req);
    await svc.delete(id);

    await logActivity(db, {
      companyId: existing.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "workflow.deleted",
      entityType: "workflow",
      entityId: id,
      details: { name: existing.name },
    });

    res.status(204).end();
  });

  // Start a workflow run
  router.post(
    "/companies/:companyId/workflow-runs",
    validate(startWorkflowRunSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const actor = getActorInfo(req);
      const run = await svc.startRun(companyId, req.body);

      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        action: "workflow_run.started",
        entityType: "workflow_run",
        entityId: run.id,
        details: { workflowId: run.workflowId, issueId: run.issueId },
      });

      res.status(201).json(run);
    },
  );

  // List workflow runs for a company
  router.get("/companies/:companyId/workflow-runs", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const workflowId = req.query.workflowId as string | undefined;
    const result = await svc.listRuns(companyId, workflowId);
    res.json(result);
  });

  // Get a workflow run by id
  router.get("/workflow-runs/:id", async (req, res) => {
    const id = req.params.id as string;
    const run = await svc.getRun(id);
    assertCompanyAccess(req, run.companyId);
    res.json(run);
  });

  // Advance a workflow run to next step
  router.post(
    "/workflow-runs/:id/advance",
    validate(advanceWorkflowRunSchema),
    async (req, res) => {
      const id = req.params.id as string;
      const existing = await svc.getRun(id);
      assertCompanyAccess(req, existing.companyId);
      const actor = getActorInfo(req);
      const run = await svc.advanceRun(id, req.body);

      await logActivity(db, {
        companyId: existing.companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        action: "workflow_run.advanced",
        entityType: "workflow_run",
        entityId: id,
        details: {
          workflowId: run.workflowId,
          currentStepIndex: run.currentStepIndex,
          status: run.status,
        },
      });

      res.json(run);
    },
  );

  return router;
}
