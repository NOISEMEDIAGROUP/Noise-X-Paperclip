// @ts-nocheck
import { pgTable, uuid, integer, timestamp, date, jsonb, numeric, index, uniqueIndex } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
const businessKpis = pgTable(
  "business_kpis",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    kpiDate: date("kpi_date").notNull(),
    mrrCents: integer("mrr_cents").notNull().default(0),
    totalRevenueCents: integer("total_revenue_cents").notNull().default(0),
    totalCostsCents: integer("total_costs_cents").notNull().default(0),
    netProfitCents: integer("net_profit_cents").notNull().default(0),
    marginPercent: numeric("margin_percent", { precision: 7, scale: 2 }).notNull().default("0"),
    ltvCents: integer("ltv_cents"),
    cacCents: integer("cac_cents"),
    ltvCacRatio: numeric("ltv_cac_ratio", { precision: 7, scale: 2 }),
    monthlyChurnRate: numeric("monthly_churn_rate", { precision: 7, scale: 4 }),
    burnRateCents: integer("burn_rate_cents").notNull().default(0),
    metadata: jsonb("metadata").$type().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    companyKpiUniqueIdx: uniqueIndex("business_kpis_company_date_idx").on(table.companyId, table.kpiDate),
    companyKpiIdx: index("business_kpis_company_kpi_idx").on(table.companyId, table.kpiDate)
  })
);
export {
  businessKpis
};
