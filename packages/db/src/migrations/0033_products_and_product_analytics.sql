-- Create the products table with IF NOT EXISTS to handle case where it already exists
CREATE TABLE IF NOT EXISTS "products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "status" text DEFAULT 'active' NOT NULL,
  "product_type" text DEFAULT 'newsletter' NOT NULL,
  "primary_channel" text DEFAULT 'email' NOT NULL,
  "product_url" text,
  "landing_path" text,
  "health_path" text,
  "owner_agent_id" uuid,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
  -- FK constraints handled separately to handle potential name conflicts
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_company_idx" ON "products" USING btree ("company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "products_company_slug_idx" ON "products" USING btree ("company_id", "slug");
--> statement-breakpoint

-- Use DO blocks to conditionally add columns and constraints
DO $$
BEGIN
  -- Add product_id column to newsletter_subscribers if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'newsletter_subscribers' AND column_name = 'product_id') THEN
    ALTER TABLE "newsletter_subscribers" ADD COLUMN "product_id" uuid;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  -- Add FK constraint to newsletter_subscribers only if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'newsletter_subscribers_product_id_products_id_fk' AND table_schema = 'public') THEN
    ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_product_id_products_id_fk" 
    FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  -- Add product_id column to user_metrics_snapshots if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_metrics_snapshots' AND column_name = 'product_id') THEN
    ALTER TABLE "user_metrics_snapshots" ADD COLUMN "product_id" uuid;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  -- Add FK constraint to user_metrics_snapshots only if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_metrics_snapshots_product_id_products_id_fk' AND table_schema = 'public') THEN
    ALTER TABLE "user_metrics_snapshots" ADD CONSTRAINT "user_metrics_snapshots_product_id_products_id_fk" 
    FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  -- Add product_id column to product_health_checks if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_health_checks' AND column_name = 'product_id') THEN
    ALTER TABLE "product_health_checks" ADD COLUMN "product_id" uuid;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  -- Add FK constraint to product_health_checks only if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'product_health_checks_product_id_products_id_fk' AND table_schema = 'public') THEN
    ALTER TABLE "product_health_checks" ADD CONSTRAINT "product_health_checks_product_id_products_id_fk" 
    FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint

-- Replace the old index and ensure new one is there regardless of previous state
DROP INDEX IF EXISTS "user_metrics_snapshots_company_date_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_metrics_snapshots_company_date_product_idx" ON "user_metrics_snapshots" USING btree ("company_id", "product_id", "snapshot_date");
