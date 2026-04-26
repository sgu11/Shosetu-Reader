"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useTranslation } from "@/lib/i18n/client";

type GlossaryVisibility = "show" | "hide";

function getSnapshot(): GlossaryVisibility {
  if (typeof document === "undefined") return "show";
  const v = document.documentElement.getAttribute("data-glossary");
  return v === "hide" ? "hide" : "show";
}

function getServerSnapshot(): GlossaryVisibility {
  return "show";
}

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-glossary"],
  });
  return () => observer.disconnect();
}

function applyVisibility(visibility: GlossaryVisibility) {
  if (visibility === "show") {
    document.cookie = "glossary-visible=;path=/;max-age=0;SameSite=Lax";
  } else {
    document.cookie = `glossary-visible=hide;path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
  }
  document.documentElement.setAttribute("data-glossary", visibility);
}

export function GlossaryToggle() {
  const { t } = useTranslation();
  const visibility = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const next: GlossaryVisibility = visibility === "show" ? "hide" : "show";

  const onClick = useCallback(() => {
    applyVisibility(next);
  }, [next]);

  const label = visibility === "show" ? t("reader.glossaryHide") : t("reader.glossaryShow");

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={visibility === "show"}
      aria-label={label}
      title={label}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        visibility === "show"
          ? "border-accent bg-accent/10 text-accent"
          : "border-border text-muted hover:text-foreground"
      }`}
    >
      <span aria-hidden>◧</span>
    </button>
  );
}
