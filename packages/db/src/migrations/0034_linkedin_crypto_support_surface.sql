ALTER TABLE "business_configs"
  ADD COLUMN IF NOT EXISTS "linkedin_page_id" text,
  ADD COLUMN IF NOT EXISTS "linkedin_access_token_secret_name" text DEFAULT 'business-linkedin-access-token' NOT NULL,
  ADD COLUMN IF NOT EXISTS "crypto_provider" text,
  ADD COLUMN IF NOT EXISTS "crypto_wallet_address" text,
  ADD COLUMN IF NOT EXISTS "crypto_network" text,
  ADD COLUMN IF NOT EXISTS "crypto_webhook_secret_name" text DEFAULT 'business-crypto-webhook-secret' NOT NULL;
