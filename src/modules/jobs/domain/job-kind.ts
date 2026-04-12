export const jobKinds = [
  "catalog.ingest-all",
  "catalog.metadata-refresh",
  "translation.bulk-translate-all",
  "translation.episode",
] as const;

export type JobKind = (typeof jobKinds)[number];
