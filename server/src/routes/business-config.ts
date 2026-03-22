// @ts-nocheck
import { eq, and } from "drizzle-orm";
import { Router } from "express";
import { companySecrets } from "@paperclipai/db";
import { businessConfigSchema } from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { businessConfigService, githubIntegrationService, logActivity } from "../services/index.js";
import { assertBoard, assertCompanyAccess } from "./authz.js";
function deriveStripeStatus(secretKeyPresent, webhookSecretPresent) {
  if (secretKeyPresent && webhookSecretPresent) return "connected";
  if (secretKeyPresent || webhookSecretPresent) return "partial";
  return "not_configured";
}
function deriveTelegramStatus(enabled, botTokenPresent, chatIdConfigured) {
  if (enabled && botTokenPresent && chatIdConfigured) return "connected";
  if (botTokenPresent || chatIdConfigured) return "partial";
  return "not_configured";
}
function deriveResendStatus(enabled, apiKeyPresent, fromEmailConfigured) {
  if (enabled && apiKeyPresent && fromEmailConfigured) return "connected";
  if (apiKeyPresent || fromEmailConfigured) return "partial";
  return "not_configured";
}
function deriveSecretBackedStatus(secretPresent, configured) {
  if (secretPresent && configured) return "connected";
  if (secretPresent || configured) return "partial";
  return "not_configured";
}
function deriveUrlSecretStatus(urlConfigured, apiKeyPresent) {
  if (urlConfigured && apiKeyPresent) return "connected";
  if (urlConfigured || apiKeyPresent) return "partial";
  return "not_configured";
}
function businessConfigRoutes(db) {
  const router = Router();
  const svc = businessConfigService(db);
  const github = githubIntegrationService(db);
  router.get("/companies/:companyId/business-config", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    res.json(await svc.get(companyId));
  });
  router.patch("/companies/:companyId/business-config", validate(businessConfigSchema), async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    const updated = await svc.upsert(companyId, req.body);
    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: "business_config.updated",
      entityType: "business_config",
      entityId: updated.id ?? companyId,
      details: req.body
    });
    res.json(updated);
  });
  router.get("/companies/:companyId/integration-status", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    const config = await svc.get(companyId);
    const secretNames = [
      config.stripeSecretKeyName,
      config.stripeWebhookSecretName,
      config.resendApiKeySecretName,
      config.telegramBotTokenSecretName,
      config.githubTokenSecretName,
      config.linkedinAccessTokenSecretName,
      config.xAdapterApiKeySecretName,
      config.cryptoWebhookSecretName,
      config.sentryDsnSecretName,
      config.uptimeKumaApiKeySecretName,
      config.plausibleApiKeySecretName,
      config.slackBotTokenSecretName,
      config.slackSigningSecretName
    ].filter(Boolean);
    const presentSecrets = await db.select({ name: companySecrets.name }).from(companySecrets).where(and(eq(companySecrets.companyId, companyId))).then((rows) => new Set(rows.map((r) => r.name)));
    const secretKeyPresent = presentSecrets.has(config.stripeSecretKeyName);
    const webhookSecretPresent = presentSecrets.has(config.stripeWebhookSecretName);
    const resendApiKeyPresent = presentSecrets.has(config.resendApiKeySecretName);
    const botTokenPresent = presentSecrets.has(config.telegramBotTokenSecretName);
    const linkedinAccessTokenPresent = presentSecrets.has(config.linkedinAccessTokenSecretName);
    const xAdapterApiKeyPresent = presentSecrets.has(config.xAdapterApiKeySecretName);
    const cryptoWebhookSecretPresent = presentSecrets.has(config.cryptoWebhookSecretName);
    const sentryDsnPresent = presentSecrets.has(config.sentryDsnSecretName);
    const uptimeKumaApiKeyPresent = presentSecrets.has(config.uptimeKumaApiKeySecretName);
    const plausibleApiKeyPresent = presentSecrets.has(config.plausibleApiKeySecretName);
    const slackBotTokenPresent = presentSecrets.has(config.slackBotTokenSecretName);
    const slackSigningSecretPresent = presentSecrets.has(config.slackSigningSecretName);
    const chatIdConfigured = Boolean(config.telegramChatId && config.telegramChatId.trim().length > 0);
    const resendFromEmailConfigured = Boolean(config.resendFromEmail && config.resendFromEmail.trim().length > 0);
    const linkedinPageConfigured = Boolean(config.linkedinPageId && config.linkedinPageId.trim().length > 0);
    const xAdapterUrlConfigured = Boolean(config.xAdapterBaseUrl && config.xAdapterBaseUrl.trim().length > 0);
    const cryptoConfigured = Boolean(config.cryptoProvider && config.cryptoWalletAddress && config.cryptoNetwork);
    const uptimeKumaUrlConfigured = Boolean(config.uptimeKumaUrl && config.uptimeKumaUrl.trim().length > 0);
    const plausibleSiteIdConfigured = Boolean(config.plausibleSiteId && config.plausibleSiteId.trim().length > 0);
    const webhookUrl = `/api/companies/${companyId}/webhooks/stripe`;
    const githubStatus = await github.status(companyId);
    const result = {
      stripe: {
        secretKeyPresent,
        webhookSecretPresent,
        webhookUrl,
        status: deriveStripeStatus(secretKeyPresent, webhookSecretPresent)
      },
      resend: {
        enabled: config.emailEnabled,
        apiKeyPresent: resendApiKeyPresent,
        fromEmailConfigured: resendFromEmailConfigured,
        status: deriveResendStatus(config.emailEnabled, resendApiKeyPresent, resendFromEmailConfigured)
      },
      telegram: {
        enabled: config.telegramEnabled,
        botTokenPresent,
        chatIdConfigured,
        status: deriveTelegramStatus(config.telegramEnabled, botTokenPresent, chatIdConfigured)
      },
      github: githubStatus.github,
      githubActions: githubStatus.githubActions,
      linkedin: {
        pageConfigured: linkedinPageConfigured,
        tokenPresent: linkedinAccessTokenPresent,
        status: deriveUrlSecretStatus(linkedinPageConfigured, linkedinAccessTokenPresent)
      },
      xAdapter: {
        urlConfigured: xAdapterUrlConfigured,
        apiKeyPresent: xAdapterApiKeyPresent,
        status: deriveUrlSecretStatus(xAdapterUrlConfigured, xAdapterApiKeyPresent)
      },
      crypto: {
        configured: cryptoConfigured,
        webhookSecretPresent: cryptoWebhookSecretPresent,
        status: deriveSecretBackedStatus(cryptoWebhookSecretPresent, cryptoConfigured)
      },
      sentry: {
        secretPresent: sentryDsnPresent,
        configured: sentryDsnPresent,
        status: deriveSecretBackedStatus(sentryDsnPresent, sentryDsnPresent)
      },
      uptimeKuma: {
        urlConfigured: uptimeKumaUrlConfigured,
        apiKeyPresent: uptimeKumaApiKeyPresent,
        status: deriveUrlSecretStatus(uptimeKumaUrlConfigured, uptimeKumaApiKeyPresent)
      },
      plausible: {
        secretPresent: plausibleApiKeyPresent,
        configured: plausibleSiteIdConfigured,
        status: deriveSecretBackedStatus(plausibleApiKeyPresent, plausibleSiteIdConfigured)
      },
      slack: {
        enabled: config.slackEnabled,
        botTokenPresent: slackBotTokenPresent,
        signingSecretPresent: slackSigningSecretPresent,
        defaultChannelConfigured: Boolean(config.slackDefaultChannelId && config.slackDefaultChannelId.trim().length > 0),
        status: deriveTelegramStatus(config.slackEnabled, slackBotTokenPresent, Boolean(config.slackDefaultChannelId && config.slackDefaultChannelId.trim().length > 0))
      }
    };
    res.json(result);
  });
  return router;
}
export {
  businessConfigRoutes
};
