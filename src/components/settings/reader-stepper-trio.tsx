"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/client";

interface ReaderPrefs {
  fontSize: string;
  lineHeight: string;
  contentWidth: string;
  fontFamily: string;
  fontWeight: string;
}

const DEFAULT: ReaderPrefs = {
  fontSize: "medium",
  lineHeight: "1.8",
  contentWidth: "680",
  fontFamily: "newsreader",
  fontWeight: "normal",
};

const FONT_SIZE_PX: Record<string, number> = {
  small: 14,
  medium: 16,
  large: 18,
  xlarge: 20,
};

const SIZE_ORDER: ReadonlyArray<keyof typeof FONT_SIZE_PX> = [
  "small",
  "medium",
  "large",
  "xlarge",
];

const LINE_HEIGHT_VALUES = ["1.6", "1.8", "2.0", "2.2"];

const WIDTH_VALUES = ["560", "680", "800"];

const COOKIE_NAME = "reader-prefs";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

function readPrefs(): ReaderPrefs {
  if (typeof document === "undefined") return DEFAULT;
  try {
    const m = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE_NAME}=`));
    if (!m) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(decodeURIComponent(m.split("=").slice(1).join("="))) };
  } catch {
    return DEFAULT;
  }
}

function writePrefs(p: ReaderPrefs) {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(p))};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
  document.documentElement.style.setProperty("--reader-font-size", `${FONT_SIZE_PX[p.fontSize] ?? 16}px`);
  document.documentElement.style.setProperty("--reader-line-height", p.lineHeight);
  document.documentElement.style.setProperty("--reader-content-width", `${p.contentWidth}px`);
}

function step<T extends string>(
  values: ReadonlyArray<T>,
  current: T,
  delta: -1 | 1,
): T {
  const idx = values.indexOf(current);
  if (idx < 0) return current;
  const next = idx + delta;
  if (next < 0 || next >= values.length) return current;
  return values[next];
}

export function ReaderStepperTrio() {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<ReaderPrefs>(DEFAULT);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setPrefs(readPrefs());
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function update(patch: Partial<ReaderPrefs>) {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      writePrefs(next);
      return next;
    });
  }

  const sizePx = FONT_SIZE_PX[prefs.fontSize] ?? 16;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 font-mono text-[11px]">
      <Stepper
        label={t("settings.fontSize")}
        value={`${sizePx}px`}
        canDec={prefs.fontSize !== SIZE_ORDER[0]}
        canInc={prefs.fontSize !== SIZE_ORDER[SIZE_ORDER.length - 1]}
        onDec={() =>
          update({
            fontSize: step(SIZE_ORDER, prefs.fontSize as keyof typeof FONT_SIZE_PX, -1),
          })
        }
        onInc={() =>
          update({
            fontSize: step(SIZE_ORDER, prefs.fontSize as keyof typeof FONT_SIZE_PX, 1),
          })
        }
      />
      <Stepper
        label={t("settings.lineHeight")}
        value={prefs.lineHeight}
        canDec={prefs.lineHeight !== LINE_HEIGHT_VALUES[0]}
        canInc={prefs.lineHeight !== LINE_HEIGHT_VALUES[LINE_HEIGHT_VALUES.length - 1]}
        onDec={() => update({ lineHeight: step(LINE_HEIGHT_VALUES, prefs.lineHeight, -1) })}
        onInc={() => update({ lineHeight: step(LINE_HEIGHT_VALUES, prefs.lineHeight, 1) })}
      />
      <Stepper
        label={t("settings.contentWidth")}
        value={`${prefs.contentWidth}px`}
        canDec={prefs.contentWidth !== WIDTH_VALUES[0]}
        canInc={prefs.contentWidth !== WIDTH_VALUES[WIDTH_VALUES.length - 1]}
        onDec={() => update({ contentWidth: step(WIDTH_VALUES, prefs.contentWidth, -1) })}
        onInc={() => update({ contentWidth: step(WIDTH_VALUES, prefs.contentWidth, 1) })}
      />
    </div>
  );
}

function Stepper({
  label,
  value,
  onDec,
  onInc,
  canDec,
  canInc,
}: {
  label: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
  canDec: boolean;
  canInc: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted">{label}</span>
      <div className="inline-flex overflow-hidden rounded-full border border-border-strong">
        <button
          type="button"
          onClick={onDec}
          disabled={!canDec}
          className="border-0 bg-transparent px-3 py-1 text-secondary transition-colors hover:bg-surface-strong disabled:opacity-40"
        >
          −
        </button>
        <span className="border-x border-border-strong bg-surface px-3 py-1 text-foreground">
          {value}
        </span>
        <button
          type="button"
          onClick={onInc}
          disabled={!canInc}
          className="border-0 bg-transparent px-3 py-1 text-secondary transition-colors hover:bg-surface-strong disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}
