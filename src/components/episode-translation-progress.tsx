"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/client";

interface Props {
  episodeId: string;
}

interface ProgressEstimate {
  progressPercent: number;
  estimatedRemainingMs: number;
  confidence: "low" | "medium" | "high";
}

export function EpisodeTranslationProgress({ episodeId }: Props) {
  const { locale } = useTranslation();
  const [progress, setProgress] = useState<ProgressEstimate | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/translations/episodes/${episodeId}/status`);
        if (!res.ok || cancelled) return;
        const data = await res.json();

        if (data.pendingTranslation?.progressEstimate) {
          setProgress(data.pendingTranslation.progressEstimate);
        } else if (data.status === "available" || data.status === "failed") {
          setDone(true);
        } else {
          setProgress(null);
        }
      } catch {
        // Ignore polling errors
      }
    }

    void poll();
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible" || cancelled || done) return;
      void poll();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [episodeId, done]);

  if (done || !progress) return null;

  return (
    <div className="mt-1 flex items-center gap-2">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-strong">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${progress.progressPercent}%` }}
        />
      </div>
      <span className="shrink-0 text-[10px] text-muted">
        {formatDuration(progress.estimatedRemainingMs, locale)}
      </span>
    </div>
  );
}

function formatDuration(ms: number, locale: string): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) {
    return locale === "ko" ? `${seconds}초` : `${seconds}s`;
  }
  const minutes = Math.ceil(seconds / 60);
  return locale === "ko" ? `${minutes}분` : `${minutes}m`;
}
