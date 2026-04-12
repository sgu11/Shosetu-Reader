import { and, desc, eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { episodes, translations } from "@/lib/db/schema";

export interface TranslationProgressEstimate {
  progressPercent: number;
  estimatedRemainingMs: number;
  estimatedTotalMs: number;
  elapsedMs: number;
  confidence: "low" | "medium" | "high";
  sampleCount: number;
}

export async function estimateTranslationProgress(input: {
  modelName: string;
  sourceText: string;
  processingStartedAt: Date | null;
}): Promise<TranslationProgressEstimate | null> {
  if (!input.processingStartedAt) {
    return null;
  }

  const sourceChars = input.sourceText.trim().length;
  if (sourceChars === 0) {
    return null;
  }

  const db = getDb();

  // First try model-specific samples, then fall back to cross-model
  let rows = await fetchSamples(db, input.modelName, 50);
  let crossModel = false;

  if (rows.length < 3) {
    rows = await fetchSamples(db, null, 50);
    crossModel = true;
  }

  if (rows.length === 0) {
    return null;
  }

  // Prefer size-similar episodes (0.5x-2x), fall back to all
  const similarRows = rows.filter((row) => {
    const rowChars = row.sourceChars;
    return rowChars >= sourceChars * 0.5 && rowChars <= sourceChars * 2;
  });

  const sample = similarRows.length >= 3 ? similarRows : rows;

  // Collect ms-per-char rates for median calculation
  const msPerCharRates: number[] = [];

  for (const row of sample) {
    if (row.sourceChars <= 0 || row.durationMs <= 0) continue;
    msPerCharRates.push(row.durationMs / row.sourceChars);
  }

  if (msPerCharRates.length === 0) {
    return null;
  }

  const medianMsPerChar = median(msPerCharRates);
  const estimatedTotalMs = Math.max(1000, Math.round(sourceChars * medianMsPerChar));
  const elapsedMs = Math.max(0, Date.now() - input.processingStartedAt.getTime());
  const estimatedRemainingMs = Math.max(0, estimatedTotalMs - elapsedMs);
  const progressPercent = Math.max(1, Math.min(99, Math.round((elapsedMs / estimatedTotalMs) * 100)));

  return {
    progressPercent,
    estimatedRemainingMs,
    estimatedTotalMs,
    elapsedMs,
    confidence: getConfidence(msPerCharRates.length, crossModel, msPerCharRates),
    sampleCount: msPerCharRates.length,
  };
}

interface SampleRow {
  durationMs: number;
  sourceChars: number;
}

async function fetchSamples(
  db: ReturnType<typeof getDb>,
  modelName: string | null,
  limit: number,
): Promise<SampleRow[]> {
  const conditions = [
    eq(translations.status, "available"),
    isNotNull(translations.durationMs),
  ];
  if (modelName) {
    conditions.push(eq(translations.modelName, modelName));
  }

  const rows = await db
    .select({
      durationMs: translations.durationMs,
      sourceTextJa: episodes.normalizedTextJa,
    })
    .from(translations)
    .innerJoin(episodes, eq(translations.episodeId, episodes.id))
    .where(and(...conditions))
    .orderBy(desc(translations.completedAt))
    .limit(limit);

  return rows
    .filter((r) => r.durationMs != null && r.durationMs > 0)
    .map((r) => ({
      durationMs: r.durationMs!,
      sourceChars: r.sourceTextJa?.trim().length ?? 0,
    }))
    .filter((r) => r.sourceChars > 0);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function getConfidence(
  sampleCount: number,
  crossModel: boolean,
  rates: number[],
): "low" | "medium" | "high" {
  // Cross-model estimates are inherently less reliable
  if (crossModel) {
    return sampleCount >= 10 ? "medium" : "low";
  }

  // Check variance — high spread reduces confidence
  if (sampleCount >= 8) {
    const med = median(rates);
    const deviations = rates.map((r) => Math.abs(r - med) / med);
    const medianDeviation = median(deviations);
    // If median deviation > 50%, downgrade from high
    if (medianDeviation > 0.5) {
      return "medium";
    }
    return sampleCount >= 12 ? "high" : "medium";
  }

  return sampleCount >= 5 ? "medium" : "low";
}
