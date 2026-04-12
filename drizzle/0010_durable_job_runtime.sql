ALTER TABLE "job_runs"
ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

--> statement-breakpoint
UPDATE "job_runs"
SET "updated_at" = COALESCE("completed_at", "started_at", "created_at")
WHERE "updated_at" IS NULL;
