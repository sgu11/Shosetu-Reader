import {
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { contentLanguageEnum, translationStatusEnum } from "./enums";
import { episodes } from "./episodes";
import { users } from "./users";
import { novels } from "./novels";

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
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    estimatedCostUsd: real("estimated_cost_usd"),
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

export const translationSettings = pgTable("translation_settings", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  modelName: text("model_name").notNull().default("google/gemini-2.5-flash-lite"),
  globalPrompt: text("global_prompt").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const novelTranslationPrompts = pgTable(
  "novel_translation_prompts",
  {
    id: uuid().primaryKey().defaultRandom(),
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("novel_translation_prompts_user_novel_idx").on(
      table.novelId,
      table.userId,
    ),
  ],
);
