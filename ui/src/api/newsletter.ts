import { api } from "./client";

type NewsletterCheckoutResult = Record<string, any>;
type NewsletterLandingInfo = Record<string, any>;
type NewsletterSubscriber = Record<string, any>;
type NewsletterSummary = Record<string, any>;

export const newsletterApi = {
  summary: (companyId: string) => api.get<NewsletterSummary>(`/companies/${companyId}/newsletter`),
  subscribers: (companyId: string) => api.get<NewsletterSubscriber[]>(`/companies/${companyId}/newsletter/subscribers`),
  landingInfo: (companyPrefix: string) => api.get<NewsletterLandingInfo>(`/public/newsletter/${companyPrefix}`),
  subscribe: (companyPrefix: string, body: { email: string; fullName?: string | null }) => api.post<NewsletterSubscriber>(`/public/newsletter/${companyPrefix}/subscribe`, body),
  checkout: (companyPrefix: string, body: { email: string; fullName?: string | null }) => api.post<NewsletterCheckoutResult>(`/public/newsletter/${companyPrefix}/checkout`, body),
};
