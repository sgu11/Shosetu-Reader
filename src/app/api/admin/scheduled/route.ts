import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { getJobQueue } from "@/modules/jobs/application/job-queue";
import type { MetadataRefreshPayload } from "@/modules/jobs/application/job-handlers";
import type { JobKind } from "@/modules/jobs/domain/job-kind";

const ALLOWED_TASKS: Record<string, { kind: JobKind; payload: () => unknown }> = {
  "metadata-refresh": {
    kind: "catalog.metadata-refresh",
    payload: (): MetadataRefreshPayload => ({ triggeredBy: "schedule" }),
  },
};

/**
 * POST /api/admin/scheduled?task=metadata-refresh
 *
 * Trigger a scheduled job. Designed to be called by an external cron
 * (e.g. system crontab, Docker healthcheck, or a simple curl timer).
 */
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const task = req.nextUrl.searchParams.get("task");
  if (!task || !ALLOWED_TASKS[task]) {
    return NextResponse.json(
      { error: `Unknown task. Available: ${Object.keys(ALLOWED_TASKS).join(", ")}` },
      { status: 400 },
    );
  }

  const { kind, payload } = ALLOWED_TASKS[task];
  const queue = getJobQueue();
  const job = await queue.enqueue(kind, payload());

  return NextResponse.json({ jobId: job.id, kind, status: "queued" });
}

/**
 * GET /api/admin/scheduled
 *
 * List available scheduled tasks.
 */
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  return NextResponse.json({
    tasks: Object.entries(ALLOWED_TASKS).map(([name, { kind }]) => ({
      name,
      kind,
    })),
  });
}
