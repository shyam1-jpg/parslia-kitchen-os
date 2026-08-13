const CACHE_NAME = "menu-creator-simple-v1.4";
const ASSETS = [
  "/menu-creator/",
  "/menu-creator/index.html",
  "/menu-creator/PRINT-NOW.html",
  "/menu-creator/install.html",
  "/menu-creator/manifest.json",
  "/menu-creator/icons/icon-192.png",
  "/menu-creator/icons/icon-512.png",
  "/menu-creator/icons/apple-touch-icon.png"
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    (event.request.mode === "navigate" || event.request.destination === "document"
      ? fetch(event.request).catch(() => caches.match("./index.html"))
      : caches.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (!response || response.status !== 200 || response.type !== "basic") return response;
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            return response;
          });
        })
    ).catch(() => caches.match("./index.html"))
  );
});
