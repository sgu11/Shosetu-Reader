// Shosetu Reader service worker — V5.7 read-only offline for viewed episodes.
// Hand-written, no Workbox. Three caches:
//   static-v<VER>   — /_next/static + fonts (cache-first)
//   shell-v<VER>    — /library, /reader/* (stale-while-revalidate)
//   episodes-v<VER> — /reader/<id>, /api/reader/<id> (network-first → cache)
// Bump NEXT_PUBLIC_SW_CACHE_VERSION on deploy to invalidate all three.

const VERSION = self.__SW_CACHE_VERSION__ || "1";
const STATIC_CACHE = `static-v${VERSION}`;
const SHELL_CACHE = `shell-v${VERSION}`;
const EPISODES_CACHE = `episodes-v${VERSION}`;
const ALLOWED = new Set([STATIC_CACHE, SHELL_CACHE, EPISODES_CACHE]);

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(STATIC_CACHE));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !ALLOWED.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function pathname(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const path = pathname(req.url);
  if (!path) return;

  // Static assets (cache-first)
  if (path.startsWith("/_next/static/") || path.endsWith(".woff2") || path.endsWith(".css")) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // Episode pages and data (network-first → cache)
  if (path.startsWith("/reader/") || path.startsWith("/api/reader/")) {
    event.respondWith(networkFirst(req, EPISODES_CACHE));
    return;
  }

  // App shell (stale-while-revalidate) for library and root-ish navigation
  if (path === "/library" || path === "/" || path.startsWith("/novels/")) {
    event.respondWith(staleWhileRevalidate(req, SHELL_CACHE));
    return;
  }
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return cached || Response.error();
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    return Response.error();
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}
