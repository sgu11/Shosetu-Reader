import Link from "next/link";
import { getWarningSummary } from "@/modules/translation/application/quality-warnings-aggregation";

interface Props {
  novelId: string;
}

const CODE_LABELS: Record<string, string> = {
  EMPTY_OUTPUT: "Empty output",
  SUSPICIOUSLY_SHORT: "Short",
  SUSPICIOUSLY_LONG: "Long",
  UNTRANSLATED_SEGMENTS: "Untranslated",
  PARAGRAPH_COUNT_MISMATCH: "Paragraph mismatch",
  POSSIBLE_TRUNCATION: "Truncation",
  GLOSSARY_MISMATCH: "Glossary",
  CHUNK_DUPLICATE_LINES: "Chunk dup",
};

export async function NovelQualitySummary({ novelId }: Props) {
  const summary = await getWarningSummary({ novelId });
  if (summary.total === 0) return null;

  return (
    <section className="surface-card space-y-4 rounded-xl p-6">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Translation quality</h2>
        <Link
          href={`/novels/${novelId}/quality`}
          className="text-sm text-accent hover:text-accent-hover"
        >
          Details &rarr;
        </Link>
      </header>

      <div className="flex flex-wrap gap-2 text-xs">
        {summary.bySeverity.error > 0 && (
          <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200 px-2.5 py-1">
            {summary.bySeverity.error} errors
          </span>
        )}
        {summary.bySeverity.warning > 0 && (
          <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 px-2.5 py-1">
            {summary.bySeverity.warning} warnings
          </span>
        )}
        {summary.bySeverity.info > 0 && (
          <span className="inline-flex items-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200 px-2.5 py-1">
            {summary.bySeverity.info} info
          </span>
        )}
      </div>

      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted md:grid-cols-3">
        {summary.byCode.slice(0, 6).map((row) => (
          <li key={row.code} className="flex items-center justify-between gap-2">
            <span>{CODE_LABELS[row.code] ?? row.code}</span>
            <span className="font-mono text-xs">{row.count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
