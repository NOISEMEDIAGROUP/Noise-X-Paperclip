// @ts-nocheck
import { pgTable, uuid, text, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
const businessConfigs = pgTable(
  "business_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    productName: text("product_name"),
    productUrl: text("product_url"),
    healthcheckUrl: text("healthcheck_url"),
    defaultCurrency: text("default_currency").notNull().default("usd"),
    telegramChatId: text("telegram_chat_id"),
    notificationEmail: text("notification_email"),
    telegramEnabled: boolean("telegram_enabled").notNull().default(false),
    emailEnabled: boolean("email_enabled").notNull().default(false),
    dailyBriefTelegram: boolean("daily_brief_telegram").notNull().default(true),
    alertTelegram: boolean("alert_telegram").notNull().default(true),
    dailyBriefEmail: boolean("daily_brief_email").notNull().default(false),
    alertEmail: boolean("alert_email").notNull().default(false),
    stripeSecretKeyName: text("stripe_secret_key_name").notNull().default("business-stripe-secret-key"),
    stripeWebhookSecretName: text("stripe_webhook_secret_name").notNull().default("business-stripe-webhook-secret"),
    resendApiKeySecretName: text("resend_api_key_secret_name").notNull().default("business-resend-api-key"),
    resendFromEmail: text("resend_from_email"),
    telegramBotTokenSecretName: text("telegram_bot_token_secret_name").notNull().default("business-telegram-bot-token"),
    githubRepoOwner: text("github_repo_owner"),
    githubRepoName: text("github_repo_name"),
    githubTokenSecretName: text("github_token_secret_name").notNull().default("business-github-token"),
    githubActionsWorkflowName: text("github_actions_workflow_name"),
    linkedinPageId: text("linkedin_page_id"),
    linkedinAccessTokenSecretName: text("linkedin_access_token_secret_name").notNull().default("business-linkedin-access-token"),
    xAdapterBaseUrl: text("x_adapter_base_url"),
    xAdapterApiKeySecretName: text("x_adapter_api_key_secret_name").notNull().default("business-x-adapter-api-key"),
    cryptoProvider: text("crypto_provider"),
    cryptoWalletAddress: text("crypto_wallet_address"),
    cryptoNetwork: text("crypto_network"),
    cryptoWebhookSecretName: text("crypto_webhook_secret_name").notNull().default("business-crypto-webhook-secret"),
    sentryDsnSecretName: text("sentry_dsn_secret_name").notNull().default("business-sentry-dsn"),
    uptimeKumaUrl: text("uptime_kuma_url"),
    uptimeKumaApiKeySecretName: text("uptime_kuma_api_key_secret_name").notNull().default("business-uptime-kuma-api-key"),
    plausibleSiteId: text("plausible_site_id"),
    plausibleApiKeySecretName: text("plausible_api_key_secret_name").notNull().default("business-plausible-api-key"),
    slackBotTokenSecretName: text("slack_bot_token_secret_name").notNull().default("business-slack-bot-token"),
    slackSigningSecretName: text("slack_signing_secret_name").notNull().default("business-slack-signing-secret"),
    slackEnabled: boolean("slack_enabled").notNull().default(false),
    slackDefaultChannelId: text("slack_default_channel_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    companyUniqueIdx: uniqueIndex("business_configs_company_idx").on(table.companyId)
  })
);
export {
  businessConfigs
};
