const CACHE = "kiteline-kitchen-sop-v3";
const OFFLINE_URL = "./offline.html";
const ASSETS = ["./", "./index.html", OFFLINE_URL, "./standalone.html", "./styles.css", "./app.js", "./data/sops.js", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png", "./icons/mark.png"];
self.addEventListener("install", (event) => { event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener("activate", (event) => { event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))); self.clients.claim(); });
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate" || /\/(app\.js|data\/sops\.js|styles\.css)$/.test(url.pathname)) {
    event.respondWith(fetch(event.request).then((response) => { if (!response || !response.ok) throw new Error("Bad response"); const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(event.request, copy)); return response; }).catch(async () => (await caches.match(event.request)) || caches.match(OFFLINE_URL)));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => { if (response && response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone())); return response; })));
});
