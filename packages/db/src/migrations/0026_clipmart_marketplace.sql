CREATE TABLE "marketplace_creators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"slug" text NOT NULL,
	"bio" text,
	"avatar_url" text,
	"website" text,
	"verified" boolean DEFAULT false NOT NULL,
	"stripe_account_id" text,
	"total_installs" integer DEFAULT 0 NOT NULL,
	"total_revenue_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"tagline" text,
	"description" text,
	"readme_markdown" text,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"agent_count" integer,
	"preview_images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"compatible_adapters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"required_models" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"paperclip_version_min" text,
	"install_count" integer DEFAULT 0 NOT NULL,
	"star_count" integer DEFAULT 0 NOT NULL,
	"rating_avg" integer,
	"review_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"version" text NOT NULL,
	"changelog" text,
	"artifact_url" text NOT NULL,
	"artifact_sha256" text,
	"artifact_byte_size" integer,
	"agent_count" integer,
	"compatible_adapters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"required_models" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"manifest" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"version_id" uuid,
	"buyer_user_id" text NOT NULL,
	"buyer_company_id" uuid,
	"price_paid_cents" integer DEFAULT 0 NOT NULL,
	"payment_intent_id" text,
	"status" text DEFAULT 'completed' NOT NULL,
	"installed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"author_user_id" text NOT NULL,
	"author_display_name" text NOT NULL,
	"rating" integer NOT NULL,
	"title" text,
	"body" text,
	"verified_purchase" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_stars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketplace_creators" ADD CONSTRAINT "marketplace_creators_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_creator_id_marketplace_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."marketplace_creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_versions" ADD CONSTRAINT "marketplace_versions_listing_id_marketplace_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."marketplace_listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_purchases" ADD CONSTRAINT "marketplace_purchases_listing_id_marketplace_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."marketplace_listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_purchases" ADD CONSTRAINT "marketplace_purchases_version_id_marketplace_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."marketplace_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_purchases" ADD CONSTRAINT "marketplace_purchases_buyer_company_id_companies_id_fk" FOREIGN KEY ("buyer_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_reviews" ADD CONSTRAINT "marketplace_reviews_listing_id_marketplace_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."marketplace_listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_stars" ADD CONSTRAINT "marketplace_stars_listing_id_marketplace_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."marketplace_listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_creators_slug_idx" ON "marketplace_creators" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_creators_user_id_idx" ON "marketplace_creators" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_listings_slug_idx" ON "marketplace_listings" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "marketplace_listings_creator_idx" ON "marketplace_listings" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "marketplace_listings_type_status_idx" ON "marketplace_listings" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX "marketplace_listings_status_install_idx" ON "marketplace_listings" USING btree ("status","install_count");--> statement-breakpoint
CREATE INDEX "marketplace_versions_listing_idx" ON "marketplace_versions" USING btree ("listing_id","version");--> statement-breakpoint
CREATE INDEX "marketplace_purchases_buyer_idx" ON "marketplace_purchases" USING btree ("buyer_user_id");--> statement-breakpoint
CREATE INDEX "marketplace_purchases_listing_idx" ON "marketplace_purchases" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "marketplace_reviews_listing_idx" ON "marketplace_reviews" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "marketplace_reviews_author_idx" ON "marketplace_reviews" USING btree ("author_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_stars_user_listing_idx" ON "marketplace_stars" USING btree ("user_id","listing_id");
