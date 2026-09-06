/**
 * Parslia Kitchen OS service worker.
 * Caches the Windows Store shell and legal pages only.
 * The remote kitchen workspace is never cached here.
 */
const CACHE_NAME = "parslia-shell-v1";
const SHELL_URLS = [
  "/app.html",
  "/app.js",
  "/styles.css",
  "/manifest.webmanifest",
  "/privacy.html",
  "/terms.html",
  "/support.html",
  "/subscription-terms.html",
  "/assets/pwa-icon-192.png",
  "/assets/pwa-icon-512.png",
  "/assets/USE_THIS_parslia_header_logo_clean.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(SHELL_URLS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key !== CACHE_NAME;
      }).map(function (key) {
        return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var url;
  try {
    url = new URL(request.url);
  } catch (err) {
    return;
  }

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request).then(function (response) {
      if (response.ok && SHELL_URLS.indexOf(url.pathname) !== -1) {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(request, copy);
        });
      }
      return response;
    }).catch(function () {
      return caches.match(request).then(function (cached) {
        if (cached) return cached;
        if (url.pathname === "/" || url.pathname === "/app.html") {
          return caches.match("/app.html");
        }
        return Response.error();
      });
    })
  );
});
