// @ts-nocheck
import { pgTable, uuid, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { products } from "./products.js";
const productHealthChecks = pgTable(
  "product_health_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    productId: uuid("product_id").references(() => products.id),
    endpointUrl: text("endpoint_url").notNull(),
    status: text("status").notNull(),
    httpStatus: integer("http_status"),
    responseMs: integer("response_ms"),
    error: text("error"),
    sslExpiresAt: timestamp("ssl_expires_at", { withTimezone: true }),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    companyCheckedIdx: index("product_health_checks_company_checked_idx").on(table.companyId, table.productId, table.checkedAt),
    companyStatusCheckedIdx: index("product_health_checks_company_status_checked_idx").on(
      table.companyId,
      table.productId,
      table.status,
      table.checkedAt
    )
  })
);
export {
  productHealthChecks
};
