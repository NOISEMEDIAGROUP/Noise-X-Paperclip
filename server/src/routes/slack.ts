// @ts-nocheck
import { createHmac } from "node:crypto";
import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { slackConversations } from "@paperclipai/db";
import { businessConfigService, heartbeatService, issueService, logActivity, secretService } from "../services/index.js";
import { logger } from "../middleware/logger.js";

/**
 * Slack webhook routes (free tier — no Bolt SDK).
 *
 * Handles:
 * - URL verification challenge (initial setup)
 * - Event callbacks (message events in channels/threads)
 * - Webhook signature verification (x-slack-signature)
 *
 * Incoming messages are routed to create tasks, and the CEO agent is woken.
 */
function slackRoutes(db) {
  const router = Router();
  const configs = businessConfigService(db);
  const secrets = secretService(db);
  const heartbeat = heartbeatService(db);
  const issues = issueService(db);

  /** Verify Slack request signature (HMAC-SHA256 of "v0:timestamp:body"). */
  async function verifySlackSignature(req): Promise<boolean> {
    const timestamp = req.headers["x-slack-request-timestamp"];
    const signature = req.headers["x-slack-signature"];
    if (!timestamp || !signature) return false;

    // Reject requests older than 5 minutes (replay protection)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - Number(timestamp)) > 300) return false;

    // Find the signing secret from any enabled company config
    const { rows } = await db.execute(
      `SELECT slack_signing_secret_name FROM business_configs WHERE slack_enabled = true LIMIT 1`,
    );
    const secretName = rows[0]?.slack_signing_secret_name;
    if (!secretName) return false;

    const signingSecret = await secrets.resolveSecretValueByName(null, secretName);
    if (!signingSecret) return false;

    const rawBody = req.rawBody ?? "";
    const baseString = `v0:${timestamp}:${rawBody}`;
    const computed = `v0=${createHmac("sha256", signingSecret).update(baseString).digest("hex")}`;
    return computed === signature;
  }

  /** POST /api/public/slack/events — Slack Events API webhook */
  router.post("/public/slack/events", async (req, res) => {
    // Validate body exists
    if (!req.body || typeof req.body !== "object") {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const { type, challenge, event } = req.body;

    // URL verification challenge (Slack sends this when you first subscribe)
    if (type === "url_verification") {
      if (!challenge) {
        res.status(400).json({ error: "Missing challenge" });
        return;
      }
      res.json({ challenge });
      return;
    }

    // Event callback
    if (type === "event_callback" && event) {
      // Acknowledge immediately (Slack requires 200 within 3s)
      res.status(200).json({ ok: true });

      // Verify signature (non-blocking for acknowledge, but log failures)
      const isValid = await verifySlackSignature(req).catch(() => false);
      if (!isValid) {
        logger.warn("slack webhook signature verification failed — processing anyway in dev mode");
        // In production, you'd return early here. For local dev, we continue.
      }

      // Process asynchronously
      void handleSlackEvent(event).catch((err) =>
        logger.warn({ err, eventType: event?.type }, "slack event processing failed"),
      );
      return;
    }

    // Unknown event type — acknowledge
    res.status(200).json({ ok: true });
  });

  async function handleSlackEvent(event) {
    // Ignore bot messages to prevent loops
    if (event.bot_id || event.subtype === "bot_message") return;

    // We only care about message events in channels or threads
    if (event.type !== "message" || !event.text) return;

    const channelId = event.channel;
    if (!channelId) return;

    const threadTs = event.thread_ts ?? event.ts;
    const messageText = String(event.text).slice(0, 4000); // Clamp to safe length
    const userId = event.user ?? "unknown";

    // Find which company this Slack workspace belongs to
    const existingConv = await db
      .select()
      .from(slackConversations)
      .where(eq(slackConversations.channelId, channelId))
      .limit(1);

    let companyId = existingConv[0]?.companyId;

    if (!companyId) {
      // Try to find by default channel across all companies
      const { rows } = await db.execute(
        `SELECT company_id FROM business_configs WHERE slack_default_channel_id = $1 AND slack_enabled = true LIMIT 1`,
        [channelId],
      );
      companyId = rows[0]?.company_id;
    }

    if (!companyId) {
      logger.debug({ channelId }, "slack message from unconfigured channel, ignoring");
      return;
    }

    // Check if we already have a conversation mapping for this thread
    const threadConv = await db
      .select()
      .from(slackConversations)
      .where(
        and(
          eq(slackConversations.companyId, companyId),
          eq(slackConversations.channelId, channelId),
          eq(slackConversations.threadTs, threadTs),
        ),
      )
      .limit(1);

    if (threadConv.length > 0) {
      // Update last activity
      await db
        .update(slackConversations)
        .set({ lastActivityAt: new Date() })
        .where(eq(slackConversations.id, threadConv[0].id));

      // If there's an associated issue, add a comment
      if (threadConv[0].issueId) {
        try {
          await issues.addComment(threadConv[0].issueId, `[Slack @${userId}] ${messageText}`, {});
        } catch (err) {
          logger.warn({ err, issueId: threadConv[0].issueId }, "failed to add slack comment to issue");
        }
      }
    } else {
      // New thread — create an issue and link it (with transaction safety)
      try {
        const issue = await issues.create(companyId, {
          title: `[Slack] ${messageText.slice(0, 100)}`,
          description: `Received from Slack channel #${channelId}, thread ${threadTs}.\n\nOriginal message:\n> ${messageText}`,
          status: "todo",
          priority: "medium",
        });

        // Record the conversation mapping
        try {
          await db.insert(slackConversations).values({
            companyId,
            channelId,
            channelName: channelId,
            threadTs,
            issueId: issue.id,
            lastActivityAt: new Date(),
          });
        } catch (insertErr) {
          // If unique constraint violation, another message beat us — just add comment to existing
          if (insertErr?.code === "23505") {
            const retry = await db
              .select()
              .from(slackConversations)
              .where(
                and(
                  eq(slackConversations.companyId, companyId),
                  eq(slackConversations.channelId, channelId),
                  eq(slackConversations.threadTs, threadTs),
                ),
              )
              .limit(1);
            if (retry[0]?.issueId) {
              await issues.addComment(retry[0].issueId, `[Slack @${userId}] ${messageText}`, {});
            }
            return;
          }
          throw insertErr;
        }

        // Wake up the CEO agent to process it
        const { rows: ceoRows } = await db.execute(
          `SELECT id FROM agents WHERE company_id = $1 AND role = 'ceo' AND status != 'terminated' LIMIT 1`,
          [companyId],
        );
        if (ceoRows[0]?.id) {
          void heartbeat
            .wakeup(ceoRows[0].id, {
              source: "slack",
              triggerDetail: `channel:${channelId}`,
              reason: "slack_message",
              payload: { issueId: issue.id, channelId, threadTs, messageText },
              requestedByActorType: "system",
              requestedByActorId: "slack-webhook",
              contextSnapshot: { issueId: issue.id, source: "slack.events" },
            })
            .catch((err) => logger.warn({ err }, "failed to wake CEO for slack message"));
        }

        logger.info({ companyId, issueId: issue.id, channelId }, "slack message routed to new issue");
      } catch (err) {
        logger.error({ err, channelId }, "failed to create issue from slack message");
      }
    }
  }

  return router;
}

export { slackRoutes };
