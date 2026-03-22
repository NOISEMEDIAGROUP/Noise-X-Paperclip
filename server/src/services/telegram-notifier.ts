// @ts-nocheck
import { desc, eq } from "drizzle-orm";
import { notificationLog } from "@paperclipai/db";
import { unprocessable } from "../errors.js";
import { businessConfigService } from "./business-config.js";
import { secretService } from "./secrets.js";
function telegramNotifierService(db) {
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
    }
  };
}
export {
  telegramNotifierService
};
