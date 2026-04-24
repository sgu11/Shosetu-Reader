import type { QualityWarning } from "@/modules/translation/application/quality-validation";

interface Props {
  warnings: QualityWarning[] | null | undefined;
  compact?: boolean;
}

function severityOf(warnings: QualityWarning[]): "error" | "warning" | "info" | null {
  if (warnings.some((w) => w.severity === "error")) return "error";
  if (warnings.some((w) => w.severity === "warning")) return "warning";
  if (warnings.some((w) => w.severity === "info")) return "info";
  return null;
}

const STYLES: Record<"error" | "warning" | "info", string> = {
  error:
    "inline-flex items-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200 px-2 py-0.5 text-xs font-medium",
  warning:
    "inline-flex items-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 px-2 py-0.5 text-xs font-medium",
  info:
    "inline-flex items-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200 px-2 py-0.5 text-xs font-medium",
};

const LABELS: Record<"error" | "warning" | "info", string> = {
  error: "error",
  warning: "warn",
  info: "info",
};

export function QualityBadge({ warnings, compact }: Props) {
  if (!warnings || warnings.length === 0) return null;
  const sev = severityOf(warnings);
  if (!sev) return null;
  const title = warnings.map((w) => `[${w.severity}] ${w.code}: ${w.message}`).join("\n");
  return (
    <span className={STYLES[sev]} title={title} aria-label={`${LABELS[sev]}: ${warnings.length} quality issues`}>
      {compact ? warnings.length : `${LABELS[sev]} ${warnings.length}`}
    </span>
  );
}
