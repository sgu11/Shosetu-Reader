import type { EnqueuedJob } from "../domain/enqueued-job";
import type { JobKind } from "../domain/job-kind";
import { InlineJobQueue } from "../infra/inline-job-queue";
import type { JobRunResult } from "./job-runs";

export interface JobExecutionContext<TPayload = unknown> {
  job: EnqueuedJob<TPayload>;
  updateProgress(result: JobRunResult): Promise<void>;
}

export interface JobEnqueueOptions {
  entityType?: string;
  entityId?: string;
}

export interface JobQueue {
  enqueue<TPayload>(
    kind: JobKind,
    payload: TPayload,
    handler: (context: JobExecutionContext<TPayload>) => Promise<JobRunResult | void>,
    options?: JobEnqueueOptions,
  ): Promise<EnqueuedJob<TPayload>>;
}

let activeJobQueue: JobQueue | undefined;

export function getJobQueue(): JobQueue {
  if (!activeJobQueue) {
    activeJobQueue = new InlineJobQueue();
  }

  return activeJobQueue;
}

export function setJobQueue(jobQueue: JobQueue) {
  activeJobQueue = jobQueue;
}
