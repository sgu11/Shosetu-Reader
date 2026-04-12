import { NextResponse } from "next/server";
import { isValidUuid } from "@/lib/validation";
import { getJobRun } from "@/modules/jobs/application/job-runs";

interface Ctx {
  params: Promise<{ jobId: string }>;
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { jobId } = await ctx.params;
    if (!isValidUuid(jobId)) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    const job = await getJobRun(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: job.id,
      jobType: job.jobType,
      entityType: job.entityType,
      entityId: job.entityId,
      status: job.status,
      attemptCount: job.attemptCount,
      payload: job.payloadJson,
      result: job.resultJson,
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
      createdAt: job.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Failed to fetch job:", err);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}
