/* Build a single HTML file so the pack opens without extra requests. */
const fs = require("fs");
const path = require("path");

const root = __dirname;
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const data = fs.readFileSync(path.join(root, "data", "sops.js"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const mark = fs.readFileSync(path.join(root, "icons", "mark.png"));
const markUri = "data:image/png;base64," + mark.toString("base64");
const patchedApp = app.replace(/icons\/mark\.png/g, markUri);

const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#0f766e" />
  <title>Kiteline · Kitchen SOP</title>
  <style>${css}</style>
</head>
<body>
  <div class="app" id="app">
    <div class="network-status" id="networkStatus" role="status" aria-live="polite" hidden></div>
    <header class="topbar" id="topbar">
      <button type="button" class="icon-btn" id="backBtn" hidden aria-label="Back">←</button>
      <div class="topbar-text">
        <p class="brand-mark" id="brandMark">Kiteline</p>
        <h1 class="screen-title" id="screenTitle">Kitchen SOP</h1>
      </div>
      <button type="button" class="icon-btn" id="searchToggle" aria-label="Search">⌕</button>
    </header>
    <div class="search-bar" id="searchBar" hidden>
      <input type="search" id="searchInput" placeholder="Search SOPs and training…" autocomplete="off" enterkeyhint="search" />
    </div>
    <main class="main" id="main"></main>
    <nav class="tabbar" aria-label="Primary">
      <button type="button" class="tab active" data-tab="home" aria-current="page"><span class="tab-ico">⌂</span><span>Home</span></button>
      <button type="button" class="tab" data-tab="sops"><span class="tab-ico">☰</span><span>SOPs</span></button>
      <button type="button" class="tab" data-tab="videos"><span class="tab-ico">▶</span><span>Videos</span></button>
      <button type="button" class="tab" data-tab="rules"><span class="tab-ico">!</span><span>Rules</span></button>
    </nav>
  </div>
  <script>${data}</script>
  <script>${patchedApp}</script>
</body>
</html>
`;

const out = path.join(root, "standalone.html");
fs.writeFileSync(out, html);
const publicCopy = path.join(root, "..", "open-kitchen-sop.html");
fs.writeFileSync(publicCopy, html);
const kitchenCopy = path.join(root, "..", "kitchen-sop", "standalone.html");
fs.writeFileSync(kitchenCopy, html);
console.log("Wrote", out, publicCopy, kitchenCopy, "bytes", html.length);
