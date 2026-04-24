import { NextRequest, NextResponse } from "next/server";
import { getNovelById } from "@/modules/catalog/application/get-novel";
import { getJobQueue } from "@/modules/jobs/application/job-queue";
import type { GlossaryRefreshPayload } from "@/modules/translation/application/refresh-glossary";
import { getActiveJobByKindAndEntity } from "@/modules/jobs/application/job-runs";
import { rateLimit } from "@/lib/rate-limit";
import { isValidUuid } from "@/lib/validation";

const RATE_LIMIT = { limit: 1, windowSeconds: 60 };
const MAX_SAMPLE_SIZE = 20;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ novelId: string }> },
) {
  const limited = await rateLimit(request, RATE_LIMIT, "glossary-refresh");
  if (limited) return limited;

  const { novelId } = await params;
  if (!isValidUuid(novelId)) {
    return NextResponse.json({ error: "Invalid novel ID" }, { status: 400 });
  }

  const novel = await getNovelById(novelId);
  if (!novel) {
    return NextResponse.json({ error: "Novel not found" }, { status: 404 });
  }

  for (const kind of ["glossary.refresh", "glossary.generate", "glossary.extract"] as const) {
    const existing = await getActiveJobByKindAndEntity({
      jobType: kind,
      entityType: "novel",
      entityId: novelId,
    });
    if (existing) {
      return NextResponse.json(
        { error: `Another glossary job is already running (${kind})`, jobId: existing.id },
        { status: 409 },
      );
    }
  }

  let body: { sampleSize?: number; sinceEpisodeNumber?: number } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // body optional
  }

  const sampleSize = Math.min(
    Math.max(
      typeof body.sampleSize === "number" ? Math.floor(body.sampleSize) : 10,
      1,
    ),
    MAX_SAMPLE_SIZE,
  );

  const payload: GlossaryRefreshPayload = {
    novelId,
    sampleSize,
    sinceEpisodeNumber:
      typeof body.sinceEpisodeNumber === "number"
        ? Math.floor(body.sinceEpisodeNumber)
        : undefined,
  };

  const job = await getJobQueue().enqueue("glossary.refresh", payload, {
    entityType: "novel",
    entityId: novelId,
  });

  return NextResponse.json(
    { novelId, jobId: job.id, runner: job.runner, sampleSize },
    { status: 202 },
  );
}
