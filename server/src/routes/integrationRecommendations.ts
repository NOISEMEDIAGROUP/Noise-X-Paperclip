import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  integrationCatalog,
  integrationRecommendations,
  integrationBlocks,
  agents,
} from "@paperclipai/db";
import {
  type IntegrationCatalog,
  type IntegrationRecommendation,
  type IntegrationBlock,
  type CreateRecommendationRequest,
  type GetRecommendationsResponse,
  type GetBlocksResponse,
  type GetCatalogResponse,
} from "@paperclipai/shared";
import { assertBoard, assertCompanyAccess } from "./authz.js";
import { logActivity, publishLiveEvent } from "../services/index.js";

export function integrationRecommendationRoutes(db: Db) {
  const router = Router();

  // ============================================================================
  // Integration Catalog
  // ============================================================================

  /**
   * GET /integrations/catalog
   * Get all available integrations
   */
  router.get("/integrations/catalog", async (req, res) => {
    assertBoard(req);
    
    const integrations = await db
      .select()
      .from(integrationCatalog)
      .orderBy(integrationCatalog.category, integrationCatalog.name);

    const response: GetCatalogResponse = {
      integrations: integrations as IntegrationCatalog[],
    };
    res.json(response);
  });

  // ============================================================================
  // Integration Blocks
  // ============================================================================

  /**
   * GET /companies/:companyId/integration-blocks
   * Get all pending integration blocks for a company
   */
  router.get("/companies/:companyId/integration-blocks", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const blocks = await db
      .select()
      .from(integrationBlocks)
      .where(
        and(
          eq(integrationBlocks.companyId, companyId),
          eq(integrationBlocks.status, "pending")
        )
      )
      .orderBy(desc(integrationBlocks.createdAt));

    const response: GetBlocksResponse = {
      blocks: blocks as IntegrationBlock[],
    };
    res.json(response);
  });

  /**
   * POST /companies/:companyId/integration-blocks/:blockId/dismiss
   * Dismiss an integration block (user chose to skip)
   */
  router.post(
    "/companies/:companyId/integration-blocks/:blockId/dismiss",
    async (req, res) => {
      assertBoard(req);
      const companyId = req.params.companyId as string;
      const blockId = req.params.blockId as string;
      assertCompanyAccess(req, companyId);

      const [existing] = await db
        .select()
        .from(integrationBlocks)
        .where(eq(integrationBlocks.id, blockId));

      if (!existing) {
        res.status(404).json({ error: "Block not found" });
        return;
      }

      if (existing.companyId !== companyId) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      const [updated] = await db
        .update(integrationBlocks)
        .set({
          status: "dismissed",
          resolvedAt: new Date(),
          resolvedBy: "user_skip",
          updatedAt: new Date(),
        })
        .where(eq(integrationBlocks.id, blockId))
        .returning();

      await logActivity(db, {
        companyId,
        actorType: "user",
        actorId: req.actor.userId ?? "board",
        action: "integration_block.dismissed",
        entityType: "integration_block",
        entityId: blockId,
        details: { integrationId: existing.integrationId },
      });

      res.json(updated);
    }
  );

  /**
   * POST /companies/:companyId/integration-blocks/:blockId/resolve
   * Mark an integration block as resolved (user set up the integration)
   */
  router.post(
    "/companies/:companyId/integration-blocks/:blockId/resolve",
    async (req, res) => {
      assertBoard(req);
      const companyId = req.params.companyId as string;
      const blockId = req.params.blockId as string;
      assertCompanyAccess(req, companyId);

      const [existing] = await db
        .select()
        .from(integrationBlocks)
        .where(eq(integrationBlocks.id, blockId));

      if (!existing) {
        res.status(404).json({ error: "Block not found" });
        return;
      }

      if (existing.companyId !== companyId) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      const [updated] = await db
        .update(integrationBlocks)
        .set({
          status: "resolved",
          resolvedAt: new Date(),
          resolvedBy: "user_setup",
          updatedAt: new Date(),
        })
        .where(eq(integrationBlocks.id, blockId))
        .returning();

      await logActivity(db, {
        companyId,
        actorType: "user",
        actorId: req.actor.userId ?? "board",
        action: "integration_block.resolved",
        entityType: "integration_block",
        entityId: blockId,
        details: { integrationId: existing.integrationId },
      });

      res.json(updated);
    }
  );

  // ============================================================================
  // Integration Recommendations
  // ============================================================================

  /**
   * GET /companies/:companyId/integration-recommendations
   * Get all recommendations for a company, grouped by status
   */
  router.get(
    "/companies/:companyId/integration-recommendations",
    async (req, res) => {
      assertBoard(req);
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);

      const allRecommendations = await db
        .select()
        .from(integrationRecommendations)
        .where(eq(integrationRecommendations.companyId, companyId))
        .orderBy(desc(integrationRecommendations.priority), desc(integrationRecommendations.createdAt));

      const response: GetRecommendationsResponse = {
        pending: allRecommendations.filter((r) => r.status === "pending") as IntegrationRecommendation[],
        connected: allRecommendations.filter((r) => r.status === "connected") as IntegrationRecommendation[],
        dismissed: allRecommendations.filter((r) => r.status === "dismissed") as IntegrationRecommendation[],
      };
      res.json(response);
    }
  );

  /**
   * POST /companies/:companyId/integration-recommendations
   * Create a new integration recommendation (typically called by agents)
   * 
   * Access: Board users and agents can create recommendations.
   * Agents can only create recommendations for their own company.
   */
  router.post(
    "/companies/:companyId/integration-recommendations",
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);

      // Allow both board and agent access
      if (req.actor.type !== "board" && req.actor.type !== "agent") {
        res.status(403).json({ error: "Board or agent access required" });
        return;
      }

      const data: CreateRecommendationRequest = req.body;

      // Get agent role if this is an agent request
      let agentRole: string | null = null;
      if (req.actor.type === "agent" && req.actor.agentId) {
        const [agent] = await db
          .select({ role: agents.role })
          .from(agents)
          .where(eq(agents.id, req.actor.agentId))
          .limit(1);
        agentRole = agent?.role ?? null;
      }

      // Check if a recommendation for this integration already exists
      const [existing] = await db
        .select()
        .from(integrationRecommendations)
        .where(
          and(
            eq(integrationRecommendations.companyId, companyId),
            eq(integrationRecommendations.integrationId, data.integrationId),
            eq(integrationRecommendations.status, "pending")
          )
        );

      if (existing) {
        // Update existing recommendation with new context
        const [updated] = await db
          .update(integrationRecommendations)
          .set({
            reason: data.reason,
            useCase: data.useCase ?? existing.useCase,
            taskTitle: data.taskTitle ?? existing.taskTitle,
            agentRole: agentRole ?? existing.agentRole,
            updatedAt: new Date(),
          })
          .where(eq(integrationRecommendations.id, existing.id))
          .returning();

        res.json(updated);
        return;
      }

      // Create new recommendation
      const [created] = await db
        .insert(integrationRecommendations)
        .values({
          companyId,
          agentId: req.actor.agentId ?? null,
          agentRole: agentRole,
          integrationId: data.integrationId,
          integrationName: data.integrationName,
          reason: data.reason,
          useCase: data.useCase ?? null,
          priority: data.priority ?? 0,
          isFree: data.isFree,
          isOpenSource: data.isOpenSource ?? false,
          pricingNotes: data.pricingNotes ?? null,
          taskId: data.taskId ?? null,
          taskTitle: data.taskTitle ?? null,
          status: "pending",
        })
        .returning();

      await logActivity(db, {
        companyId,
        actorType: req.actor.type === "agent" ? "agent" : "user",
        actorId: req.actor.agentId ?? req.actor.userId ?? "unknown",
        action: "integration_recommendation.created",
        entityType: "integration_recommendation",
        entityId: created.id,
        details: { integrationId: data.integrationId, reason: data.reason },
      });

      // Publish live event for real-time UI updates
      publishLiveEvent({
        companyId,
        type: "integration_recommendation.created",
        payload: {
          id: created.id,
          integrationId: data.integrationId,
          integrationName: data.integrationName,
          reason: data.reason,
          isFree: data.isFree,
          isOpenSource: data.isOpenSource ?? false,
          agentRole: agentRole,
        },
      });

      res.status(201).json(created);
    }
  );

  /**
   * POST /companies/:companyId/integration-recommendations/:recId/dismiss
   * Dismiss a recommendation
   */
  router.post(
    "/companies/:companyId/integration-recommendations/:recId/dismiss",
    async (req, res) => {
      assertBoard(req);
      const companyId = req.params.companyId as string;
      const recId = req.params.recId as string;
      assertCompanyAccess(req, companyId);

      const [existing] = await db
        .select()
        .from(integrationRecommendations)
        .where(eq(integrationRecommendations.id, recId));

      if (!existing) {
        res.status(404).json({ error: "Recommendation not found" });
        return;
      }

      if (existing.companyId !== companyId) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      const [updated] = await db
        .update(integrationRecommendations)
        .set({
          status: "dismissed",
          updatedAt: new Date(),
        })
        .where(eq(integrationRecommendations.id, recId))
        .returning();

      await logActivity(db, {
        companyId,
        actorType: "user",
        actorId: req.actor.userId ?? "board",
        action: "integration_recommendation.dismissed",
        entityType: "integration_recommendation",
        entityId: recId,
        details: { integrationId: existing.integrationId },
      });

      res.json(updated);
    }
  );

  /**
   * POST /companies/:companyId/integration-recommendations/:recId/connect
   * Mark a recommendation as connected (user set up the integration)
   */
  router.post(
    "/companies/:companyId/integration-recommendations/:recId/connect",
    async (req, res) => {
      assertBoard(req);
      const companyId = req.params.companyId as string;
      const recId = req.params.recId as string;
      assertCompanyAccess(req, companyId);

      const [existing] = await db
        .select()
        .from(integrationRecommendations)
        .where(eq(integrationRecommendations.id, recId));

      if (!existing) {
        res.status(404).json({ error: "Recommendation not found" });
        return;
      }

      if (existing.companyId !== companyId) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      const [updated] = await db
        .update(integrationRecommendations)
        .set({
          status: "connected",
          connectedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(integrationRecommendations.id, recId))
        .returning();

      await logActivity(db, {
        companyId,
        actorType: "user",
        actorId: req.actor.userId ?? "board",
        action: "integration_recommendation.connected",
        entityType: "integration_recommendation",
        entityId: recId,
        details: { integrationId: existing.integrationId },
      });

      res.json(updated);
    }
  );

  return router;
}