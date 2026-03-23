// @ts-nocheck
import { desc, eq } from "drizzle-orm";
import { notificationLog } from "@paperclipai/db";
import { unprocessable } from "../errors.js";
import { businessConfigService } from "./business-config.js";
import { secretService } from "./secrets.js";
import type { Db } from "@paperclipai/db";

interface TelegramApprovalRequest {
  approvalId: string;
  description: string;
  impactSummary: string;
  riskTier: string; // "green" | "yellow" | "red"
  autoApproveAt?: Date | null;
}

function telegramNotifierService(db: Db) {
  const configs = businessConfigService(db);
  const secrets = secretService(db);
  
  return {
    list: async (companyId, limit = 50) => db.select().from(notificationLog).where(eq(notificationLog.companyId, companyId)).orderBy(desc(notificationLog.createdAt)).limit(Math.min(Math.max(limit, 1), 200)),

    send: async (companyId, input) => {
      const config = await configs.get(companyId);
      const recipient = input.recipient ?? (input.channel === "telegram" ? config.telegramChatId : config.notificationEmail);
      if (!recipient) {
        throw unprocessable(`No ${input.channel} recipient configured`);
      }
      let status = "queued";
      let error = null;
      let sentAt = null;
      if (input.channel === "telegram") {
        const token = await secrets.resolveSecretValueByName(companyId, config.telegramBotTokenSecretName);
        if (!token) {
          status = "failed";
          error = `Missing company secret: ${config.telegramBotTokenSecretName}`;
        } else {
          const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: recipient, text: input.subject ? `${input.subject}

${input.body}` : input.body })
          });
          if (!response.ok) {
            status = "failed";
            error = `Telegram API error: ${response.status}`;
          } else {
            status = "sent";
            sentAt = /* @__PURE__ */ new Date();
          }
        }
      } else {
        const resendApiKey = await secrets.resolveSecretValueByName(companyId, config.resendApiKeySecretName);
        const fromEmail = config.resendFromEmail?.trim() ?? "";
        if (!resendApiKey) {
          status = "failed";
          error = `Missing company secret: ${config.resendApiKeySecretName}`;
        } else if (!fromEmail) {
          status = "failed";
          error = "Resend from email is not configured";
        } else {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [recipient],
              subject: input.subject ?? "Paperclip notification",
              text: input.body
            })
          });
          if (!response.ok) {
            status = "failed";
            error = `Resend API error: ${response.status}`;
          } else {
            status = "sent";
            sentAt = /* @__PURE__ */ new Date();
          }
        }
      }
      const record = await db.insert(notificationLog).values({
        companyId,
        channel: input.channel,
        recipient,
        notificationType: input.type,
        subject: input.subject ?? null,
        body: input.body,
        status,
        error,
        sentAt,
        updatedAt: /* @__PURE__ */ new Date()
      }).returning().then((rows) => rows[0]);
      return record;
    },

    // New function for sending approval requests with inline buttons
    sendApprovalRequest: async (companyId: string, approvalReq: TelegramApprovalRequest) => {
      const config = await configs.get(companyId);
      const recipient = config.telegramChatId;  // For approvals, use the default telegram chat ID
      
      if (!recipient) {
        throw unprocessable("No Telegram chat ID configured for approval notifications");
      }
      
      const token = await secrets.resolveSecretValueByName(companyId, config.telegramBotTokenSecretName);
      if (!token) {
        throw unprocessable(`Missing Telegram bot token for company ${companyId}`);
      }

      // Prepare risk tier label with emoji
      const tierEmoji = approvalReq.riskTier === "red" ? "🔴" : 
                       approvalReq.riskTier === "yellow" ? "🟡" : "🟢";
      
      const autoText = approvalReq.autoApproveAt
        ? `\nAuto-approves: ${approvalReq.autoApproveAt.toLocaleString()}`
        : "";
      
      const text = `${tierEmoji} *${approvalReq.riskTier.toUpperCase()} - Action Required*\n\n${approvalReq.description}\n\n_${approvalReq.impactSummary}_${autoText}`;

      // Send Telegram message with inline keyboard
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: recipient,
          text: text,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[
              { text: "✓ Approve", callback_data: `approve:${approvalReq.approvalId}` },
              { text: "✗ Reject", callback_data: `reject:${approvalReq.approvalId}` }
            ]]
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Telegram API error when sending approval request: ${response.status}`);
      }
      
      // Log the notification in the notification log
      const record = await db.insert(notificationLog).values({
        companyId,
        channel: "telegram",
        recipient,
        notificationType: "approval_request",
        subject: `${approvalReq.riskTier} - Action Required`,
        body: `${approvalReq.description}\n${approvalReq.impactSummary}`,
        status: "sent",
        error: null,
        sentAt: new Date(),
        updatedAt: new Date()
      }).returning().then((rows) => rows[0]);
      
      return record;
    }
  };
}

export {
  telegramNotifierService
};
