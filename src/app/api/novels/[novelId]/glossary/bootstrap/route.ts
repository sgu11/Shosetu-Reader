import { NextRequest, NextResponse } from "next/server";
import { getNovelById } from "@/modules/catalog/application/get-novel";
import { getJobQueue } from "@/modules/jobs/application/job-queue";
import { getActiveJobByKindAndEntity } from "@/modules/jobs/application/job-runs";
import type { GlossaryBootstrapPayload } from "@/modules/jobs/application/job-handlers";
import { rateLimit } from "@/lib/rate-limit";
import { isValidUuid } from "@/lib/validation";

const RATE_LIMIT = { limit: 1, windowSeconds: 60 };
const MAX_SAMPLE_SIZE = 30;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ novelId: string }> },
) {
  const limited = await rateLimit(request, RATE_LIMIT, "glossary-bootstrap");
  if (limited) return limited;

  const { novelId } = await params;
  if (!isValidUuid(novelId)) {
    return NextResponse.json({ error: "Invalid novel ID" }, { status: 400 });
  }

  const novel = await getNovelById(novelId);
  if (!novel) {
    return NextResponse.json({ error: "Novel not found" }, { status: 404 });
  }

  // Block if any glossary job is already running for this novel.
  for (const kind of [
    "glossary.bootstrap",
    "glossary.refresh",
    "glossary.generate",
    "glossary.extract",
  ] as const) {
    const existing = await getActiveJobByKindAndEntity({
      jobType: kind,
      entityType: "novel",
      entityId: novelId,
    });
    if (existing) {
      return NextResponse.json(
        {
          error: `Another glossary job is already running (${kind})`,
          jobId: existing.id,
        },
        { status: 409 },
      );
    }
  }

  let body: { sampleSize?: number; modelName?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // body optional
  }

  const sampleSize = Math.min(
    Math.max(
      typeof body.sampleSize === "number" ? Math.floor(body.sampleSize) : 20,
      3,
    ),
    MAX_SAMPLE_SIZE,
  );

  const payload: GlossaryBootstrapPayload = {
    novelId,
    sampleSize,
    modelName: typeof body.modelName === "string" ? body.modelName : undefined,
  };

  const job = await getJobQueue().enqueue("glossary.bootstrap", payload, {
    entityType: "novel",
    entityId: novelId,
  });

  return NextResponse.json(
    { novelId, jobId: job.id, runner: job.runner, sampleSize },
    { status: 202 },
  );
}
