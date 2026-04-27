import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sourceSiteEnum } from "./enums";

export const novels = pgTable(
  "novels",
  {
    id: uuid().primaryKey().defaultRandom(),
    sourceSite: sourceSiteEnum("source_site").notNull().default("syosetu"),
    sourceId: text("source_id").notNull(),
    sourceUrl: text("source_url").notNull(),
    titleJa: text("title_ja").notNull(),
    titleNormalized: text("title_normalized"),
    titleKo: text("title_ko"),
    authorName: text("author_name"),
    authorId: text("author_id"),
    summaryJa: text("summary_ja"),
    summaryKo: text("summary_ko"),
    isCompleted: boolean("is_completed"),
    statusRaw: text("status_raw"),
    totalEpisodes: integer("total_episodes"),
    rankingSnapshotJson: jsonb("ranking_snapshot_json"),
    sourceMetadataJson: jsonb("source_metadata_json"),
    lastSourceSyncAt: timestamp("last_source_sync_at", { withTimezone: true }),
    glossaryLastRefreshedAt: timestamp("glossary_last_refreshed_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("novels_site_id_unique").on(table.sourceSite, table.sourceId),
  ],
);
