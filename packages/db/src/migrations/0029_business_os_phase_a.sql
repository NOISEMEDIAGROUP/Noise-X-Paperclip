CREATE TABLE IF NOT EXISTS "business_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "name" text DEFAULT '' NOT NULL,
  "email" text,
  "bio" text,
  "logo_url" text,
  "favicon_url" text,
  "primary_color" text,
  "accent_color" text,
  "background_color" text,
  "font_family" text,
  "show_branding" boolean DEFAULT true NOT NULL,
  "show_footer" boolean DEFAULT true NOT NULL,
  "show_navbar" boolean DEFAULT true NOT NULL,
  "show_sidebar" boolean DEFAULT true NOT NULL,
  "enable_newsletter_signup" boolean DEFAULT false NOT NULL,
  "enable_ai_insights" boolean DEFAULT true NOT NULL,
  "enable_social_sharing" boolean DEFAULT false NOT NULL,
  "enable_referrals" boolean DEFAULT false NOT NULL,
  "show_company_info" boolean DEFAULT false NOT NULL,
  "show_team_members" boolean DEFAULT false NOT NULL,
  "show_testimonials" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "business_configs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "business_configs_company_idx" ON "business_configs" USING btree ("company_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "business_kpis" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "kpi_date" date NOT NULL,
  "mrr_cents" integer DEFAULT 0 NOT NULL,
  "total_revenue_cents" integer DEFAULT 0 NOT NULL,
  "total_costs_cents" integer DEFAULT 0 NOT NULL,
  "net_profit_cents" integer DEFAULT 0 NOT NULL,
  "margin_percent" numeric(7, 2) DEFAULT '0' NOT NULL,
  "ltv_cents" integer,
  "cac_cents" integer,
  "ltv_cac_ratio" numeric(7, 2),
  "monthly_churn_rate" numeric(7, 4),
  "burn_rate_cents" integer DEFAULT 0 NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "business_kpis_company_id_companies_id_fk"
    FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "business_kpis_company_date_idx" ON "business_kpis" USING btree ("company_id", "kpi_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "business_kpis_company_kpi_idx" ON "business_kpis" USING btree ("company_id", "kpi_date");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "infra_costs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "category" text NOT NULL,
  "description" text NOT NULL,
  "amount_cents" integer NOT NULL,
  "currency" text DEFAULT 'usd' NOT NULL,
  "effective_from" date NOT NULL,
  "effective_to" date,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "infra_costs_company_id_companies_id_fk"
    FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "infra_costs_company_effective_idx" ON "infra_costs" USING btree ("company_id", "effective_from");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "channel" text NOT NULL,
  "recipient" text NOT NULL,
  "notification_type" text NOT NULL,
  "subject" text,
  "body" text NOT NULL,
  "status" text DEFAULT 'queued' NOT NULL,
  "error" text,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "notification_log_company_id_companies_id_fk"
    FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_log_company_created_idx" ON "notification_log" USING btree ("company_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_log_company_type_created_idx" ON "notification_log" USING btree ("company_id", "notification_type", "created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_health_checks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "endpoint_url" text NOT NULL,
  "status" text NOT NULL,
  "http_status" integer,
  "response_ms" integer,
  "error" text,
  "ssl_expires_at" timestamp with time zone,
  "checked_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "product_health_checks_company_id_companies_id_fk"
    FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_health_checks_company_checked_idx" ON "product_health_checks" USING btree ("company_id", "checked_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_health_checks_company_status_checked_idx" ON "product_health_checks" USING btree ("company_id", "status", "checked_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "revenue_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "source" text NOT NULL,
  "event_type" text NOT NULL,
  "stripe_event_id" text,
  "amount_cents" integer NOT NULL,
  "currency" text DEFAULT 'usd' NOT NULL,
  "customer_id" text,
  "customer_email" text,
  "subscription_id" text,
  "product_id" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "occurred_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "revenue_events_company_id_companies_id_fk"
    FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "revenue_events_company_occurred_idx" ON "revenue_events" USING btree ("company_id", "occurred_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "revenue_events_company_type_occurred_idx" ON "revenue_events" USING btree ("company_id", "event_type", "occurred_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "revenue_events_stripe_event_idx" ON "revenue_events" USING btree ("stripe_event_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_metrics_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "snapshot_date" date NOT NULL,
  "total_users" integer DEFAULT 0 NOT NULL,
  "paid_users" integer DEFAULT 0 NOT NULL,
  "free_users" integer DEFAULT 0 NOT NULL,
  "new_signups" integer DEFAULT 0 NOT NULL,
  "churned" integer DEFAULT 0 NOT NULL,
  "mrr_cents" integer DEFAULT 0 NOT NULL,
  "arr_cents" integer DEFAULT 0 NOT NULL,
  "arpu_cents" integer DEFAULT 0 NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_metrics_snapshots_company_id_companies_id_fk"
    FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_metrics_snapshots_company_date_idx" ON "user_metrics_snapshots" USING btree ("company_id", "snapshot_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_metrics_snapshots_company_snapshot_idx" ON "user_metrics_snapshots" USING btree ("company_id", "snapshot_date");
