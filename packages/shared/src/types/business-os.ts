export type IntegrationConnectionStatus = "connected" | "partial" | "not_configured";
export type NotificationType = "daily_brief" | "alert" | "weekly_pnl" | "critical" | "test" | "welcome_email" | "newsletter_issue";

export interface BusinessConfig {
  id?: string;
  companyId: string;
  productName: string | null;
  productUrl: string | null;
  healthcheckUrl: string | null;
  defaultCurrency: string;
  telegramChatId: string | null;
  notificationEmail: string | null;
  telegramEnabled: boolean;
  emailEnabled: boolean;
  dailyBriefTelegram: boolean;
  alertTelegram: boolean;
  dailyBriefEmail: boolean;
  alertEmail: boolean;
  stripeSecretKeyName: string;
  stripeWebhookSecretName: string;
  resendApiKeySecretName: string;
  resendFromEmail: string | null;
  telegramBotTokenSecretName: string;
  githubRepoOwner: string | null;
  githubRepoName: string | null;
  githubTokenSecretName: string;
  githubActionsWorkflowName: string | null;
  xAdapterBaseUrl: string | null;
  xAdapterApiKeySecretName: string;
  sentryDsnSecretName: string;
  uptimeKumaUrl: string | null;
  uptimeKumaApiKeySecretName: string;
  plausibleSiteId: string | null;
  plausibleApiKeySecretName: string;
  slackBotTokenSecretName: string;
  slackSigningSecretName: string;
  slackEnabled: boolean;
  slackDefaultChannelId: string | null;
}

export interface NotificationLogEntry { id: string; channel: string; recipient: string; notificationType: NotificationType; status: string; subject: string | null; body: string; error: string | null; sentAt: string | null; createdAt: string; updatedAt: string; }
export interface RevenueSummary { companyId: string; mrrCents: number; totalRevenueCents: number; recentEvents: Array<Record<string, unknown>>; }
export interface UserMetricsSummary { companyId: string; currentSnapshot: Record<string, any> | null; trend: Array<Record<string, any>>; funnel: Record<string, any>; }
export interface PnlSummary { activeInfraCosts: Array<Record<string, any>>; [key: string]: any; }
export interface ProductHealthSummary { companyId: string; currentStatus: string; uptimePercent7d: number; incidents: Array<Record<string, any>>; checks24h: Array<Record<string, any>>; }
export interface CreateBusinessKpiInput { kpiDate?: string; mrrCents: number; totalRevenueCents: number; totalCostsCents: number; netProfitCents: number; marginPercent: number; ltvCents?: number | null; cacCents?: number | null; ltvCacRatio?: number | null; monthlyChurnRate?: number | null; burnRateCents: number; metadata?: Record<string, unknown>; }
export interface StripeIntegrationStatus { secretKeyPresent: boolean; webhookSecretPresent: boolean; webhookUrl: string; status: IntegrationConnectionStatus; }
export interface TelegramIntegrationStatus { enabled: boolean; botTokenPresent: boolean; chatIdConfigured: boolean; status: IntegrationConnectionStatus; }
export interface ResendIntegrationStatus { enabled: boolean; apiKeyPresent: boolean; fromEmailConfigured: boolean; status: IntegrationConnectionStatus; }
export interface GitHubIntegrationStatus { tokenPresent: boolean; repoConfigured: boolean; repositoryUrl: string | null; status: IntegrationConnectionStatus; }
export interface GitHubActionsIntegrationStatus { enabled: boolean; repositoryUrl: string | null; workflowName: string | null; status: IntegrationConnectionStatus; latestRun: Record<string, any> | null; error: string | null; }
export interface UrlSecretIntegrationStatus { urlConfigured: boolean; apiKeyPresent: boolean; status: IntegrationConnectionStatus; }
export interface SecretBackedIntegrationStatus { secretPresent: boolean; configured: boolean; status: IntegrationConnectionStatus; }
export interface SlackIntegrationStatus { enabled: boolean; botTokenPresent: boolean; signingSecretPresent: boolean; defaultChannelConfigured: boolean; status: IntegrationConnectionStatus; }
export interface IntegrationStatusSummary { stripe: StripeIntegrationStatus; resend: ResendIntegrationStatus; telegram: TelegramIntegrationStatus; slack: SlackIntegrationStatus; github: GitHubIntegrationStatus; githubActions: GitHubActionsIntegrationStatus; xAdapter: UrlSecretIntegrationStatus; sentry: SecretBackedIntegrationStatus; uptimeKuma: UrlSecretIntegrationStatus; plausible: SecretBackedIntegrationStatus; }
export interface CreateUserMetricsSnapshot { snapshotDate?: string; totalUsers: number; paidUsers: number; freeUsers: number; newSignups: number; churned: number; mrrCents: number; arrCents?: number; arpuCents?: number; metadata?: Record<string, unknown>; }
export interface CreateProductHealthCheck { endpointUrl: string; status: "healthy" | "degraded" | "down"; httpStatus?: number | null; responseMs?: number | null; error?: string | null; sslExpiresAt?: string | null; checkedAt?: string; }
