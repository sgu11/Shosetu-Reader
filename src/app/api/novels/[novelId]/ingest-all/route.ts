import { NextRequest, NextResponse } from "next/server";
import { getNovelById } from "@/modules/catalog/application/get-novel";
import {
  discoverEpisodes,
  fetchPendingEpisodes,
} from "@/modules/catalog/application/ingest-episodes";
import { getJobQueue } from "@/modules/jobs/application/job-queue";
import { rateLimit } from "@/lib/rate-limit";
import { isValidUuid } from "@/lib/validation";

// 1 ingest-all request per minute per IP
const RATE_LIMIT = { limit: 1, windowSeconds: 60 };

/**
 * POST /api/novels/:novelId/ingest-all
 *
 * Discovers episodes then fetches ALL pending episodes in the background.
 * Returns immediately with 202 after starting the background job.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ novelId: string }> },
) {
  const limited = rateLimit(request, RATE_LIMIT, "ingest-all");
  if (limited) return limited;

  const { novelId } = await params;
  if (!isValidUuid(novelId)) {
    return NextResponse.json({ error: "Invalid novel ID" }, { status: 400 });
  }

  const novel = await getNovelById(novelId);
  if (!novel) {
    return NextResponse.json({ error: "Novel not found" }, { status: 404 });
  }

  // Discover first (synchronous — fast, just TOC scrape)
  const discovered = await discoverEpisodes(novelId);
  const jobQueue = getJobQueue();

  const job = await jobQueue.enqueue(
    "catalog.ingest-all",
    { novelId, limit: 9999, discovered },
    async (context) => {
      await context.updateProgress({
        stage: "fetching",
        discovered,
        processed: 0,
        total: 0,
        fetched: 0,
        failed: 0,
      });

      const result = await fetchPendingEpisodes(
        novelId,
        9999,
        async (progress) => {
          await context.updateProgress({
            stage: "fetching",
            discovered,
            ...progress,
          });
        },
      );

      return {
        stage: "completed",
        discovered,
        ...result,
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
      discovered,
      jobId: job.id,
      runner: job.runner,
      message: "Fetching all pending episodes in background",
    },
    { status: 202 },
  );
}
