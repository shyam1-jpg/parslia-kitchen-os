import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const ADMIN_ROOT = "/workspace/vedanta-platform/apps/web-admin/out";
const STAFF_ROOT = "/workspace/vedanta-platform/apps/web-staff/out";
const GUEST_ROOT = "/workspace/vedanta-platform/apps/web-guest/out";
const API_HOST = "127.0.0.1";
const API_PORT = 4000;
const PORT = Number(process.env.LIVE_PORT ?? 8080);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

function isApi(urlPath) {
  return (
    urlPath.startsWith("/health") ||
    urlPath.startsWith("/auth") ||
    urlPath.startsWith("/me") ||
    urlPath.startsWith("/v1") ||
    urlPath.startsWith("/integrations") ||
    urlPath.startsWith("/staff") ||
    urlPath.startsWith("/guest")
  );
}

function staticRoot(urlPath) {
  if (urlPath.startsWith("/pocket")) return STAFF_ROOT;
  if (urlPath.startsWith("/book")) return GUEST_ROOT;
  return ADMIN_ROOT;
}

function safeStatic(urlPath) {
  const root = staticRoot(urlPath);
  let p = decodeURIComponent(urlPath.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const full = normalize(join(root, p));
  if (!full.startsWith(root)) return null;
  if (existsSync(full) && statSync(full).isFile()) return full;
  const html = full.endsWith(".html") ? full : `${full}.html`;
  if (existsSync(html) && statSync(html).isFile()) return html;
  const idx = join(root, "index.html");
  return existsSync(idx) ? idx : null;
}

const server = http.createServer((req, res) => {
  const urlPath = req.url || "/";
  const pathOnly = urlPath.split("?")[0];
  if (pathOnly === "/" || pathOnly === "") {
    res.writeHead(302, { Location: "/book/" });
    res.end();
    return;
  }
  if (isApi(urlPath)) {
    const proxy = http.request(
      { hostname: API_HOST, port: API_PORT, path: urlPath, method: req.method, headers: { ...req.headers, host: `${API_HOST}:${API_PORT}` } },
      (up) => {
        res.writeHead(up.statusCode || 502, up.headers);
        up.pipe(res);
      },
    );
    proxy.on("error", (err) => {
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ detail: "API proxy failed", error: err.message }));
    });
    req.pipe(proxy);
    return;
  }
  const file = safeStatic(urlPath);
  if (!file) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
    return;
  }
  res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
  createReadStream(file).pipe(res);
});

server.listen(PORT, "0.0.0.0", () => console.log(`vedanta live proxy on http://0.0.0.0:${PORT}`));
