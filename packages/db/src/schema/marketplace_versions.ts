import { pgTable, uuid, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { marketplaceListings } from "./marketplace_listings.js";

export const marketplaceVersions = pgTable(
  "marketplace_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id").notNull().references(() => marketplaceListings.id),
    version: text("version").notNull(), // semver
    changelog: text("changelog"),
    artifactUrl: text("artifact_url").notNull(), // storage path to bundle zip
    artifactSha256: text("artifact_sha256"),
    artifactByteSize: integer("artifact_byte_size"),
    agentCount: integer("agent_count"),
    compatibleAdapters: jsonb("compatible_adapters").$type<string[]>().notNull().default([]),
    requiredModels: jsonb("required_models").$type<string[]>().notNull().default([]),
    manifest: jsonb("manifest").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    listingVersionIdx: index("marketplace_versions_listing_idx").on(table.listingId, table.version),
  }),
);
