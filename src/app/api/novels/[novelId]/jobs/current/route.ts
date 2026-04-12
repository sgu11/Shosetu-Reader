import { NextResponse } from "next/server";
import { isValidUuid } from "@/lib/validation";
import { resolveUserId } from "@/modules/identity/application/resolve-user-context";
import { getLatestNovelJobForUser } from "@/modules/jobs/application/job-runs";

interface Ctx {
  params: Promise<{ novelId: string }>;
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { novelId } = await ctx.params;
    if (!isValidUuid(novelId)) {
      return NextResponse.json({ error: "Invalid novel ID" }, { status: 400 });
    }

    const userId = await resolveUserId();
    const job = await getLatestNovelJobForUser({ novelId, userId });

    if (!job) {
      return NextResponse.json({ job: null });
    }

    return NextResponse.json({
      job: {
        id: job.id,
        jobType: job.jobType,
        status: job.status,
      },
    });
  } catch (err) {
    console.error("Failed to fetch current novel job:", err);
    return NextResponse.json({ error: "Failed to fetch current novel job" }, { status: 500 });
  }
}
