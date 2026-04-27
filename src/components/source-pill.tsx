import type { SourceSite } from "@/modules/source/domain/source-adapter";

const LABELS: Record<SourceSite, { short: string; full: string; color: string }> = {
  syosetu: { short: "なろう", full: "Syosetu", color: "border-emerald-700/40 text-emerald-700 dark:text-emerald-400" },
  nocturne: { short: "ノクタ", full: "Nocturne", color: "border-rose-700/40 text-rose-700 dark:text-rose-400" },
  kakuyomu: { short: "カクヨム", full: "Kakuyomu", color: "border-sky-700/40 text-sky-700 dark:text-sky-400" },
  alphapolis: { short: "α", full: "AlphaPolis", color: "border-amber-700/40 text-amber-700 dark:text-amber-400" },
};

interface Props {
  site: SourceSite;
  variant?: "short" | "full";
  className?: string;
}

export function SourcePill({ site, variant = "short", className }: Props) {
  const label = LABELS[site];
  if (!label) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-1.5 py-0.5 font-mono text-[10px] tracking-wider ${label.color} ${className ?? ""}`}
      title={label.full}
    >
      {variant === "full" ? label.full : label.short}
    </span>
  );
}
