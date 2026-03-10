ALTER TABLE "cost_events" ADD COLUMN "adapter_type" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "cost_events" ADD COLUMN "billing_type" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
UPDATE "cost_events" AS "ce"
SET "adapter_type" = "a"."adapter_type"
FROM "agents" AS "a"
WHERE "ce"."agent_id" = "a"."id";
