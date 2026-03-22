// @ts-nocheck
import { eq } from "drizzle-orm";
import { businessConfigs } from "@paperclipai/db";
const DEFAULT_BUSINESS_CONFIG = {
  productName: null,
  productUrl: null,
  healthcheckUrl: null,
  defaultCurrency: "usd",
  telegramChatId: null,
  notificationEmail: null,
  telegramEnabled: false,
  emailEnabled: false,
  dailyBriefTelegram: true,
  alertTelegram: true,
  dailyBriefEmail: false,
  alertEmail: false,
  stripeSecretKeyName: "business-stripe-secret-key",
  stripeWebhookSecretName: "business-stripe-webhook-secret",
  resendApiKeySecretName: "business-resend-api-key",
  resendFromEmail: null,
  telegramBotTokenSecretName: "business-telegram-bot-token",
  githubRepoOwner: null,
  githubRepoName: null,
  githubTokenSecretName: "business-github-token",
  githubActionsWorkflowName: null,
  linkedinPageId: null,
  linkedinAccessTokenSecretName: "business-linkedin-access-token",
  xAdapterBaseUrl: null,
  xAdapterApiKeySecretName: "business-x-adapter-api-key",
  cryptoProvider: null,
  cryptoWalletAddress: null,
  cryptoNetwork: null,
  cryptoWebhookSecretName: "business-crypto-webhook-secret",
  sentryDsnSecretName: "business-sentry-dsn",
  uptimeKumaUrl: null,
  uptimeKumaApiKeySecretName: "business-uptime-kuma-api-key",
  plausibleSiteId: null,
  plausibleApiKeySecretName: "business-plausible-api-key"
};
function businessConfigService(db) {
  return {
    get: async (companyId) => {
      const row = await db.select().from(businessConfigs).where(eq(businessConfigs.companyId, companyId)).then((rows) => rows[0] ?? null);
      if (!row) {
        return { ...DEFAULT_BUSINESS_CONFIG, companyId };
      }
      return row;
    },
    upsert: async (companyId, patch) => {
      const current = await db.select().from(businessConfigs).where(eq(businessConfigs.companyId, companyId)).then((rows) => rows[0] ?? null);
      const payload = {
        ...DEFAULT_BUSINESS_CONFIG,
        ...current,
        ...patch,
        companyId,
        updatedAt: /* @__PURE__ */ new Date()
      };
      if (!current) {
        const inserted = await db.insert(businessConfigs).values(payload).returning().then((rows) => rows[0]);
        return inserted;
      }
      const updated = await db.update(businessConfigs).set(payload).where(eq(businessConfigs.companyId, companyId)).returning().then((rows) => rows[0]);
      return updated;
    }
  };
}
export {
  businessConfigService
};
