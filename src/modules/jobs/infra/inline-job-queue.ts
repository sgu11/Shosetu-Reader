import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";
import type {
  JobEnqueueOptions,
  JobExecutionContext,
  JobQueue,
} from "../application/job-queue";
import {
  createJobRun,
  markJobCompleted,
  markJobFailed,
  markJobRunning,
  updateJobRunResult,
  type JobRunResult,
} from "../application/job-runs";
import type { EnqueuedJob } from "../domain/enqueued-job";
import type { JobKind } from "../domain/job-kind";

export class InlineJobQueue implements JobQueue {
  async enqueue<TPayload>(
    kind: JobKind,
    payload: TPayload,
    handler: (context: JobExecutionContext<TPayload>) => Promise<JobRunResult | void>,
    options?: JobEnqueueOptions,
  ): Promise<EnqueuedJob<TPayload>> {
    const job: EnqueuedJob<TPayload> = {
      id: randomUUID(),
      kind,
      payload,
      runner: "inline",
      acceptedAt: new Date().toISOString(),
      entityType: options?.entityType ?? null,
      entityId: options?.entityId ?? null,
    };

    await createJobRun({
      jobId: job.id,
      jobType: job.kind,
      payload: job.payload,
      entityType: job.entityType ?? undefined,
      entityId: job.entityId ?? undefined,
    });

    logger.info("Inline job accepted", {
      jobId: job.id,
      kind: job.kind,
    });

    setTimeout(() => {
      void this.run(job, handler);
    }, 0);

    return job;
  }

  private async run<TPayload>(
    job: EnqueuedJob<TPayload>,
    handler: (context: JobExecutionContext<TPayload>) => Promise<JobRunResult | void>,
  ) {
    logger.info("Inline job started", {
      jobId: job.id,
      kind: job.kind,
    });

    try {
      await markJobRunning(job.id);

      let latestResult: JobRunResult = {};
      const context: JobExecutionContext<TPayload> = {
        job,
        updateProgress: async (result) => {
          latestResult = {
            ...latestResult,
            ...result,
          };

          await updateJobRunResult(job.id, latestResult);
        },
      };

      const result = await handler(context);
      const finalResult = result
        ? {
            ...latestResult,
            ...result,
          }
        : latestResult;

      await markJobCompleted(job.id, finalResult);

      logger.info("Inline job completed", {
        jobId: job.id,
        kind: job.kind,
      });
    } catch (error) {
      await markJobFailed(job.id, {
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      logger.error("Inline job failed", {
        jobId: job.id,
        kind: job.kind,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
