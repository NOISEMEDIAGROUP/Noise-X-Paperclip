// @ts-nocheck
import { desc, eq } from "drizzle-orm";
import { notificationLog } from "@paperclipai/db";
import { unprocessable } from "../errors.js";
import { businessConfigService } from "./business-config.js";
import { secretService } from "./secrets.js";

function slackNotifierService(db) {
  const configs = businessConfigService(db);
  const secrets = secretService(db);

  return {
    /** Send a message to a Slack channel (or thread). */
    send: async (companyId, input) => {
      const config = await configs.get(companyId);

      if (!config) {
        return { status: "failed", error: "No business config found for company" };
      }

      if (!config.slackEnabled) {
        return { status: "skipped", error: "Slack is not enabled" };
      }

      const recipient = input.recipient ?? config.slackDefaultChannelId;
      if (!recipient) {
        throw unprocessable("No Slack channel configured");
      }

      let status = "queued";
      let error = null;
      let sentAt = null;

      const botToken = await secrets.resolveSecretValueByName(companyId, config.slackBotTokenSecretName);
      if (!botToken) {
        status = "failed";
        error = `Missing company secret: ${config.slackBotTokenSecretName}`;
      } else {
        const body = {
          channel: recipient,
          text: input.subject ? `${input.subject}\n\n${input.body}` : input.body,
        };

        // Thread support: if recipient contains thread_ts, post as reply
        const [channelId, threadTs] = recipient.split(":");
        body.channel = channelId;
        if (threadTs) {
          body.thread_ts = threadTs;
        }

        try {
          const response = await fetch("https://slack.com/api/chat.postMessage", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${botToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            status = "failed";
            error = `Slack API HTTP error: ${response.status}`;
          } else {
            const result = await response.json();
            if (!result.ok) {
              status = "failed";
              // Provide actionable error hints
              const errorHints = {
                invalid_auth: "Bot token is invalid — check your Slack app credentials",
                token_revoked: "Bot token has been revoked — reinstall the Slack app",
                channel_not_found: `Channel ${channelId} not found — verify the channel ID`,
                not_in_channel: `Bot is not a member of channel ${channelId} — invite the bot first`,
                missing_scope: "Bot lacks required scopes — add chat:write scope in Slack app settings",
              };
              const hint = errorHints[result.error] ?? "";
              error = `Slack API: ${result.error}${hint ? ` (${hint})` : ""}`;
            } else {
              status = "sent";
              sentAt = new Date();
            }
          }
        } catch (fetchErr) {
          status = "failed";
          error = `Network error: ${fetchErr instanceof Error ? fetchErr.message : "Unknown"}`;
        }
      }

      // Log the notification
      const record = await db.insert(notificationLog).values({
        companyId,
        channel: "slack",
        recipient,
        notificationType: input.type,
        subject: input.subject ?? null,
        body: input.body,
        status,
        error,
        sentAt: sentAt,
      }).returning();

      return { ...record[0], status, error };
    },

    /** List Slack notification log entries. */
    list: async (companyId, limit = 50) =>
      db
        .select()
        .from(notificationLog)
        .where(eq(notificationLog.companyId, companyId))
        .orderBy(desc(notificationLog.createdAt))
        .limit(Math.min(Math.max(limit, 1), 200)),
  };
}

export { slackNotifierService };
