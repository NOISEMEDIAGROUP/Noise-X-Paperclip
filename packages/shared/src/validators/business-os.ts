import { z } from "zod";

const optionalUrl = z.string().url().nullable().optional();

export const businessConfigSchema = z.object({
  productName: z.string().trim().min(1).nullable().optional(),
  productUrl: optionalUrl,
  healthcheckUrl: optionalUrl,
  defaultCurrency: z.string().trim().min(1).optional(),
  telegramChatId: z.string().trim().min(1).nullable().optional(),
  notificationEmail: z.string().email().nullable().optional(),
  telegramEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  dailyBriefTelegram: z.boolean().optional(),
  alertTelegram: z.boolean().optional(),
  dailyBriefEmail: z.boolean().optional(),
  alertEmail: z.boolean().optional(),
  stripeSecretKeyName: z.string().trim().min(1).max(120).optional(),
  stripeWebhookSecretName: z.string().trim().min(1).max(120).optional(),
  resendApiKeySecretName: z.string().trim().min(1).max(120).optional(),
  resendFromEmail: z.string().email().nullable().optional(),
  telegramBotTokenSecretName: z.string().trim().min(1).max(120).optional(),
  githubRepoOwner: z.string().trim().min(1).max(120).nullable().optional(),
  githubRepoName: z.string().trim().min(1).max(120).nullable().optional(),
  githubTokenSecretName: z.string().trim().min(1).max(120).optional(),
  githubActionsWorkflowName: z.string().trim().min(1).max(160).nullable().optional(),
  linkedinPageId: z.string().trim().min(1).max(120).nullable().optional(),
  linkedinAccessTokenSecretName: z.string().trim().min(1).max(120).optional(),
  xAdapterBaseUrl: optionalUrl,
  xAdapterApiKeySecretName: z.string().trim().min(1).max(120).optional(),
  cryptoProvider: z.string().trim().min(1).max(120).nullable().optional(),
  cryptoWalletAddress: z.string().trim().min(1).max(256).nullable().optional(),
  cryptoNetwork: z.string().trim().min(1).max(120).nullable().optional(),
  cryptoWebhookSecretName: z.string().trim().min(1).max(120).optional(),
  sentryDsnSecretName: z.string().trim().min(1).max(120).optional(),
  uptimeKumaUrl: optionalUrl,
  uptimeKumaApiKeySecretName: z.string().trim().min(1).max(120).optional(),
  plausibleSiteId: z.string().trim().min(1).max(120).nullable().optional(),
  plausibleApiKeySecretName: z.string().trim().min(1).max(120).optional(),
  slackBotTokenSecretName: z.string().trim().min(1).max(120).optional(),
  slackSigningSecretName: z.string().trim().min(1).max(120).optional(),
  slackEnabled: z.boolean().optional(),
  slackDefaultChannelId: z.string().trim().min(1).max(120).nullable().optional(),
});

export const createUserMetricsSnapshotSchema = z.object({
  snapshotDate: z.string().optional(),
  totalUsers: z.number().int().nonnegative(),
  paidUsers: z.number().int().nonnegative(),
  freeUsers: z.number().int().nonnegative(),
  newSignups: z.number().int().nonnegative(),
  churned: z.number().int().nonnegative(),
  mrrCents: z.number().int().nonnegative(),
  arrCents: z.number().int().nonnegative().optional(),
  arpuCents: z.number().int().nonnegative().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const createProductHealthCheckSchema = z.object({
  endpointUrl: z.string().url().or(z.string().trim().min(1)),
  status: z.enum(["healthy", "degraded", "down"]),
  httpStatus: z.number().int().nullable().optional(),
  responseMs: z.number().int().nullable().optional(),
  error: z.string().nullable().optional(),
  sslExpiresAt: z.string().nullable().optional(),
  checkedAt: z.string().optional(),
});

export const createBusinessKpiSchema = z.object({
  kpiDate: z.string().optional(),
  mrrCents: z.number().int(),
  totalRevenueCents: z.number().int(),
  totalCostsCents: z.number().int(),
  netProfitCents: z.number().int(),
  marginPercent: z.number(),
  ltvCents: z.number().int().nullable().optional(),
  cacCents: z.number().int().nullable().optional(),
  ltvCacRatio: z.number().nullable().optional(),
  monthlyChurnRate: z.number().nullable().optional(),
  burnRateCents: z.number().int(),
  metadata: z.record(z.unknown()).optional(),
});

export const createNotificationSchema = z.object({
  channel: z.enum(["telegram", "email", "slack"]),
  type: z.enum(["daily_brief", "alert", "weekly_pnl", "critical", "test", "welcome_email", "newsletter_issue"]),
  subject: z.string().max(200).nullable().optional(),
  body: z.string().min(1).max(10000),
  recipient: z.string().max(320).nullable().optional(),
});

export const createInfraCostSchema = z.object({
  category: z.string().trim().min(1),
  description: z.string().trim().min(1),
  amountCents: z.number().int().nonnegative(),
  currency: z.string().trim().min(1).optional(),
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().nullable().optional(),
});

export type CreateNotification = z.infer<typeof createNotificationSchema>;
export type CreateInfraCost = z.infer<typeof createInfraCostSchema>;
export type CreateBusinessKpi = z.infer<typeof createBusinessKpiSchema>;
