import Link from "next/link";
import { notFound } from "next/navigation";
import { getNovelById } from "@/modules/catalog/application/get-novel";
import {
  getWarningSummary,
  listWarnings,
} from "@/modules/translation/application/quality-warnings-aggregation";
import { QualityBadge } from "@/components/quality/quality-badge";

interface Props {
  params: Promise<{ novelId: string }>;
  searchParams: Promise<{ code?: string; severity?: string }>;
}

const CODE_LABELS: Record<string, string> = {
  EMPTY_OUTPUT: "Empty output",
  SUSPICIOUSLY_SHORT: "Suspiciously short",
  SUSPICIOUSLY_LONG: "Suspiciously long",
  UNTRANSLATED_SEGMENTS: "Untranslated segments",
  PARAGRAPH_COUNT_MISMATCH: "Paragraph count mismatch",
  POSSIBLE_TRUNCATION: "Possible truncation",
  GLOSSARY_MISMATCH: "Glossary mismatch",
  CHUNK_DUPLICATE_LINES: "Chunk duplicate lines",
};

function isSeverity(s: string | undefined): s is "info" | "warning" | "error" {
  return s === "info" || s === "warning" || s === "error";
}

export default async function NovelQualityPage({ params, searchParams }: Props) {
  const { novelId } = await params;
  const { code, severity } = await searchParams;
  const novel = await getNovelById(novelId);
  if (!novel) notFound();

  const [summary, list] = await Promise.all([
    getWarningSummary({ novelId }),
    listWarnings({
      novelId,
      code,
      severity: isSeverity(severity) ? severity : undefined,
      limit: 100,
      offset: 0,
    }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <Link
        href={`/novels/${novelId}`}
        className="text-sm text-muted hover:text-foreground"
      >
        &larr; {novel.titleJa}
      </Link>

      <header className="space-y-2">
        <h1 className="text-2xl font-normal tracking-tight">Translation quality</h1>
        <p className="text-sm text-muted">
          {summary.total} total warning{summary.total === 1 ? "" : "s"} across completed
          translations.
        </p>
      </header>

      <section className="surface-card grid grid-cols-3 gap-4 rounded-xl p-5">
        <Link
          href={`/novels/${novelId}/quality?severity=error`}
          className="rounded-lg bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200 p-3 text-center hover:opacity-80"
        >
          <div className="text-2xl font-medium">{summary.bySeverity.error}</div>
          <div className="text-xs">errors</div>
        </Link>
        <Link
          href={`/novels/${novelId}/quality?severity=warning`}
          className="rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 p-3 text-center hover:opacity-80"
        >
          <div className="text-2xl font-medium">{summary.bySeverity.warning}</div>
          <div className="text-xs">warnings</div>
        </Link>
        <Link
          href={`/novels/${novelId}/quality?severity=info`}
          className="rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200 p-3 text-center hover:opacity-80"
        >
          <div className="text-2xl font-medium">{summary.bySeverity.info}</div>
          <div className="text-xs">info</div>
        </Link>
      </section>

      <section className="surface-card space-y-3 rounded-xl p-5">
        <h2 className="text-sm font-medium text-muted">By code</h2>
        <ul className="divide-y divide-border text-sm">
          {summary.byCode.map((row) => (
            <li key={row.code} className="flex items-center justify-between gap-3 py-2">
              <Link
                href={`/novels/${novelId}/quality?code=${encodeURIComponent(row.code)}`}
                className="flex items-center gap-3 hover:text-accent"
              >
                <span className="min-w-[8rem] text-xs font-mono uppercase text-muted">
                  {row.severity}
                </span>
                <span>{CODE_LABELS[row.code] ?? row.code}</span>
              </Link>
              <span className="font-mono text-xs text-muted">{row.count}</span>
            </li>
          ))}
        </ul>
      </section>

      {(code || severity) && (
        <Link
          href={`/novels/${novelId}/quality`}
          className="text-xs text-accent hover:underline"
        >
          Clear filter
        </Link>
      )}

      <section className="surface-card space-y-2 rounded-xl p-5">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted">Episodes with warnings</h2>
          <span className="text-xs text-muted">
            {list.items.length}
            {list.nextOffset !== null ? "+" : ""}
          </span>
        </header>
        <ul className="divide-y divide-border">
          {list.items.map((item) => (
            <li key={item.translationId} className="flex items-center justify-between gap-3 py-2">
              <Link
                href={`/reader/${item.episodeId}`}
                className="flex items-center gap-3 hover:text-accent"
              >
                <span className="font-mono text-xs text-muted">#{item.episodeNumber}</span>
                <span className="truncate text-sm">{item.episodeTitleJa}</span>
              </Link>
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-muted sm:inline" title={item.modelName}>
                  {item.modelName.split("/").pop()}
                </span>
                <QualityBadge warnings={item.warnings} />
              </div>
            </li>
          ))}
          {list.items.length === 0 && (
            <li className="py-4 text-sm text-muted">No matching warnings.</li>
          )}
        </ul>
      </section>
    </main>
  );
}
