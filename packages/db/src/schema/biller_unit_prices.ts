import { pgTable, uuid, text, numeric, timestamp, index, unique } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const billerUnitPrices = pgTable(
  "biller_unit_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    /** Provider billing entity, e.g. "warp" */
    biller: text("biller").notNull(),
    /** Matches AdapterBillingType values that use raw units, e.g. "credits" */
    billingType: text("billing_type").notNull(),
    /** Human label for the unit, e.g. "credits" */
    unitType: text("unit_type").notNull(),
    /** USD per single unit, e.g. 0.004 for Warp TURBO plan */
    unitPriceUsd: numeric("unit_price_usd", { precision: 12, scale: 8 }).notNull(),
    /** Optional plan label for human reference */
    planName: text("plan_name"),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    /** NULL = still active */
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyBillerBillingTypeFromIdx: index(
      "biller_unit_prices_company_biller_billing_type_from_idx",
    ).on(table.companyId, table.biller, table.billingType, table.effectiveFrom),
    companyBillerFromUnique: unique("biller_unit_prices_company_biller_billing_type_from_uniq").on(
      table.companyId,
      table.biller,
      table.billingType,
      table.effectiveFrom,
    ),
  }),
);
