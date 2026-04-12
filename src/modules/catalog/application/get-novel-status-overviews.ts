import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { episodes, translations } from "@/lib/db/schema";
import type { NovelStatusOverview } from "../api/status-overview-schema";

export function createEmptyNovelStatusOverview(): NovelStatusOverview {
  return {
    fetchedEpisodes: 0,
    translatedEpisodes: 0,
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

  const [fetchRows, translatedRows, modelRows] = await Promise.all([
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
        modelName: translations.modelName,
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
      .groupBy(episodes.novelId, translations.modelName),
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

  for (const row of modelRows) {
    statusMap[row.novelId] = {
      ...statusMap[row.novelId],
      translatedByModel: [
        ...statusMap[row.novelId].translatedByModel,
        {
          modelName: row.modelName,
          translatedEpisodes: Number(row.translatedEpisodes ?? 0),
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
