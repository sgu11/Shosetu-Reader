import { and, desc, eq, gte, isNotNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { episodes } from "@/lib/db/schema/episodes";
import { novels } from "@/lib/db/schema/novels";
import { translations } from "@/lib/db/schema/translations";
import type { QualityWarning } from "./quality-validation";

export type Severity = "info" | "warning" | "error";

export interface WarningSummaryRow {
  code: string;
  severity: Severity;
  count: number;
  lastSeenAt: string | null;
}

export interface WarningSummary {
  total: number;
  bySeverity: { info: number; warning: number; error: number };
  byCode: WarningSummaryRow[];
}

export interface WarningListItem {
  translationId: string;
  episodeId: string;
  episodeNumber: number;
  episodeTitleJa: string;
  novelId: string;
  novelTitleJa: string;
  modelName: string;
  completedAt: string | null;
  warnings: QualityWarning[];
}

export interface ListWarningsOptions {
  novelId?: string;
  code?: string;
  severity?: Severity;
  since?: Date;
  limit: number;
  offset: number;
}

function parseWarnings(raw: unknown): QualityWarning[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (w): w is QualityWarning =>
      w !== null &&
      typeof w === "object" &&
      typeof (w as QualityWarning).code === "string" &&
      typeof (w as QualityWarning).severity === "string",
  );
}

export async function getWarningSummary(opts: {
  novelId?: string;
  since?: Date;
}): Promise<WarningSummary> {
  const db = getDb();

  const filters = [isNotNull(translations.qualityWarnings)];
  if (opts.since) filters.push(gte(translations.completedAt, opts.since));
  if (opts.novelId) filters.push(eq(episodes.novelId, opts.novelId));

  const baseQuery = db
    .select({
      qualityWarnings: translations.qualityWarnings,
      completedAt: translations.completedAt,
    })
    .from(translations)
    .innerJoin(episodes, eq(translations.episodeId, episodes.id))
    .where(and(...filters));

  const rows = await baseQuery;

  const byCodeMap = new Map<
    string,
    { severity: Severity; count: number; lastSeenAt: Date | null }
  >();
  const bySeverity = { info: 0, warning: 0, error: 0 };
  let total = 0;

  for (const row of rows) {
    const warnings = parseWarnings(row.qualityWarnings);
    for (const w of warnings) {
      total += 1;
      bySeverity[w.severity] += 1;
      const existing = byCodeMap.get(w.code);
      if (existing) {
        existing.count += 1;
        if (row.completedAt && (!existing.lastSeenAt || row.completedAt > existing.lastSeenAt)) {
          existing.lastSeenAt = row.completedAt;
        }
      } else {
        byCodeMap.set(w.code, {
          severity: w.severity,
          count: 1,
          lastSeenAt: row.completedAt ?? null,
        });
      }
    }
  }

  const byCode: WarningSummaryRow[] = Array.from(byCodeMap.entries())
    .map(([code, v]) => ({
      code,
      severity: v.severity,
      count: v.count,
      lastSeenAt: v.lastSeenAt?.toISOString() ?? null,
    }))
    .sort((a, b) => b.count - a.count);

  return { total, bySeverity, byCode };
}

export async function listWarnings(
  opts: ListWarningsOptions,
): Promise<{ items: WarningListItem[]; nextOffset: number | null }> {
  const db = getDb();

  const filters = [isNotNull(translations.qualityWarnings)];
  if (opts.since) filters.push(gte(translations.completedAt, opts.since));
  if (opts.novelId) filters.push(eq(episodes.novelId, opts.novelId));

  const rows = await db
    .select({
      translationId: translations.id,
      episodeId: translations.episodeId,
      episodeNumber: episodes.episodeNumber,
      episodeTitleJa: episodes.titleJa,
      novelId: episodes.novelId,
      novelTitleJa: novels.titleJa,
      modelName: translations.modelName,
      completedAt: translations.completedAt,
      qualityWarnings: translations.qualityWarnings,
    })
    .from(translations)
    .innerJoin(episodes, eq(translations.episodeId, episodes.id))
    .innerJoin(novels, eq(episodes.novelId, novels.id))
    .where(and(...filters))
    .orderBy(desc(translations.completedAt))
    .limit(opts.limit + 1)
    .offset(opts.offset);

  const hasMore = rows.length > opts.limit;
  const pageRows = hasMore ? rows.slice(0, opts.limit) : rows;

  const items: WarningListItem[] = [];
  for (const row of pageRows) {
    let warnings = parseWarnings(row.qualityWarnings);
    if (opts.code) warnings = warnings.filter((w) => w.code === opts.code);
    if (opts.severity) warnings = warnings.filter((w) => w.severity === opts.severity);
    if (warnings.length === 0) continue;
    items.push({
      translationId: row.translationId,
      episodeId: row.episodeId,
      episodeNumber: row.episodeNumber,
      episodeTitleJa: row.episodeTitleJa ?? "",
      novelId: row.novelId,
      novelTitleJa: row.novelTitleJa ?? "",
      modelName: row.modelName,
      completedAt: row.completedAt?.toISOString() ?? null,
      warnings,
    });
  }

  return {
    items,
    nextOffset: hasMore ? opts.offset + opts.limit : null,
  };
}

export async function getEpisodeIdsWithErrors(novelId: string): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({
      episodeId: translations.episodeId,
      qualityWarnings: translations.qualityWarnings,
    })
    .from(translations)
    .innerJoin(episodes, eq(translations.episodeId, episodes.id))
    .where(
      and(eq(episodes.novelId, novelId), isNotNull(translations.qualityWarnings)),
    );

  const episodeIds = new Set<string>();
  for (const row of rows) {
    const warnings = parseWarnings(row.qualityWarnings);
    if (warnings.some((w) => w.severity === "error")) {
      episodeIds.add(row.episodeId);
    }
  }
  return [...episodeIds];
}
