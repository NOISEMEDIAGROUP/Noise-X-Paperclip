export const PLUGIN_ID = "paperclip.stripe-billing";
export const PLUGIN_VERSION = "0.1.0";
export const BILLING_NAMESPACE = "stripe-billing";

export const SLOT_IDS = {
  billingPage: "billing-page",
  billingWidget: "billing-widget",
  companyBillingTab: "company-billing-tab",
} as const;

export const EXPORT_NAMES = {
  billingPage: "BillingPage",
  billingWidget: "BillingWidget",
  companyBillingTab: "CompanyBillingTab",
} as const;

export const PAGE_ROUTE = "billing";

export const JOB_KEYS = {
  reconcile: "reconcile-billing",
} as const;

export const WEBHOOK_KEYS = {
  stripe: "stripe",
} as const;

export const ENTITY_TYPES = {
  billingAccount: "billing-account",
  stripeInvoice: "stripe-invoice",
  failedMeterEvent: "failed-meter-event",
} as const;

export const STATE_KEYS = {
  billingAccountId: "billing-account-id",
  stripeCustomerId: "stripe-customer-id",
  lastSyncedEventTimestamp: "last-synced-event-timestamp",
} as const;

export const STRIPE_API_BASE = "https://api.stripe.com";

export const MAX_RETRY_ATTEMPTS = 5;
