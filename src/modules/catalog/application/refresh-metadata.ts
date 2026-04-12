import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { novels, subscriptions } from "@/lib/db/schema";
import { fetchNovelMetadata } from "@/modules/source/infra/syosetu-api";
import { translateNovelMetadata } from "./translate-novel-metadata";
import { logger } from "@/lib/logger";

interface RefreshProgress {
  [key: string]: unknown;
  stage: string;
  processed: number;
  total: number;
  updated: number;
  failed: number;
}

/**
 * Refresh metadata from Syosetu for all subscribed novels.
 * Updates episode counts, completion status, and timestamps.
 */
export async function refreshSubscribedNovelMetadata(
  onProgress?: (progress: RefreshProgress) => Promise<void>,
): Promise<{ processed: number; total: number; updated: number; failed: number }> {
  const db = getDb();

  // Get all novels that have at least one active subscription
  const subscribedNovels = await db
    .selectDistinct({
      id: novels.id,
      sourceNcode: novels.sourceNcode,
      totalEpisodes: novels.totalEpisodes,
      isCompleted: novels.isCompleted,
    })
    .from(novels)
    .innerJoin(subscriptions, eq(subscriptions.novelId, novels.id))
    .where(eq(subscriptions.isActive, true));

  const total = subscribedNovels.length;
  let processed = 0;
  let updated = 0;
  let failed = 0;

  for (const novel of subscribedNovels) {
    try {
      const metadata = await fetchNovelMetadata(novel.sourceNcode);

      const hasChanges =
        metadata.totalEpisodes !== novel.totalEpisodes ||
        metadata.isCompleted !== novel.isCompleted;

      if (hasChanges) {
        await db
          .update(novels)
          .set({
            titleJa: metadata.title,
            authorName: metadata.authorName,
            summaryJa: metadata.summary,
            isCompleted: metadata.isCompleted,
            totalEpisodes: metadata.totalEpisodes,
            sourceMetadataJson: metadata.raw,
            lastSourceSyncAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(novels.id, novel.id));

        translateNovelMetadata(novel.id).catch(() => {});
        updated++;
      } else {
        // Just update sync timestamp
        await db
          .update(novels)
          .set({ lastSourceSyncAt: new Date(), updatedAt: new Date() })
          .where(eq(novels.id, novel.id));
      }

      processed++;
    } catch (err) {
      failed++;
      processed++;
      logger.warn("Failed to refresh metadata", {
        novelId: novel.id,
        ncode: novel.sourceNcode,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }

    await onProgress?.({
      stage: "refreshing",
      processed,
      total,
      updated,
      failed,
    });

    // Rate limit: 1 request per second to be respectful to Syosetu
    if (processed < total) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return { processed, total, updated, failed };
}
