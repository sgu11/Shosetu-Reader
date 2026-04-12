"use client";

import { useEffect, useRef } from "react";

interface Props {
  episodeId: string;
  language: "ja" | "ko";
}

/**
 * Invisible component that auto-saves reading progress.
 * Saves on mount (marks episode as current) and on scroll (debounced).
 */
export function ProgressTracker({ episodeId, language }: Props) {
  const savedRef = useRef(false);

  useEffect(() => {
    function save(progressPercent: number) {
      fetch("/api/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeId,
          language,
          progressPercent: Math.round(progressPercent),
        }),
      }).catch(() => {
        // silent — progress save is best-effort
      });
    }

    // Save immediately on mount
    if (!savedRef.current) {
      savedRef.current = true;
      save(0);
    }

    let timer: ReturnType<typeof setTimeout>;

    function onScroll() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const percent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        save(percent);
      }, 1500);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [episodeId, language]);

  return null;
}
