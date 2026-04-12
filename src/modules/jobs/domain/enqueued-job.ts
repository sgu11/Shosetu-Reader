import type { JobKind } from "./job-kind";

export interface EnqueuedJob<TPayload = unknown> {
  id: string;
  kind: JobKind;
  payload: TPayload;
  runner: "inline" | "redis";
  acceptedAt: string;
  entityType: string | null;
  entityId: string | null;
}
