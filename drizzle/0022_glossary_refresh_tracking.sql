-- V5.2: glossary.refresh job kind records when a novel's glossary was
-- last sampled against recent translations.
ALTER TABLE "novels"
    ADD COLUMN "glossary_last_refreshed_at" timestamp with time zone;
