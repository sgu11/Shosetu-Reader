"use client";

import { useSyncExternalStore } from "react";
import { useTranslation } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n";

type Theme = "paper" | "sepia" | "night" | "system";

interface ThemeMeta {
  value: Theme;
  label: TranslationKey;
  en: string;
  bg: string;
  ink: string;
}

const THEMES: ThemeMeta[] = [
  {
    value: "system",
    label: "settings.themeSystem",
    en: "System",
    bg: "linear-gradient(135deg, #faf6ef 50%, #14110d 50%)",
    ink: "var(--foreground)",
  },
  { value: "paper", label: "settings.themePaper", en: "Paper", bg: "#fbf6e9", ink: "#2b2620" },
  { value: "sepia", label: "settings.themeSepia", en: "Sepia", bg: "#ecdec0", ink: "#3a2f20" },
  { value: "night", label: "settings.themeNight", en: "Night", bg: "#15140f", ink: "#d8d2c2" },
];

function getSnapshot(): Theme {
  if (typeof document === "undefined") return "system";
  const v = document.documentElement.getAttribute("data-theme");
  if (v === "paper" || v === "sepia" || v === "night") return v;
  return "system";
}

function getServerSnapshot(): Theme {
  return "system";
}

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function applyTheme(theme: Theme) {
  if (theme === "system") {
    document.cookie = "theme=;path=/;max-age=0;SameSite=Lax";
  } else {
    document.cookie = `theme=${theme};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
  }
  document.documentElement.setAttribute("data-theme", theme);
}

function MiniPagePreview({ ink }: { ink: string }) {
  return (
    <div className="relative h-[70px] overflow-hidden">
      <div
        className="absolute left-3 top-3 h-1 w-12 rounded-[1px]"
        style={{ background: ink, opacity: 0.85 }}
      />
      {[0, 5, 10, 15, 20].map((y) => (
        <div
          key={y}
          className="absolute left-3"
          style={{
            top: 24 + y,
            right: 16 + (y === 10 ? 16 : y === 20 ? 36 : 6),
            height: 1.5,
            background: ink,
            opacity: 0.4,
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}

export function ThemePicker() {
  const { t } = useTranslation();
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-3.5">
      {THEMES.map((th) => {
        const active = current === th.value;
        return (
          <button
            key={th.value}
            type="button"
            onClick={() => applyTheme(th.value)}
            className={`flex flex-col gap-2.5 rounded-[4px] border bg-surface p-3 text-left transition-all ${
              active
                ? "border-foreground shadow-[0_0_0_3px_var(--accent-soft)]"
                : "border-border hover:border-foreground"
            }`}
          >
            <div
              className="overflow-hidden rounded-[2px]"
              style={{ background: th.bg, color: th.ink }}
            >
              <MiniPagePreview ink={th.ink} />
            </div>
            <div className="flex flex-col gap-[2px]">
              <span className="text-[11px] font-medium text-secondary">
                {t(th.label)}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
                {th.en}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
