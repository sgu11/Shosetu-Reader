import { Fragment } from "react";
import Link from "next/link";

interface Props {
  episodeId: string;
  sourceParagraphs: string[];
  primary: {
    modelName: string | null;
    translatedText: string | null;
  };
  compare: {
    modelName: string;
    translatedText: string | null;
  };
}

function shortModel(name: string | null): string {
  if (!name) return "—";
  return name.split("/").pop() ?? name;
}

export function ComparePane({ episodeId, sourceParagraphs, primary, compare }: Props) {
  const primaryLines = primary.translatedText?.split("\n") ?? [];
  const compareLines = compare.translatedText?.split("\n") ?? [];
  const rowCount = Math.max(sourceParagraphs.length, primaryLines.length, compareLines.length);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted">
          Comparing translations — aligned by source paragraph index.
        </div>
        <Link
          href={`/reader/${episodeId}`}
          className="text-xs text-accent hover:underline"
        >
          Exit compare
        </Link>
      </header>

      <div className="surface-card rounded-xl p-5">
        <div className="grid grid-cols-2 gap-x-4 text-sm leading-7">
          <h3 className="mb-3 text-xs font-medium uppercase text-muted">
            {shortModel(primary.modelName)}
          </h3>
          <h3 className="mb-3 text-xs font-medium uppercase text-muted">
            {shortModel(compare.modelName)}
          </h3>
          {Array.from({ length: rowCount }).map((_, i) => {
            const p = primaryLines[i] ?? "";
            const c = compareLines[i] ?? "";
            const src = sourceParagraphs[i] ?? "";
            const isBlank = p.trim() === "" && c.trim() === "" && src.trim() === "";
            const cls = isBlank ? "h-4" : "whitespace-pre-wrap pb-2";
            const titleAttr = src.length > 0 ? src : undefined;
            return (
              <Fragment key={i}>
                <p data-paragraph-index={i} className={cls} title={titleAttr}>
                  {p}
                </p>
                <p data-paragraph-index={i} className={cls} title={titleAttr}>
                  {c}
                </p>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
