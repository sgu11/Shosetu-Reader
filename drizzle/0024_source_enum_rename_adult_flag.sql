-- Phase 1a: prepare multi-source schema (in-transaction).
--
-- 1) Add new sites to the source_site enum. New values are declared here but
--    must NOT be used in the same transaction (PG restriction).
-- 2) Rename novels.source_ncode -> novels.source_id and rename its unique
--    constraint accordingly. RENAME COLUMN does not auto-rename constraints.
-- 3) Add adult_content_enabled to reader_preferences (default true per
--    user decision A).
ALTER TYPE "source_site" ADD VALUE IF NOT EXISTS 'nocturne';--> statement-breakpoint
ALTER TYPE "source_site" ADD VALUE IF NOT EXISTS 'kakuyomu';--> statement-breakpoint
ALTER TYPE "source_site" ADD VALUE IF NOT EXISTS 'alphapolis';--> statement-breakpoint
ALTER TABLE "novels" RENAME COLUMN "source_ncode" TO "source_id";--> statement-breakpoint
ALTER TABLE "novels" RENAME CONSTRAINT "novels_source_ncode_unique" TO "novels_source_id_unique";--> statement-breakpoint
ALTER TABLE "reader_preferences" ADD COLUMN "adult_content_enabled" boolean NOT NULL DEFAULT true;
