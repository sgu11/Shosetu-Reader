import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { episodes } from "@/lib/db/schema";
import { getJobQueue } from "@/modules/jobs/application/job-queue";
import { requestTranslation } from "@/modules/translation/application/request-translation";
import { rateLimit } from "@/lib/rate-limit";
import { isValidUuid } from "@/lib/validation";

// 1 bulk-translate-all request per minute per IP
const RATE_LIMIT = { limit: 1, windowSeconds: 60 };

/**
 * POST /api/novels/:novelId/bulk-translate-all
 *
 * Discovers all fetched episodes without a Korean translation
 * and fires off translation requests in the background.
 * Returns immediately with 202.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ novelId: string }> },
) {
  const limited = rateLimit(request, RATE_LIMIT, "bulk-translate-all");
  if (limited) return limited;

  const { novelId } = await params;
  if (!isValidUuid(novelId)) {
    return NextResponse.json({ error: "Invalid novel ID" }, { status: 400 });
  }

  const db = getDb();

  // Count all fetched episodes without available/queued/processing Korean translation
  const untranslated = await db
    .select({ id: episodes.id, episodeNumber: episodes.episodeNumber })
    .from(episodes)
    .where(
      and(
        eq(episodes.novelId, novelId),
        eq(episodes.fetchStatus, "fetched"),
        sql`NOT EXISTS (
          SELECT 1 FROM translations t
          WHERE t.episode_id = ${episodes.id}
            AND t.target_language = 'ko'
            AND t.status IN ('available', 'queued', 'processing')
        )`,
      ),
    )
    .orderBy(episodes.episodeNumber);

  if (untranslated.length === 0) {
    return NextResponse.json({ queued: 0, message: "No untranslated episodes found" });
  }

  const total = untranslated.length;
  const jobQueue = getJobQueue();

  const job = await jobQueue.enqueue(
    "translation.bulk-translate-all",
    {
      novelId,
      episodeIds: untranslated.map((episode) => episode.id),
    },
    async (context) => {
      let queued = 0;
      let failed = 0;

      await context.updateProgress({
        stage: "queueing",
        processed: 0,
        total,
        queued,
        failed,
      });

      for (const [index, episode] of untranslated.entries()) {
        try {
          await requestTranslation(episode.id);
          queued++;
        } catch {
          failed++;
        }

        await context.updateProgress({
          stage: "queueing",
          processed: index + 1,
          total,
          queued,
          failed,
          currentEpisodeId: episode.id,
        });
      }

      return {
        stage: "completed",
        processed: total,
        total,
        queued,
        failed,
      };
    },
    {
      entityType: "novel",
      entityId: novelId,
    },
  );

  return NextResponse.json(
    {
      novelId,
      total,
      jobId: job.id,
      runner: job.runner,
      message: "Translating all untranslated episodes in background",
    },
    { status: 202 },
  );
}
