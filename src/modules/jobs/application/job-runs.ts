import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { jobRuns } from "@/lib/db/schema";
import type { JobKind } from "../domain/job-kind";

export interface JobRunResult {
  [key: string]: unknown;
}

export async function createJobRun(input: {
  jobId: string;
  jobType: JobKind;
  payload: unknown;
  entityType?: string;
  entityId?: string;
}) {
  const db = getDb();

  await db.insert(jobRuns).values({
    id: input.jobId,
    jobType: input.jobType,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    status: "queued",
    attemptCount: 0,
    payloadJson: input.payload,
    resultJson: null,
  });
}

export async function markJobRunning(jobId: string) {
  const db = getDb();

  await db
    .update(jobRuns)
    .set({
      status: "running",
      attemptCount: 1,
      startedAt: new Date(),
    })
    .where(eq(jobRuns.id, jobId));
}

export async function updateJobRunResult(jobId: string, result: JobRunResult) {
  const db = getDb();

  await db
    .update(jobRuns)
    .set({
      resultJson: result,
    })
    .where(eq(jobRuns.id, jobId));
}

export async function markJobCompleted(jobId: string, result: JobRunResult) {
  const db = getDb();

  await db
    .update(jobRuns)
    .set({
      status: "completed",
      resultJson: result,
      completedAt: new Date(),
    })
    .where(eq(jobRuns.id, jobId));
}

export async function markJobFailed(jobId: string, result: JobRunResult) {
  const db = getDb();

  await db
    .update(jobRuns)
    .set({
      status: "failed",
      resultJson: result,
      completedAt: new Date(),
    })
    .where(eq(jobRuns.id, jobId));
}

export async function getJobRun(jobId: string) {
  const db = getDb();

  const [row] = await db
    .select()
    .from(jobRuns)
    .where(eq(jobRuns.id, jobId))
    .limit(1);

  return row ?? null;
}
