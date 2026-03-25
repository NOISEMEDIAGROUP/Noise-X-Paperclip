ALTER TABLE "business_configs" 
  ADD COLUMN IF NOT EXISTS "resend_api_key_secret_name" text DEFAULT 'business-resend-api-key' NOT NULL,
  ADD COLUMN IF NOT EXISTS "resend_from_email" text,
  ADD COLUMN IF NOT EXISTS "github_repo_owner" text,
  ADD COLUMN IF NOT EXISTS "github_repo_name" text,
  ADD COLUMN IF NOT EXISTS "github_token_secret_name" text DEFAULT 'business-github-token' NOT NULL,
  ADD COLUMN IF NOT EXISTS "github_actions_workflow_name" text,
  ADD COLUMN IF NOT EXISTS "x_adapter_base_url" text,
  ADD COLUMN IF NOT EXISTS "x_adapter_api_key_secret_name" text DEFAULT 'business-x-adapter-api-key' NOT NULL,
  ADD COLUMN IF NOT EXISTS "sentry_dsn_secret_name" text DEFAULT 'business-sentry-dsn' NOT NULL,
  ADD COLUMN IF NOT EXISTS "uptime_kuma_url" text,
  ADD COLUMN IF NOT EXISTS "uptime_kuma_api_key_secret_name" text DEFAULT 'business-uptime-kuma-api-key' NOT NULL,
  ADD COLUMN IF NOT EXISTS "plausible_site_id" text,
  ADD COLUMN IF NOT EXISTS "plausible_api_key_secret_name" text DEFAULT 'business-plausible-api-key' NOT NULL;
