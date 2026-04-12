"use client";

import { useEffect, useRef } from "react";

interface Props {
  episodeId: string;
  initialLanguage: "ja" | "ko";
  initialScrollAnchor?: string | null;
  initialProgressPercent?: number | null;
}

/**
 * Invisible component that auto-saves reading progress.
 * Saves on mount (marks episode as current) and on scroll (debounced).
 */
export function ProgressTracker({
  episodeId,
  initialLanguage,
  initialScrollAnchor,
  initialProgressPercent,
}: Props) {
  const languageRef = useRef<"ja" | "ko">(initialLanguage);
  const restoredRef = useRef(false);

  useEffect(() => {
    function getVisibleContainer(): HTMLElement | null {
      const translated = document.querySelector("[data-reader-text]:not(.hidden)") as HTMLElement | null;
      const original = document.querySelector("[data-original-text]:not(.hidden)") as HTMLElement | null;
      return translated ?? original;
    }

    function getCurrentProgress() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progressPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

      const container = getVisibleContainer();
      const paragraphs = container
        ? Array.from(container.querySelectorAll<HTMLElement>("[data-reader-paragraph]"))
        : [];
      const anchor = paragraphs.find((paragraph) => paragraph.getBoundingClientRect().top >= 0)?.dataset.readerParagraph
        ?? paragraphs.at(-1)?.dataset.readerParagraph
        ?? null;

      return {
        progressPercent,
        scrollAnchor: anchor,
      };
    }

    function saveCurrentProgress() {
      const current = getCurrentProgress();

      fetch("/api/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeId,
          language: languageRef.current,
          scrollAnchor: current.scrollAnchor,
          progressPercent: Math.round(current.progressPercent),
        }),
      }).catch(() => {
        // silent — progress save is best-effort
      });
    }

    function restorePosition(attempt: number = 0) {
      if (restoredRef.current) {
        return;
      }

      const anchor = initialScrollAnchor
        ? document.querySelector<HTMLElement>(`[data-reader-paragraph="${initialScrollAnchor}"]`)
        : null;

      if (anchor) {
        restoredRef.current = true;
        anchor.scrollIntoView({ block: "start" });
        window.setTimeout(saveCurrentProgress, 50);
        return;
      }

      if (attempt < 8) {
        window.setTimeout(() => restorePosition(attempt + 1), 150);
        return;
      }

      if (initialProgressPercent && initialProgressPercent > 0) {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo({
          top: (docHeight * initialProgressPercent) / 100,
          behavior: "auto",
        });
      }

      restoredRef.current = true;
      window.setTimeout(saveCurrentProgress, 50);
    }

    let timer: ReturnType<typeof setTimeout>;

    function onLanguageChange(event: Event) {
      const detail = (event as CustomEvent<{ language?: "ja" | "ko" }>).detail;
      if (detail?.language) {
        languageRef.current = detail.language;
      }
    }

    function onScroll() {
      if (!restoredRef.current) {
        return;
      }

      clearTimeout(timer);
      timer = setTimeout(() => {
        saveCurrentProgress();
      }, 1500);
    }

    window.setTimeout(() => restorePosition(), 50);
    window.addEventListener("reader-language-change", onLanguageChange as EventListener);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("reader-language-change", onLanguageChange as EventListener);
      window.removeEventListener("scroll", onScroll);
    };
  }, [episodeId, initialLanguage, initialProgressPercent, initialScrollAnchor]);

  return null;
}
