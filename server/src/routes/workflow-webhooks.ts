import { Router, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { workflowWebhooks, workflows, workflowRuns } from "@paperclipai/db";
import type { Db } from "@paperclipai/db";
import { createHmac } from "node:crypto";
import { logger } from "../middleware/logger.js";
import { getWorkflowExecutor } from "../services/workflow-executor.js";
import { assertCompanyAccess } from "./authz.js";

/**
 * Webhook handler for triggering workflows via HTTP POST
 */
export function createWorkflowWebhookRoutes(db: Db): Router {
  const router = Router({ mergeParams: true });

  /**
   * POST /webhooks/workflow/:webhookId
   * Public webhook endpoint for triggering workflows
   */
  router.post("/:webhookId", async (req: Request, res: Response) => {
    try {
      const webhookId = String(req.params.webhookId);
      const signature = req.headers["x-webhook-signature"] as string;

      // Get webhook configuration
      const webhook = await db
        .select()
        .from(workflowWebhooks)
        .where(eq(workflowWebhooks.id, webhookId))
        .limit(1);

      if (webhook.length === 0) {
        return res.status(404).json({ error: "Webhook not found" });
      }

      const webhookConfig = webhook[0];

      // Validate signature if provided
      if (signature && webhookConfig.webhookSecret) {
        const payload = JSON.stringify(req.body);
        const expectedSignature = createHmac("sha256", webhookConfig.webhookSecret)
          .update(payload)
          .digest("hex");

        if (signature !== expectedSignature) {
          logger.warn(`Invalid webhook signature for webhook ${webhookId}`);
          return res.status(401).json({ error: "Invalid signature" });
        }
      }

      // Check if webhook is active
      if (webhookConfig.isActive !== "true") {
        return res.status(403).json({ error: "Webhook is inactive" });
      }

      // Get workflow details
      const workflowList = await db
        .select()
        .from(workflows)
        .where(eq(workflows.id, webhookConfig.workflowId))
        .limit(1);

      if (workflowList.length === 0) {
        return res.status(404).json({ error: "Workflow not found" });
      }

      // Create workflow run with webhook payload as variables
      const newRun = await db
        .insert(workflowRuns)
        .values({
          workflowId: webhookConfig.workflowId,
          companyId: webhookConfig.companyId,
          status: "running",
          variables: (req.body || {}) as Record<string, unknown>,
          triggerData: {
            trigger: "webhook",
            webhookId,
            timestamp: new Date(),
          },
        })
        .returning();

      const runId = newRun[0].id;

      // Execute workflow asynchronously
      const executor = getWorkflowExecutor(db);
      executor.executeWorkflow(runId, webhookConfig.companyId).catch((error: any) => {
        logger.error(
          `Error executing workflow ${webhookConfig.workflowId}: ${error?.message}`
        );
      });

      logger.info(`Webhook ${webhookId} triggered workflow run ${runId}`);

      // Return immediately with run ID (execution happens async)
      return res.status(202).json({
        runId,
        status: "running",
        message: "Webhook received and workflow execution started",
      });
    } catch (error: any) {
      logger.error(`Error processing webhook: ${error?.message}`);
      return res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });

  /**
   * POST /companies/:companyId/workflows/:id/webhooks
   * Create a webhook for a workflow
   */
  router.post("/", async (req: Request, res: Response) => {
    try {
      const companyId = String(req.params.companyId);
      const workflowId = String(req.params.id);
      assertCompanyAccess(req, companyId);

      // Verify workflow exists
      const existing = await db
        .select()
        .from(workflows)
        .where(and(eq(workflows.id, workflowId), eq(workflows.companyId, companyId)))
        .limit(1);

      if (existing.length === 0) {
        return res.status(404).json({ error: "Workflow not found" });
      }

      // Generate webhook secret
      const webhookSecret = createHmac("sha256", String(Date.now()))
        .update(workflowId + companyId)
        .digest("hex");

      // Create webhook
      const newWebhook = await db
        .insert(workflowWebhooks)
        .values({
          companyId,
          workflowId,
          webhookUrl: "", // Will be set after ID is generated
          webhookSecret,
          isActive: "true",
        })
        .returning();

      const webhookId = newWebhook[0].id;
      const webhookUrl = `${process.env.PAPERCLIP_API_URL || "http://localhost:3000"}/webhooks/workflow/${webhookId}`;

      // Update webhook with actual URL
      await db
        .update(workflowWebhooks)
        .set({ webhookUrl })
        .where(eq(workflowWebhooks.id, webhookId));

      logger.info(`Created webhook ${webhookId} for workflow ${workflowId}`);

      return res.status(201).json({
        id: webhookId,
        url: webhookUrl,
        secret: webhookSecret,
        message: "Use the secret to sign webhook requests with HMAC-SHA256",
      });
    } catch (error: any) {
      logger.error(`Error creating webhook: ${error?.message}`);
      return res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });

  /**
   * GET /companies/:companyId/workflows/:id/webhooks
   * List webhooks for a workflow
   */
  router.get("/", async (req: Request, res: Response) => {
    try {
      const companyId = String(req.params.companyId);
      const workflowId = String(req.params.id);
      assertCompanyAccess(req, companyId);

      const hooks = await db
        .select()
        .from(workflowWebhooks)
        .where(and(eq(workflowWebhooks.workflowId, workflowId), eq(workflowWebhooks.companyId, companyId)));

      return res.json(hooks);
    } catch (error: any) {
      logger.error(`Error fetching webhooks: ${error?.message}`);
      return res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });

  /**
   * DELETE /companies/:companyId/workflows/:id/webhooks/:webhookId
   * Delete a webhook
   */
  router.delete("/:webhookId", async (req: Request, res: Response) => {
    try {
      const companyId = String(req.params.companyId);
      const webhookId = String(req.params.webhookId);
      assertCompanyAccess(req, companyId);

      // Verify webhook belongs to company
      const existing = await db
        .select()
        .from(workflowWebhooks)
        .where(and(eq(workflowWebhooks.id, webhookId), eq(workflowWebhooks.companyId, companyId)))
        .limit(1);

      if (existing.length === 0) {
        return res.status(404).json({ error: "Webhook not found" });
      }

      // Delete webhook
      await db.delete(workflowWebhooks).where(eq(workflowWebhooks.id, webhookId));

      logger.info(`Deleted webhook ${webhookId}`);
      return res.status(204).send();
    } catch (error: any) {
      logger.error(`Error deleting webhook: ${error?.message}`);
      return res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });

  return router;
}
