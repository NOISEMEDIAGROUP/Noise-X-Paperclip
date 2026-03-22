CREATE TABLE "business_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"product_name" text,
	"product_url" text,
	"healthcheck_url" text,
	"default_currency" text DEFAULT 'usd' NOT NULL,
	"telegram_chat_id" text,
	"notification_email" text,
	"telegram_enabled" boolean DEFAULT false NOT NULL,
	"email_enabled" boolean DEFAULT false NOT NULL,
	"daily_brief_telegram" boolean DEFAULT true NOT NULL,
	"alert_telegram" boolean DEFAULT true NOT NULL,
	"daily_brief_email" boolean DEFAULT false NOT NULL,
	"alert_email" boolean DEFAULT false NOT NULL,
	"stripe_secret_key_name" text DEFAULT 'business-stripe-secret-key' NOT NULL,
	"stripe_webhook_secret_name" text DEFAULT 'business-stripe-webhook-secret' NOT NULL,
	"resend_api_key_secret_name" text DEFAULT 'business-resend-api-key' NOT NULL,
	"resend_from_email" text,
	"telegram_bot_token_secret_name" text DEFAULT 'business-telegram-bot-token' NOT NULL,
	"github_repo_owner" text,
	"github_repo_name" text,
	"github_token_secret_name" text DEFAULT 'business-github-token' NOT NULL,
	"github_actions_workflow_name" text,
	"linkedin_page_id" text,
	"linkedin_access_token_secret_name" text DEFAULT 'business-linkedin-access-token' NOT NULL,
	"x_adapter_base_url" text,
	"x_adapter_api_key_secret_name" text DEFAULT 'business-x-adapter-api-key' NOT NULL,
	"crypto_provider" text,
	"crypto_wallet_address" text,
	"crypto_network" text,
	"crypto_webhook_secret_name" text DEFAULT 'business-crypto-webhook-secret' NOT NULL,
	"sentry_dsn_secret_name" text DEFAULT 'business-sentry-dsn' NOT NULL,
	"uptime_kuma_url" text,
	"uptime_kuma_api_key_secret_name" text DEFAULT 'business-uptime-kuma-api-key' NOT NULL,
	"plausible_site_id" text,
	"plausible_api_key_secret_name" text DEFAULT 'business-plausible-api-key' NOT NULL,
	"slack_bot_token_secret_name" text DEFAULT 'business-slack-bot-token' NOT NULL,
	"slack_signing_secret_name" text DEFAULT 'business-slack-signing-secret' NOT NULL,
	"slack_enabled" boolean DEFAULT false NOT NULL,
	"slack_default_channel_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_kpis" (
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_objectives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"objective_type" text DEFAULT 'quarterly' NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"target_metric" text,
	"target_value" numeric,
	"current_value" numeric DEFAULT '0',
	"proposed_by" uuid,
	"approved_by" text,
	"deadline" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "key_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"objective_id" uuid NOT NULL,
	"title" text NOT NULL,
	"target_value" numeric NOT NULL,
	"current_value" numeric DEFAULT '0',
	"assigned_to" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"agent_id" uuid,
	"agent_role" text,
	"task_id" uuid,
	"task_title" text,
	"integration_id" text NOT NULL,
	"integration_name" text NOT NULL,
	"message" text NOT NULL,
	"is_critical" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"category" text NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"is_open_source" boolean DEFAULT false NOT NULL,
	"free_tier_limit" text,
	"paid_price" text,
	"paid_url" text,
	"setup_time_minutes" integer DEFAULT 5 NOT NULL,
	"setup_difficulty" text DEFAULT 'easy' NOT NULL,
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"used_by_agents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"config_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"agent_id" uuid,
	"agent_role" text,
	"integration_id" text NOT NULL,
	"integration_name" text NOT NULL,
	"reason" text NOT NULL,
	"use_case" text,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_free" boolean DEFAULT true NOT NULL,
	"is_open_source" boolean DEFAULT false NOT NULL,
	"pricing_notes" text,
	"task_id" uuid,
	"task_title" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"connected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "infra_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"product_id" uuid,
	"email" text NOT NULL,
	"full_name" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"source" text DEFAULT 'landing_page' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"last_checkout_mode" text,
	"last_checkout_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"total_revenue_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_log" (
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_health_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"product_id" uuid,
	"endpoint_url" text NOT NULL,
	"status" text NOT NULL,
	"http_status" integer,
	"response_ms" integer,
	"error" text,
	"ssl_expires_at" timestamp with time zone,
	"checked_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
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
);
--> statement-breakpoint
CREATE TABLE "revenue_events" (
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slack_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"channel_id" text NOT NULL,
	"channel_name" text,
	"thread_ts" text,
	"agent_id" uuid,
	"issue_id" uuid,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_metrics_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"product_id" uuid,
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_configs" ADD CONSTRAINT "business_configs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_kpis" ADD CONSTRAINT "business_kpis_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_objectives" ADD CONSTRAINT "company_objectives_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_objectives" ADD CONSTRAINT "company_objectives_proposed_by_agents_id_fk" FOREIGN KEY ("proposed_by") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_objective_id_company_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."company_objectives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_assigned_to_agents_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_blocks" ADD CONSTRAINT "integration_blocks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_blocks" ADD CONSTRAINT "integration_blocks_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_blocks" ADD CONSTRAINT "integration_blocks_task_id_issues_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_recommendations" ADD CONSTRAINT "integration_recommendations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_recommendations" ADD CONSTRAINT "integration_recommendations_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_recommendations" ADD CONSTRAINT "integration_recommendations_task_id_issues_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra_costs" ADD CONSTRAINT "infra_costs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_health_checks" ADD CONSTRAINT "product_health_checks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_health_checks" ADD CONSTRAINT "product_health_checks_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_owner_agent_id_agents_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_events" ADD CONSTRAINT "revenue_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slack_conversations" ADD CONSTRAINT "slack_conversations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_metrics_snapshots" ADD CONSTRAINT "user_metrics_snapshots_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_metrics_snapshots" ADD CONSTRAINT "user_metrics_snapshots_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_configs_company_idx" ON "business_configs" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_kpis_company_date_idx" ON "business_kpis" USING btree ("company_id","kpi_date");--> statement-breakpoint
CREATE INDEX "business_kpis_company_kpi_idx" ON "business_kpis" USING btree ("company_id","kpi_date");--> statement-breakpoint
CREATE INDEX "company_objectives_company_idx" ON "company_objectives" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "key_results_objective_idx" ON "key_results" USING btree ("objective_id");--> statement-breakpoint
CREATE INDEX "integration_blocks_company_status_idx" ON "integration_blocks" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "integration_blocks_agent_idx" ON "integration_blocks" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "integration_blocks_task_idx" ON "integration_blocks" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "integration_catalog_category_idx" ON "integration_catalog" USING btree ("category");--> statement-breakpoint
CREATE INDEX "integration_catalog_is_free_idx" ON "integration_catalog" USING btree ("is_free");--> statement-breakpoint
CREATE INDEX "integration_recommendations_company_status_idx" ON "integration_recommendations" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "integration_recommendations_integration_idx" ON "integration_recommendations" USING btree ("integration_id");--> statement-breakpoint
CREATE INDEX "integration_recommendations_agent_idx" ON "integration_recommendations" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "integration_recommendations_unique_idx" ON "integration_recommendations" USING btree ("company_id","integration_id","agent_id");--> statement-breakpoint
CREATE INDEX "infra_costs_company_effective_idx" ON "infra_costs" USING btree ("company_id","effective_from");--> statement-breakpoint
CREATE INDEX "newsletter_subscribers_company_created_idx" ON "newsletter_subscribers" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "newsletter_subscribers_company_status_idx" ON "newsletter_subscribers" USING btree ("company_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_subscribers_company_email_idx" ON "newsletter_subscribers" USING btree ("company_id","email");--> statement-breakpoint
CREATE INDEX "notification_log_company_created_idx" ON "notification_log" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_log_company_type_created_idx" ON "notification_log" USING btree ("company_id","notification_type","created_at");--> statement-breakpoint
CREATE INDEX "product_health_checks_company_checked_idx" ON "product_health_checks" USING btree ("company_id","product_id","checked_at");--> statement-breakpoint
CREATE INDEX "product_health_checks_company_status_checked_idx" ON "product_health_checks" USING btree ("company_id","product_id","status","checked_at");--> statement-breakpoint
CREATE INDEX "products_company_idx" ON "products" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_company_slug_idx" ON "products" USING btree ("company_id","slug");--> statement-breakpoint
CREATE INDEX "revenue_events_company_occurred_idx" ON "revenue_events" USING btree ("company_id","occurred_at");--> statement-breakpoint
CREATE INDEX "revenue_events_company_type_occurred_idx" ON "revenue_events" USING btree ("company_id","event_type","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_events_stripe_event_idx" ON "revenue_events" USING btree ("stripe_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "slack_conv_company_channel_thread_idx" ON "slack_conversations" USING btree ("company_id","channel_id","thread_ts");--> statement-breakpoint
CREATE UNIQUE INDEX "user_metrics_snapshots_company_date_idx" ON "user_metrics_snapshots" USING btree ("company_id","product_id","snapshot_date");--> statement-breakpoint
CREATE INDEX "user_metrics_snapshots_company_snapshot_idx" ON "user_metrics_snapshots" USING btree ("company_id","product_id","snapshot_date");