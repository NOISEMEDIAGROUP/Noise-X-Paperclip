-- Migration: Replace base64 logo storage with file-based storage
-- Add new columns for file path and mime type
ALTER TABLE "brand_logos" ADD COLUMN "image_path" varchar(500);
ALTER TABLE "brand_logos" ADD COLUMN "mime_type" varchar(100);

-- Make image_data nullable (was NOT NULL) for new rows that use file storage
ALTER TABLE "brand_logos" ALTER COLUMN "image_data" DROP NOT NULL;
