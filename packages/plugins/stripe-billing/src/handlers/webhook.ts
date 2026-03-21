import type { PluginAgentsClient, PluginActivityClient, PluginLogger, PluginWebhookInput } from "@paperclipai/plugin-sdk";
import type { StripeService } from "../services/stripe.js";
import type { AccountsService } from "../services/accounts.js";
import type { InvoicesService } from "../services/invoices.js";
import type { BillingAccountData, PluginConfig } from "../types.js";

export function createWebhookHandler(
  stripe: StripeService,
  accounts: AccountsService,
  invoices: InvoicesService,
  agents: PluginAgentsClient,
  activity: PluginActivityClient,
  logger: PluginLogger,
  config: PluginConfig,
) {
  return async function handleWebhook(input: PluginWebhookInput): Promise<void> {
    const signature = (input.headers["stripe-signature"] ?? "") as string;
    if (!stripe.verifyWebhookSignature(input.rawBody, signature, config.stripeWebhookSecret)) {
      throw new Error("Invalid webhook signature");
    }

    const event = input.parsedBody as { type: string; data: { object: any } };
    const eventType = event.type;
    const obj = event.data.object;

    logger.info(`Webhook received: ${eventType}`);

    switch (eventType) {
      case "invoice.payment_failed":
        await handlePaymentFailed(obj.customer);
        break;
      case "invoice.paid":
        await handlePaymentSucceeded(obj.customer);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(obj.customer);
        break;
      case "invoice.finalized":
        await handleInvoiceFinalized(obj);
        break;
      default:
        logger.info(`Unhandled webhook event type: ${eventType}`);
    }
  };

  async function handlePaymentFailed(customerId: string): Promise<void> {
    const account = await accounts.getByCustomerId(customerId);
    if (!account) return;

    await accounts.update(customerId, { status: "past_due" });

    if (config.autoSuspendOnPaymentFailure) {
      await pauseAllAgents((account.data as BillingAccountData).companyIds);
    }

    for (const companyId of (account.data as BillingAccountData).companyIds) {
      await activity.log({
        companyId,
        message: "Agents paused due to payment failure",
      });
    }
  }

  async function handlePaymentSucceeded(customerId: string): Promise<void> {
    const account = await accounts.getByCustomerId(customerId);
    if (!account) return;
    const data = account.data as BillingAccountData;

    if (data.status === "past_due" || data.status === "suspended") {
      await accounts.update(customerId, { status: "active" });
      await resumeAllAgents(data.companyIds);

      for (const companyId of data.companyIds) {
        await activity.log({
          companyId,
          message: "Agents resumed after payment received",
        });
      }
    } else {
      await accounts.update(customerId, { status: "active" });
    }
  }

  async function handleSubscriptionDeleted(customerId: string): Promise<void> {
    const account = await accounts.getByCustomerId(customerId);
    if (!account) return;

    await accounts.update(customerId, { status: "cancelled" });
    await pauseAllAgents((account.data as BillingAccountData).companyIds);

    for (const companyId of (account.data as BillingAccountData).companyIds) {
      await activity.log({
        companyId,
        message: "Agents paused: subscription cancelled",
      });
    }
  }

  async function handleInvoiceFinalized(invoiceObj: any): Promise<void> {
    await invoices.upsert(invoiceObj.id, {
      billingAccountExternalId: invoiceObj.customer,
      amountCents: invoiceObj.amount_due,
      status: invoiceObj.status,
      paidAt: null,
      periodStart: new Date(invoiceObj.period_start * 1000).toISOString(),
      periodEnd: new Date(invoiceObj.period_end * 1000).toISOString(),
      lineItems: [],
    });

    logger.info(`Invoice ${invoiceObj.id} stored`);
  }

  async function pauseAllAgents(companyIds: string[]): Promise<void> {
    for (const companyId of companyIds) {
      const agentList = await agents.list({ companyId });
      for (const agent of agentList) {
        if (agent.status === "active") {
          await agents.pause(agent.id, companyId);
        }
      }
    }
  }

  async function resumeAllAgents(companyIds: string[]): Promise<void> {
    for (const companyId of companyIds) {
      const agentList = await agents.list({ companyId });
      for (const agent of agentList) {
        if (agent.status !== "active") {
          await agents.resume(agent.id, companyId);
        }
      }
    }
  }
}
