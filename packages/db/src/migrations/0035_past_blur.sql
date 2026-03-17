CREATE TABLE "issue_review_bundles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"requested_reviewer_user_id" text,
	"submitted_by_agent_id" uuid,
	"submitted_by_user_id" text,
	"decided_by_user_id" text,
	"summary" text DEFAULT '' NOT NULL,
	"deliverable" text DEFAULT '' NOT NULL,
	"testing_notes" text,
	"risk_notes" text,
	"follow_up_notes" text,
	"evidence" jsonb,
	"linked_run_id" uuid,
	"decision_note" text,
	"submitted_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "review_bundle_mode" text DEFAULT 'inherit' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "review_bundle_policy" jsonb;--> statement-breakpoint
ALTER TABLE "issue_review_bundles" ADD CONSTRAINT "issue_review_bundles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_review_bundles" ADD CONSTRAINT "issue_review_bundles_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_review_bundles" ADD CONSTRAINT "issue_review_bundles_submitted_by_agent_id_agents_id_fk" FOREIGN KEY ("submitted_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_review_bundles" ADD CONSTRAINT "issue_review_bundles_linked_run_id_heartbeat_runs_id_fk" FOREIGN KEY ("linked_run_id") REFERENCES "public"."heartbeat_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issue_review_bundles_company_status_idx" ON "issue_review_bundles" USING btree ("company_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "issue_review_bundles_issue_idx" ON "issue_review_bundles" USING btree ("issue_id");