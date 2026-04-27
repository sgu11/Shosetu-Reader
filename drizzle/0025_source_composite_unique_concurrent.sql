-- migrate:no-transaction
--
-- Phase 1b: swap unique constraint to (source_site, source_id) without a
-- write-blocking lock. CREATE INDEX CONCURRENTLY cannot run in a transaction,
-- so this whole file runs outside one (see migrate.mjs no-transaction handling).
--
-- The old single-column constraint stays live until the new constraint takes
-- over, eliminating the dupe-insertion window between DROP and ADD.
CREATE UNIQUE INDEX CONCURRENTLY "novels_site_id_unique_idx" ON "novels" ("source_site", "source_id");--> statement-breakpoint
ALTER TABLE "novels" ADD CONSTRAINT "novels_site_id_unique" UNIQUE USING INDEX "novels_site_id_unique_idx";--> statement-breakpoint
ALTER TABLE "novels" DROP CONSTRAINT "novels_source_id_unique";
