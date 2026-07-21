/**
 * Libraix PWA service worker
 * Network-first for HTML so deploys never stick users on a stale shell
 * that points at deleted /assets/*.js hashes (blank screen).
 */
const CACHE = "libraix-shell-v3";

self.addEventListener("install", (event) => {
  // Activate immediately — don't wait for old broken workers to release
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Always hit the network for API (Netlify → Render proxy)
  if (url.pathname.startsWith("/api/")) return;

  const isDocument =
    request.mode === "navigate" ||
    request.destination === "document" ||
    (request.headers.get("accept") || "").includes("text/html");

  // HTML / app shell: network-first, never serve a stale index that references old hashes
  if (isDocument) {
    event.respondWith(
      fetch(request)
        .then(async (res) => {
          if (res.ok) {
            const copy = res.clone();
            const cache = await caches.open(CACHE);
            await cache.put("/index.html", copy);
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE);
          return (
            (await cache.match("/index.html")) ||
            new Response("<h1>Libraix offline</h1><p>Reconnect and refresh.</p>", {
              headers: { "Content-Type": "text/html; charset=utf-8" },
              status: 503,
            })
          );
        })
    );
    return;
  }

  // Hashed static assets: cache-first after a successful network fetch
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res.ok) await cache.put(request, res.clone());
          return res;
        } catch {
          // Never fall back to HTML for JS/CSS — that causes a blank screen
          return new Response("/* asset unavailable */", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
      })
    );
    return;
  }

  // Other same-origin GETs (icons, manifest): network with cache fallback
  event.respondWith(
    fetch(request)
      .then(async (res) => {
        if (res.ok && (url.pathname === "/manifest.webmanifest" || url.pathname.endsWith(".svg"))) {
          const cache = await caches.open(CACHE);
          await cache.put(request, res.clone());
        }
        return res;
      })
      .catch(async () => {
        const cache = await caches.open(CACHE);
        return (await cache.match(request)) || Response.error();
      })
  );
});
