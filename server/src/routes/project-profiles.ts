import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  upsertProjectProfileSchema,
  updateProjectProfileSchema,
  createProjectIntegrationSchema,
  createProjectScraperSchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { projectProfileService, projectService, logActivity } from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

export function projectProfileRoutes(db: Db) {
  const router = Router();
  const profileSvc = projectProfileService(db);
  const projectSvc = projectService(db);

  /** Helper: resolve project and assert company access. */
  async function resolveProject(req: any, res: any) {
    const id = req.params.id as string;
    const project = await projectSvc.getById(id);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return null;
    }
    assertCompanyAccess(req, project.companyId);
    return project;
  }

  // ── Profile ──

  router.get("/projects/:id/profile", async (req, res) => {
    const project = await resolveProject(req, res);
    if (!project) return;
    const profile = await profileSvc.getByProjectId(project.id);
    if (!profile) {
      res.status(404).json({ error: "Project profile not found" });
      return;
    }
    res.json(profile);
  });

  router.put("/projects/:id/profile", validate(upsertProjectProfileSchema), async (req, res) => {
    const project = await resolveProject(req, res);
    if (!project) return;
    const profile = await profileSvc.upsert(project.id, project.companyId, req.body);
    if (!profile) {
      res.status(500).json({ error: "Failed to upsert profile" });
      return;
    }

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: project.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "project.profile_upserted",
      entityType: "project",
      entityId: project.id,
      details: { slug: profile.slug },
    });

    res.json(profile);
  });

  router.patch("/projects/:id/profile", validate(updateProjectProfileSchema), async (req, res) => {
    const project = await resolveProject(req, res);
    if (!project) return;
    const profile = await profileSvc.upsert(project.id, project.companyId, req.body);
    if (!profile) {
      res.status(500).json({ error: "Failed to update profile" });
      return;
    }

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: project.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "project.profile_updated",
      entityType: "project",
      entityId: project.id,
      details: { changedKeys: Object.keys(req.body).sort() },
    });

    res.json(profile);
  });

  // ── Integrations ──

  router.get("/projects/:id/integrations", async (req, res) => {
    const project = await resolveProject(req, res);
    if (!project) return;
    const profile = await profileSvc.getByProjectId(project.id);
    res.json(profile?.integrations ?? []);
  });

  router.post("/projects/:id/integrations", validate(createProjectIntegrationSchema), async (req, res) => {
    const project = await resolveProject(req, res);
    if (!project) return;
    const integration = await profileSvc.addIntegration(project.id, project.companyId, req.body);

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: project.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "project.integration_created",
      entityType: "project",
      entityId: project.id,
      details: { integrationId: integration.id, name: integration.name },
    });

    res.status(201).json(integration);
  });

  router.delete("/projects/:id/integrations/:integrationId", async (req, res) => {
    const project = await resolveProject(req, res);
    if (!project) return;
    const integration = await profileSvc.removeIntegration(req.params.integrationId as string);
    if (!integration) {
      res.status(404).json({ error: "Integration not found" });
      return;
    }

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: project.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "project.integration_deleted",
      entityType: "project",
      entityId: project.id,
      details: { integrationId: integration.id },
    });

    res.json(integration);
  });

  // ── Scrapers ──

  router.get("/projects/:id/scrapers", async (req, res) => {
    const project = await resolveProject(req, res);
    if (!project) return;
    const profile = await profileSvc.getByProjectId(project.id);
    res.json(profile?.scrapers ?? []);
  });

  router.post("/projects/:id/scrapers", validate(createProjectScraperSchema), async (req, res) => {
    const project = await resolveProject(req, res);
    if (!project) return;
    const scraper = await profileSvc.addScraper(project.id, project.companyId, req.body);

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: project.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "project.scraper_created",
      entityType: "project",
      entityId: project.id,
      details: { scraperId: scraper.id, name: scraper.name },
    });

    res.status(201).json(scraper);
  });

  router.delete("/projects/:id/scrapers/:scraperId", async (req, res) => {
    const project = await resolveProject(req, res);
    if (!project) return;
    const scraper = await profileSvc.removeScraper(req.params.scraperId as string);
    if (!scraper) {
      res.status(404).json({ error: "Scraper not found" });
      return;
    }

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: project.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "project.scraper_deleted",
      entityType: "project",
      entityId: project.id,
      details: { scraperId: scraper.id },
    });

    res.json(scraper);
  });

  return router;
}
