#!/usr/bin/env node
/**
 * Build a local Capacitor www/ fallback (used if server.url is removed).
 * Copies a slim Parslia shell so the native app always has a landing surface.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const www = path.join(root, 'www');
const repoRoot = path.join(root, '..');

fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });
fs.mkdirSync(path.join(www, 'assets'), { recursive: true });

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="theme-color" content="#063F32" />
  <title>Parslia Kitchen OS</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; font-family: Georgia, "Times New Roman", serif;
      background: linear-gradient(165deg, #0A4F40 0%, #063F32 45%, #042A22 100%);
      color: #F7F2E8; display: flex; align-items: center; justify-content: center;
      padding: 32px 24px; text-align: center;
    }
    main { max-width: 420px; }
    .mark {
      width: 88px; height: 88px; margin: 0 auto 22px; border-radius: 22px;
      background: #F7F2E8; color: #063F32; display: grid; place-items: center;
      font-size: 48px; font-weight: 700; box-shadow: 0 16px 40px rgba(0,0,0,.25);
    }
    h1 { font-size: 2rem; margin: 0 0 10px; font-weight: 700; }
    p { margin: 0 0 18px; font-family: system-ui, sans-serif; line-height: 1.5; opacity: .92; }
    a.cta {
      display: inline-block; margin-top: 8px; padding: 14px 22px; border-radius: 999px;
      background: #B87333; color: #fff; font-family: system-ui, sans-serif; font-weight: 700;
      text-decoration: none;
    }
    .meta { margin-top: 28px; font-size: .85rem; font-family: system-ui, sans-serif; opacity: .7; }
  </style>
</head>
<body>
  <main>
    <div class="mark" aria-hidden="true">P</div>
    <h1>Parslia Kitchen OS</h1>
    <p>Every recipe, costed &amp; compliant — with AI Image and AI Voice Finder.</p>
    <a class="cta" href="https://parslia.app">Open Parslia</a>
    <p class="meta">Support: hello@parslia.app</p>
  </main>
</body>
</html>
`;

fs.writeFileSync(path.join(www, 'index.html'), html);

const iconSrc = path.join(repoRoot, 'assets', 'app-store-icon-1024.png');
const logoSrc = path.join(repoRoot, 'assets', 'USE_THIS_parslia_header_logo_clean.png');
if (fs.existsSync(iconSrc)) {
  fs.copyFileSync(iconSrc, path.join(www, 'assets', 'icon.png'));
}
if (fs.existsSync(logoSrc)) {
  fs.copyFileSync(logoSrc, path.join(www, 'assets', 'logo.png'));
}

console.log('Built mobile/www fallback shell');
