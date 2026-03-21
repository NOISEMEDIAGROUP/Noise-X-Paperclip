export type BillingAccountStatus = "active" | "past_due" | "suspended" | "cancelled";
export type InvoiceStatus = "draft" | "open" | "paid" | "uncollectible" | "void";
export type FailedMeterEventStatus = "pending" | "exhausted";

export type PluginConfig = {
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  defaultMarkupPercent: number;
  autoSuspendOnPaymentFailure: boolean;
  reconciliationSchedule: string;
};

export type BillingAccountData = {
  name: string;
  email: string;
  stripeSubscriptionId: string;
  status: BillingAccountStatus;
  markupPercent: number;
  modelMarkupOverrides: Record<string, number>;
  companyIds: string[];
};

export type InvoiceLineItem = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  amountCents: number;
};

export type InvoiceData = {
  billingAccountExternalId: string;
  amountCents: number;
  status: InvoiceStatus;
  paidAt: string | null;
  periodStart: string;
  periodEnd: string;
  lineItems: InvoiceLineItem[];
};

export type MeterEventPayload = {
  event_name: string;
  timestamp: string;
  payload: {
    stripe_customer_id: string;
    value: string;
    model: string;
    token_type: "input" | "output";
  };
  identifier: string;
};

export type FailedMeterEventData = {
  costEventId: string;
  payload: MeterEventPayload;
  failedAt: string;
  attempts: number;
  lastError: string;
};
