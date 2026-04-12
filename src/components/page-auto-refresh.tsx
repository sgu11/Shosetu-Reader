"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  enabled?: boolean;
  intervalMs?: number;
}

export function PageAutoRefresh({ enabled = true, intervalMs = 15000 }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      router.refresh();
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [enabled, intervalMs, router]);

  return null;
}
