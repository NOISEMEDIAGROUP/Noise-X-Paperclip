ALTER TABLE "agents"
  ADD COLUMN "mode" text DEFAULT 'hybrid' NOT NULL,
  ADD COLUMN "classes" jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN "runtime_environment" text DEFAULT 'sandbox' NOT NULL,
  ADD COLUMN "runtime_policy" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "approvals"
  ADD COLUMN "action_id" text,
  ADD COLUMN "risk_score" integer DEFAULT 0 NOT NULL,
  ADD COLUMN "confidence_score" integer DEFAULT 100 NOT NULL,
  ADD COLUMN "blast_radius_score" integer DEFAULT 0 NOT NULL,
  ADD COLUMN "reversibility_score" integer DEFAULT 100 NOT NULL,
  ADD COLUMN "money_impact_cents" integer DEFAULT 0 NOT NULL,
  ADD COLUMN "customer_impact_level" text DEFAULT 'none' NOT NULL,
  ADD COLUMN "evidence" jsonb,
  ADD COLUMN "rollback_plan" text,
  ADD COLUMN "verification_plan" text,
  ADD COLUMN "delay_consequence" text;
