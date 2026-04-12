export const jobKinds = [
  "catalog.ingest-all",
  "translation.bulk-translate-all",
] as const;

export type JobKind = (typeof jobKinds)[number];
