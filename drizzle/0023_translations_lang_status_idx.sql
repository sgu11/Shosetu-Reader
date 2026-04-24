CREATE INDEX IF NOT EXISTS "translations_language_status_episode_idx"
  ON "translations" ("target_language", "status", "episode_id");
