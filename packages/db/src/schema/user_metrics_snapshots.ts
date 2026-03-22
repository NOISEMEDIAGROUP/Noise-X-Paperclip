// @ts-nocheck
import { pgTable, uuid, integer, timestamp, date, index, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { products } from "./products.js";
const userMetricsSnapshots = pgTable(
  "user_metrics_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    productId: uuid("product_id").references(() => products.id),
    snapshotDate: date("snapshot_date").notNull(),
    totalUsers: integer("total_users").notNull().default(0),
    paidUsers: integer("paid_users").notNull().default(0),
    freeUsers: integer("free_users").notNull().default(0),
    newSignups: integer("new_signups").notNull().default(0),
    churned: integer("churned").notNull().default(0),
    mrrCents: integer("mrr_cents").notNull().default(0),
    arrCents: integer("arr_cents").notNull().default(0),
    arpuCents: integer("arpu_cents").notNull().default(0),
    metadata: jsonb("metadata").$type().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    companySnapshotUniqueIdx: uniqueIndex("user_metrics_snapshots_company_date_idx").on(
      table.companyId,
      table.productId,
      table.snapshotDate
    ),
    companySnapshotIdx: index("user_metrics_snapshots_company_snapshot_idx").on(table.companyId, table.productId, table.snapshotDate)
  })
);
export {
  userMetricsSnapshots
};
