import type { PluginEntitiesClient, PluginLogger, PluginStateClient } from "@paperclipai/plugin-sdk";
import { ENTITY_TYPES, BILLING_NAMESPACE, STATE_KEYS } from "../constants.js";
import type { StripeService } from "../services/stripe.js";
import type { AccountsService } from "../services/accounts.js";
import { formatMeterEvents } from "../services/meter.js";
import type { FailedMeterEventData, MeterEventPayload } from "../types.js";

type CostEventPayload = {
  id: string;
  companyId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  occurredAt: Date;
};

export function createCostEventHandler(
  stripe: StripeService,
  accounts: AccountsService,
  entities: PluginEntitiesClient,
  state: PluginStateClient,
  logger: PluginLogger,
) {
  return async function handleCostEvent(cost: CostEventPayload): Promise<void> {
    const account = await accounts.findByCompanyId(cost.companyId);
    if (!account) {
      logger.info(`No billing account for company ${cost.companyId}, skipping`);
      return;
    }

    const meterEvents = formatMeterEvents({
      costEventId: cost.id,
      stripeCustomerId: account.externalId!,
      model: cost.model,
      inputTokens: cost.inputTokens,
      outputTokens: cost.outputTokens,
      occurredAt: cost.occurredAt instanceof Date ? cost.occurredAt.toISOString() : String(cost.occurredAt),
    });

    for (const meterEvent of meterEvents) {
      try {
        await stripe.sendMeterEvent(meterEvent);
      } catch (err) {
        logger.error(`Failed to send meter event ${meterEvent.identifier}: ${err}`);
        await storeFailedEvent(entities, cost.companyId, cost.id, meterEvent, err);
      }
    }

    await state.set(
      {
        scopeKind: "company",
        scopeId: cost.companyId,
        namespace: BILLING_NAMESPACE,
        stateKey: STATE_KEYS.lastSyncedEventTimestamp,
      },
      new Date().toISOString(),
    );
  };

  async function storeFailedEvent(
    entities: PluginEntitiesClient,
    companyId: string,
    costEventId: string,
    payload: MeterEventPayload,
    error: unknown,
  ): Promise<void> {
    const data: FailedMeterEventData = {
      costEventId,
      payload,
      failedAt: new Date().toISOString(),
      attempts: 1,
      lastError: error instanceof Error ? error.message : String(error),
    };
    await entities.upsert({
      entityType: ENTITY_TYPES.failedMeterEvent,
      externalId: payload.identifier,
      scopeKind: "company",
      scopeId: companyId,
      status: "pending",
      title: `Failed: ${payload.identifier}`,
      data,
    });
  }
}
