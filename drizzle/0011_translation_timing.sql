ALTER TABLE "translations"
ADD COLUMN IF NOT EXISTS "processing_started_at" timestamp with time zone;

--> statement-breakpoint
ALTER TABLE "translations"
ADD COLUMN IF NOT EXISTS "duration_ms" integer;
