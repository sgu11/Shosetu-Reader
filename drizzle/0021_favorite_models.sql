-- V5.9: favorite models pinned to the top of every model picker.
ALTER TABLE "translation_settings"
    ADD COLUMN "favorite_models" text[] NOT NULL DEFAULT '{}';
