import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { jobRuns } from "@/lib/db/schema";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

    let query = db.select().from(jobRuns).$dynamic();

    if (status) {
      query = query.where(
        eq(jobRuns.status, status as "queued" | "running" | "completed" | "failed"),
      );
    }

    const rows = await query
      .orderBy(desc(jobRuns.createdAt))
      .limit(limit);

    return NextResponse.json({
      jobs: rows.map((row) => ({
        id: row.id,
        jobType: row.jobType,
        entityType: row.entityType,
        entityId: row.entityId,
        status: row.status,
        attemptCount: row.attemptCount,
        result: row.resultJson,
        startedAt: row.startedAt?.toISOString() ?? null,
        completedAt: row.completedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      count: rows.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch jobs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
