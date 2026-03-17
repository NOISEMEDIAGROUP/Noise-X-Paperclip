CREATE TABLE "project_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"integration_type" text NOT NULL,
	"name" text NOT NULL,
	"config" jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"customer_name" text,
	"customer_contact" text,
	"business_model" text,
	"production_url" text,
	"staging_url" text,
	"host_port" integer,
	"vps_directory" text,
	"db_schema" text,
	"tech_stack" jsonb,
	"module_stats" jsonb,
	"ios_companion" jsonb,
	"features" jsonb,
	"phase" text DEFAULT 'development' NOT NULL,
	"launched_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_profiles_project_idx" UNIQUE("project_id"),
	CONSTRAINT "project_profiles_slug_idx" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "project_scrapers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"port" integer,
	"vps_directory" text,
	"status" text DEFAULT 'active' NOT NULL,
	"health_check_url" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_integrations" ADD CONSTRAINT "project_integrations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_integrations" ADD CONSTRAINT "project_integrations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_profiles" ADD CONSTRAINT "project_profiles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_profiles" ADD CONSTRAINT "project_profiles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_scrapers" ADD CONSTRAINT "project_scrapers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_scrapers" ADD CONSTRAINT "project_scrapers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_integrations_project_idx" ON "project_integrations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_integrations_company_idx" ON "project_integrations" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "project_profiles_company_idx" ON "project_profiles" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "project_scrapers_project_idx" ON "project_scrapers" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_scrapers_company_idx" ON "project_scrapers" USING btree ("company_id");