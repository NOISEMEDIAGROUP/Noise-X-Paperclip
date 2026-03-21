import {
  definePlugin,
  runWorker,
  type PluginContext,
  type PluginEvent,
  type PluginHealthDiagnostics,
  type PluginWebhookInput,
} from "@paperclipai/plugin-sdk";
import { JOB_KEYS, ENTITY_TYPES, BILLING_NAMESPACE, STATE_KEYS, STRIPE_API_BASE } from "./constants.js";
import type { PluginConfig, BillingAccountData } from "./types.js";
import { createStripeService } from "./services/stripe.js";
import { createAccountsService } from "./services/accounts.js";
import { createInvoicesService } from "./services/invoices.js";
import { createCostEventHandler } from "./handlers/cost-event.js";
import { createWebhookHandler } from "./handlers/webhook.js";
import { createReconcileHandler } from "./handlers/reconcile.js";

let webhookHandler: ((input: PluginWebhookInput) => Promise<void>) | null = null;
let healthCtx: PluginContext | null = null;
const inflightRequests = new Set<Promise<unknown>>();

const plugin = definePlugin({
  async setup(ctx: PluginContext): Promise<void> {
    healthCtx = ctx;
    const rawConfig = (await ctx.config.get()) as Partial<PluginConfig>;
    const config: PluginConfig = {
      stripeSecretKey: rawConfig.stripeSecretKey ?? "",
      stripeWebhookSecret: rawConfig.stripeWebhookSecret ?? "",
      defaultMarkupPercent: rawConfig.defaultMarkupPercent ?? 30,
      autoSuspendOnPaymentFailure: rawConfig.autoSuspendOnPaymentFailure ?? true,
      reconciliationSchedule: rawConfig.reconciliationSchedule ?? "0 2 * * *",
    };

    const apiKey = await ctx.secrets.resolve(config.stripeSecretKey);
    const stripe = createStripeService(ctx.http, apiKey);
    const accounts = createAccountsService(ctx.entities, ctx.state);
    const invoices = createInvoicesService(ctx.entities);

    const handleCostEvent = createCostEventHandler(stripe, accounts, ctx.entities, ctx.state, ctx.logger);
    ctx.events.on("cost_event.created", async (event: PluginEvent) => {
      const p = handleCostEvent(event.payload as any);
      inflightRequests.add(p);
      try { await p; } finally { inflightRequests.delete(p); }
    });

    const whSecret = await ctx.secrets.resolve(config.stripeWebhookSecret);
    const resolvedConfig = { ...config, stripeWebhookSecret: whSecret };
    webhookHandler = createWebhookHandler(stripe, accounts, invoices, ctx.agents, ctx.activity, ctx.logger, resolvedConfig);

    const reconcile = createReconcileHandler(stripe, ctx.entities, ctx.logger);
    ctx.jobs.register(JOB_KEYS.reconcile, async () => {
      await reconcile();
    });

    ctx.data.register("billing-overview", async () => {
      const allAccounts = await accounts.listAll();
      return {
        accounts: allAccounts.map((a) => ({
          id: a.id,
          externalId: a.externalId,
          ...(a.data as BillingAccountData),
        })),
      };
    });

    ctx.data.register("company-billing", async (params) => {
      const companyId = params.companyId as string;
      const account = await accounts.findByCompanyId(companyId);
      if (!account) return { linked: false };
      const accountData = account.data as BillingAccountData;
      const accountInvoices = await invoices.listForAccount(account.externalId!);
      return {
        linked: true,
        account: { id: account.id, externalId: account.externalId, ...accountData },
        invoices: accountInvoices.map((inv) => ({ id: inv.id, externalId: inv.externalId, ...inv.data })),
      };
    });

    ctx.actions.register("create-billing-account", async (params) => {
      const { name, email, companyIds, markupPercent } = params as {
        name: string; email: string; companyIds: string[]; markupPercent?: number;
      };
      const customer = await stripe.createCustomer(name, email);
      const account = await accounts.create(customer.id, {
        name,
        email,
        stripeSubscriptionId: "",
        status: "active",
        markupPercent: markupPercent ?? config.defaultMarkupPercent,
        modelMarkupOverrides: {},
        companyIds,
      });
      for (const companyId of companyIds) {
        await accounts.linkCompany(companyId, account.id, customer.id);
      }
      return { accountId: account.id, customerId: customer.id };
    });

    ctx.actions.register("link-company", async (params) => {
      const { companyId, billingAccountId, stripeCustomerId } = params as {
        companyId: string; billingAccountId: string; stripeCustomerId: string;
      };
      await accounts.linkCompany(companyId, billingAccountId, stripeCustomerId);
      return { success: true };
    });

    ctx.actions.register("unlink-company", async (params) => {
      const { companyId } = params as { companyId: string };
      await accounts.unlinkCompany(companyId);
      return { success: true };
    });

    ctx.logger.info("Stripe billing plugin initialized");
  },

  async onWebhook(input: PluginWebhookInput): Promise<void> {
    if (!webhookHandler) throw new Error("Plugin not initialized");
    await webhookHandler(input);
  },

  async onHealth(): Promise<PluginHealthDiagnostics> {
    if (!healthCtx) return { status: "error", message: "Plugin not initialized" };

    try {
      const allFailed = await healthCtx.entities.list({
        entityType: ENTITY_TYPES.failedMeterEvent,
        scopeKind: "company",
        limit: 100,
      });
      const pendingCount = allFailed.filter((e) => e.status === "pending").length;

      if (pendingCount > 0) {
        return { status: "degraded", message: `${pendingCount} pending failed meter events` };
      }
      return { status: "ok", message: "Stripe billing healthy" };
    } catch (err) {
      return { status: "error", message: `Health check failed: ${err}` };
    }
  },

  async onShutdown(): Promise<void> {
    if (inflightRequests.size > 0) {
      await Promise.race([
        Promise.allSettled(inflightRequests),
        new Promise((resolve) => setTimeout(resolve, 10_000)),
      ]);
    }
  },
});

export default plugin;

runWorker(plugin, import.meta.url);
