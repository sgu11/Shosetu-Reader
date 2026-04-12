import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { contentLanguageEnum, translationStatusEnum } from "./enums";
import { episodes } from "./episodes";

export const translations = pgTable(
  "translations",
  {
    id: uuid().primaryKey().defaultRandom(),
    episodeId: uuid("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    targetLanguage: contentLanguageEnum("target_language").notNull(),
    provider: text("provider").notNull(),
    modelName: text("model_name").notNull(),
    promptVersion: text("prompt_version").notNull(),
    sourceChecksum: text("source_checksum").notNull(),
    status: translationStatusEnum().notNull().default("queued"),
    translatedText: text("translated_text"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("translations_identity_idx").on(
      table.episodeId,
      table.targetLanguage,
      table.provider,
      table.modelName,
      table.promptVersion,
      table.sourceChecksum,
    ),
  ],
);
