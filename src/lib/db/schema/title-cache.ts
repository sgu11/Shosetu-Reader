import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const titleTranslationCache = pgTable("title_translation_cache", {
  titleJa: text("title_ja").primaryKey(),
  titleKo: text("title_ko").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
