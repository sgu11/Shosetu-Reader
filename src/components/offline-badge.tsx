"use client";

import { useEffect, useState } from "react";

export function OfflineBadge() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const up = () => setOffline(false);
    const down = () => setOffline(true);
    // Check once via event listener microtask, not sync setState.
    const check = () => (navigator.onLine ? up() : down());
    const id = window.setTimeout(check, 0);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  const online = !offline;

  if (online) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-amber-500/90 px-4 py-1.5 text-xs font-medium text-white shadow-lg">
      Offline — reading from cache
    </div>
  );
}
