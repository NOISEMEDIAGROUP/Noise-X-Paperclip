import { api } from "./client";

type BusinessConfig = Record<string, any>;
type IntegrationStatusSummary = Record<string, any>;
type NotificationLogEntry = Record<string, any>;
type PnlSummary = Record<string, any>;
type ProductHealthSummary = Record<string, any>;
type RevenueSummary = Record<string, any>;
type UserMetricsSummary = Record<string, any>;

export const businessOsApi = {
  portfolio: () => api.get<any>("/portfolio"),
  config: (companyId: string) => api.get<BusinessConfig>(`/companies/${companyId}/business-config`),
  updateConfig: (companyId: string, body: Partial<BusinessConfig>) => api.patch<BusinessConfig>(`/companies/${companyId}/business-config`, body),
  integrationStatus: (companyId: string) => api.get<IntegrationStatusSummary>(`/companies/${companyId}/integration-status`),
  revenue: (companyId: string) => api.get<RevenueSummary>(`/companies/${companyId}/revenue`),
  users: (companyId: string) => api.get<UserMetricsSummary>(`/companies/${companyId}/users`),
  finance: (companyId: string) => api.get<PnlSummary>(`/companies/${companyId}/finance`),
  health: (companyId: string) => api.get<ProductHealthSummary>(`/companies/${companyId}/health`),
  notifications: (companyId: string) => api.get<NotificationLogEntry[]>(`/companies/${companyId}/notifications`),
  sendNotification: (
    companyId: string,
    body: { channel: "telegram" | "email"; type: "daily_brief" | "alert" | "weekly_pnl" | "critical" | "test" | "welcome_email" | "newsletter_issue"; subject?: string | null; body: string; recipient?: string | null },
  ) => api.post<NotificationLogEntry>(`/companies/${companyId}/notify`, body),
};
