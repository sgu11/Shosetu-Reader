import { NextRequest, NextResponse } from "next/server";
import { getNovelById } from "@/modules/catalog/application/get-novel";
import {
  discoverEpisodes,
  fetchPendingEpisodes,
} from "@/modules/catalog/application/ingest-episodes";
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

  // Fetch all pending in background (fire-and-forget)
  fetchPendingEpisodes(novelId, 9999).catch((err) => {
    console.error(`Background ingest-all failed for ${novelId}:`, err);
  });

  return NextResponse.json(
    { novelId, discovered, message: "Fetching all pending episodes in background" },
    { status: 202 },
  );
}
