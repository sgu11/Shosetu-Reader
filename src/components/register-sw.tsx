"use client";

import { useEffect } from "react";

/**
 * Register /sw.js in production only. The SW is hand-written in public/sw.js
 * and handles cache versioning via NEXT_PUBLIC_SW_CACHE_VERSION.
 */
export function RegisterSW() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        // Registration failures are non-fatal; app falls back to network.
      });
  }, []);

  return null;
}
