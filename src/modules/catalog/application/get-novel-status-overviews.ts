import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { episodes, translations } from "@/lib/db/schema";
import type { NovelStatusOverview } from "../api/status-overview-schema";

export function createEmptyNovelStatusOverview(): NovelStatusOverview {
  return {
    fetchedEpisodes: 0,
    translatedEpisodes: 0,
    activeTranslations: 0,
    totalCostUsd: null,
    translatedByModel: [],
  };
}

export async function getNovelStatusOverviews(
  novelIds: string[],
): Promise<Record<string, NovelStatusOverview>> {
  const uniqueNovelIds = [...new Set(novelIds)];

  if (uniqueNovelIds.length === 0) {
    return {};
  }

  const db = getDb();
  const statusMap: Record<string, NovelStatusOverview> = Object.fromEntries(
    uniqueNovelIds.map((novelId) => [novelId, createEmptyNovelStatusOverview()]),
  );

  const [fetchRows, translatedRows, activeRows, modelRows, costRows] = await Promise.all([
    db
      .select({
        novelId: episodes.novelId,
        fetchedEpisodes: sql<number>`count(*) filter (where ${episodes.fetchStatus} = 'fetched')`,
      })
      .from(episodes)
      .where(inArray(episodes.novelId, uniqueNovelIds))
      .groupBy(episodes.novelId),
    db
      .select({
        novelId: episodes.novelId,
        translatedEpisodes: sql<number>`count(distinct ${translations.episodeId})`,
      })
      .from(translations)
      .innerJoin(episodes, eq(translations.episodeId, episodes.id))
      .where(
        and(
          inArray(episodes.novelId, uniqueNovelIds),
          eq(translations.targetLanguage, "ko"),
          eq(translations.status, "available"),
        ),
      )
      .groupBy(episodes.novelId),
    db
      .select({
        novelId: episodes.novelId,
        activeCount: sql<number>`count(*)`,
      })
      .from(translations)
      .innerJoin(episodes, eq(translations.episodeId, episodes.id))
      .where(
        and(
          inArray(episodes.novelId, uniqueNovelIds),
          eq(translations.targetLanguage, "ko"),
          sql`${translations.status} IN ('queued', 'processing')`,
        ),
      )
      .groupBy(episodes.novelId),
    db
      .select({
        novelId: episodes.novelId,
        modelName: translations.modelName,
        translatedEpisodes: sql<number>`count(distinct ${translations.episodeId})`,
        totalCostUsd: sql<number>`sum(${translations.estimatedCostUsd})`,
      })
      .from(translations)
      .innerJoin(episodes, eq(translations.episodeId, episodes.id))
      .where(
        and(
          inArray(episodes.novelId, uniqueNovelIds),
          eq(translations.targetLanguage, "ko"),
          eq(translations.status, "available"),
        ),
      )
      .groupBy(episodes.novelId, translations.modelName),
    db
      .select({
        novelId: episodes.novelId,
        totalCostUsd: sql<number>`sum(${translations.estimatedCostUsd})`,
      })
      .from(translations)
      .innerJoin(episodes, eq(translations.episodeId, episodes.id))
      .where(
        and(
          inArray(episodes.novelId, uniqueNovelIds),
          eq(translations.targetLanguage, "ko"),
          eq(translations.status, "available"),
        ),
      )
      .groupBy(episodes.novelId),
  ]);

  for (const row of fetchRows) {
    statusMap[row.novelId] = {
      ...statusMap[row.novelId],
      fetchedEpisodes: Number(row.fetchedEpisodes ?? 0),
    };
  }

  for (const row of translatedRows) {
    statusMap[row.novelId] = {
      ...statusMap[row.novelId],
      translatedEpisodes: Number(row.translatedEpisodes ?? 0),
    };
  }

  for (const row of activeRows) {
    statusMap[row.novelId] = {
      ...statusMap[row.novelId],
      activeTranslations: Number(row.activeCount ?? 0),
    };
  }

  for (const row of costRows) {
    statusMap[row.novelId] = {
      ...statusMap[row.novelId],
      totalCostUsd: row.totalCostUsd != null ? Number(row.totalCostUsd) : null,
    };
  }

  for (const row of modelRows) {
    statusMap[row.novelId] = {
      ...statusMap[row.novelId],
      translatedByModel: [
        ...statusMap[row.novelId].translatedByModel,
        {
          modelName: row.modelName,
          translatedEpisodes: Number(row.translatedEpisodes ?? 0),
          totalCostUsd: row.totalCostUsd != null ? Number(row.totalCostUsd) : null,
        },
      ],
    };
  }

  for (const novelId of Object.keys(statusMap)) {
    statusMap[novelId].translatedByModel.sort((left, right) => {
      if (right.translatedEpisodes !== left.translatedEpisodes) {
        return right.translatedEpisodes - left.translatedEpisodes;
      }

      return left.modelName.localeCompare(right.modelName);
    });
  }

  return statusMap;
}
