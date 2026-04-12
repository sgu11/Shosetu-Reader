import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { novels, episodes } from "@/lib/db/schema";
import type { NovelResponse, EpisodeListItem } from "../api/schemas";

export async function getNovelById(
  novelId: string,
): Promise<NovelResponse | null> {
  const db = getDb();

  const [row] = await db
    .select()
    .from(novels)
    .where(eq(novels.id, novelId))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    sourceNcode: row.sourceNcode,
    sourceUrl: row.sourceUrl,
    titleJa: row.titleJa,
    titleNormalized: row.titleNormalized,
    authorName: row.authorName,
    summaryJa: row.summaryJa,
    isCompleted: row.isCompleted,
    totalEpisodes: row.totalEpisodes,
    lastSourceSyncAt: row.lastSourceSyncAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getEpisodesByNovelId(
  novelId: string,
): Promise<{ episodes: EpisodeListItem[]; totalCount: number }> {
  const db = getDb();

  const rows = await db
    .select()
    .from(episodes)
    .where(eq(episodes.novelId, novelId))
    .orderBy(episodes.episodeNumber);

  const items: EpisodeListItem[] = rows.map((row) => ({
    id: row.id,
    episodeNumber: row.episodeNumber,
    titleJa: row.titleJa,
    fetchStatus: row.fetchStatus,
    hasTranslation: false, // will be enriched in Phase 5
    publishedAt: row.publishedAt?.toISOString() ?? null,
  }));

  return { episodes: items, totalCount: items.length };
}
