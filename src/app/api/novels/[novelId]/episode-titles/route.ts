import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { episodes, titleTranslationCache } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { isValidUuid } from "@/lib/validation";

const RATE_LIMIT = { limit: 30, windowSeconds: 60 };

/**
 * POST /api/novels/:novelId/episode-titles
 * body: { episodeId: string, titleKo: string }
 *
 * Manual override for the global title cache. Useful when the
 * upstream title-translation pipeline silently no-ops on a batch
 * (e.g. content-safety refusal on R-18 titles). The cache is global,
 * so overriding here also fixes any other novel that shares the same
 * exact JA title.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ novelId: string }> },
) {
  const limited = await rateLimit(request, RATE_LIMIT, "episode-title-override");
  if (limited) return limited;

  const { novelId } = await params;
  if (!isValidUuid(novelId)) {
    return NextResponse.json({ error: "Invalid novel ID" }, { status: 400 });
  }

  let body: { episodeId?: unknown; titleKo?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { episodeId, titleKo } = body;
  if (typeof episodeId !== "string" || !isValidUuid(episodeId)) {
    return NextResponse.json({ error: "Invalid episodeId" }, { status: 400 });
  }
  if (typeof titleKo !== "string") {
    return NextResponse.json({ error: "titleKo must be a string" }, { status: 400 });
  }
  const trimmed = titleKo.trim();
  if (!trimmed) {
    return NextResponse.json({ error: "titleKo is empty" }, { status: 400 });
  }
  if (trimmed.length > 500) {
    return NextResponse.json({ error: "titleKo exceeds 500 chars" }, { status: 400 });
  }

  const db = getDb();
  const [episode] = await db
    .select({ id: episodes.id, titleJa: episodes.titleJa })
    .from(episodes)
    .where(and(eq(episodes.id, episodeId), eq(episodes.novelId, novelId)))
    .limit(1);

  if (!episode) {
    return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  }
  if (!episode.titleJa) {
    return NextResponse.json({ error: "Episode has no JA title" }, { status: 400 });
  }

  await db
    .insert(titleTranslationCache)
    .values({ titleJa: episode.titleJa, titleKo: trimmed })
    .onConflictDoUpdate({
      target: titleTranslationCache.titleJa,
      set: { titleKo: trimmed },
    });

  return NextResponse.json({ titleJa: episode.titleJa, titleKo: trimmed });
}
