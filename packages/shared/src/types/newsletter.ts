export type NewsletterSubscriberStatus = "pending" | "paid" | "unsubscribed";

export interface NewsletterSubscriber {
  id: string;
  companyId: string;
  email: string;
  fullName: string | null;
  status: NewsletterSubscriberStatus;
  source: string;
  tags: string[];
  metadata: Record<string, unknown>;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  lastCheckoutMode: string | null;
  lastCheckoutAt: Date | null;
  paidAt: Date | null;
  unsubscribedAt: Date | null;
  totalRevenueCents: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewsletterLandingInfo {
  companyId: string;
  companyName: string;
  companyPrefix: string;
  productName: string;
  tagline: string;
  description: string;
  priceLabel: string;
  checkoutMode: "stripe" | "demo";
  healthUrl: string;
}

export interface NewsletterCheckoutResult {
  mode: "stripe" | "demo";
  checkoutUrl: string;
  subscriberId: string;
}

export interface NewsletterSummary {
  companyId: string;
  productName: string;
  landingPath: string;
  healthPath: string;
  subscribers: {
    total: number;
    pending: number;
    paid: number;
    unsubscribed: number;
  };
  mrrCents: number;
  recentSubscribers: NewsletterSubscriber[];
}
