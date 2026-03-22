// @ts-nocheck
import { pgTable, uuid, text, timestamp, integer, date, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
const infraCosts = pgTable(
  "infra_costs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    category: text("category").notNull(),
    description: text("description").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("usd"),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    companyEffectiveIdx: index("infra_costs_company_effective_idx").on(table.companyId, table.effectiveFrom)
  })
);
export {
  infraCosts
};
