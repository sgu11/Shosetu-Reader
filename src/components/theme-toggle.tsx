"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useTranslation } from "@/lib/i18n/client";

type Theme = "dark" | "light";

function getThemeSnapshot(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
}

function getServerSnapshot(): Theme {
  return "dark";
}

function subscribeToTheme(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function applyTheme(theme: Theme) {
  document.cookie = `theme=${theme};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    applyTheme(theme === "dark" ? "light" : "dark");
  }, [theme]);

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-border-strong hover:text-foreground"
      aria-label={t("settings.toggleTheme")}
    >
      {theme === "dark" ? (
        <>
          <span aria-hidden>&#9789;</span>
          <span>{t("settings.themeDark")}</span>
        </>
      ) : (
        <>
          <span aria-hidden>&#9788;</span>
          <span>{t("settings.themeLight")}</span>
        </>
      )}
    </button>
  );
}
