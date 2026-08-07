#!/usr/bin/env node
'use strict';
/**
 * Kiteline public launch fixes for kitline1:
 * - Remove global noindex; add robots.txt + sitemap.xml
 * - HSTS + Content-Security-Policy
 * - Clean URL routes (/privacy → privacy.html etc.)
 * - Fix broken characters + legal operator / pricing wording
 * - Compress kiteline-logo.png
 *
 * Usage: node scripts/apply-launch-fixes.js /path/to/kitline1
 */
const fs = require('fs');
const path = require('path');

const target = process.argv[2];
if (!target || !fs.existsSync(path.join(target, 'server', 'server.js'))) {
  console.error('Usage: node scripts/apply-launch-fixes.js /path/to/kitline1');
  process.exit(1);
}
const ROOT = path.resolve(target);
const BUILD = '2026-08-07-launch-fixes';

function read(p) { return fs.readFileSync(p, 'utf8'); }
function write(p, s) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); console.log('wrote', path.relative(ROOT, p)); }

/* ---------- 1) security headers ---------- */
const securityPath = path.join(ROOT, 'server', 'security.js');
let security = read(securityPath);
if (!security.includes('Strict-Transport-Security')) {
  security = security.replace(
    `function securityHeaders(extra) {
  return Object.assign({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'X-Robots-Tag': 'noindex, nofollow',
  }, extra || {});
}`,
    `const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' mailto:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://js.stripe.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://api.stripe.com https://kiteline.uk https://www.kiteline.uk",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join('; ');

function securityHeaders(extra, opts) {
  const isHttpsProd = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': CSP,
  };
  if (isHttpsProd) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  }
  // Public marketing pages are indexable. App / private tools stay noindex.
  if (opts && opts.noIndex) {
    headers['X-Robots-Tag'] = 'noindex, nofollow';
  }
  return Object.assign(headers, extra || {});
}`
  );
  write(securityPath, security);
} else {
  console.log('skip security.js (already patched)');
}

/* ---------- 2) server clean URLs + robots + noindex for /app ---------- */
const serverPath = path.join(ROOT, 'server', 'server.js');
let server = read(serverPath);

if (!server.includes('CLEAN_MARKETING_PAGES')) {
  const inject = `
    // Clean marketing URLs: /privacy → site/privacy.html (also /privacy/)
    const CLEAN_MARKETING_PAGES = [
      'privacy', 'terms', 'pricing', 'contact', 'faq', 'security', 'cookies',
      'refunds', 'dpa', 'hardware', 'product-haccp', 'billing-success',
    ];
    const cleanPath = url.pathname.replace(/\\/+$/, '') || '/';
    const cleanSlug = cleanPath.replace(/^\\//, '');
    if (CLEAN_MARKETING_PAGES.includes(cleanSlug)) {
      const cleanFile = path.join(ROOT, 'site', cleanSlug + '.html');
      if (isExistingFile(cleanFile)) return serveFile(res, cleanFile);
    }

    // robots.txt + sitemap.xml from site/ (SEO)
    if (cleanPath === '/robots.txt') {
      const rp = path.join(ROOT, 'site', 'robots.txt');
      if (isExistingFile(rp)) return serveFile(res, rp);
    }
    if (cleanPath === '/sitemap.xml') {
      const sp = path.join(ROOT, 'site', 'sitemap.xml');
      if (isExistingFile(sp)) return serveFile(res, sp);
    }
`;
  server = server.replace(
    `    // Kiteline marketing site at "/"
    if (url.pathname === '/' || url.pathname === '') return serveFile(res, path.join(ROOT, 'site', 'index.html'));`,
    `    // Kiteline marketing site at "/"
    if (url.pathname === '/' || url.pathname === '') return serveFile(res, path.join(ROOT, 'site', 'index.html'));
${inject}`
  );
}

// App HTML should remain noindex; public marketing pages are indexable (no X-Robots-Tag).
if (!server.includes('noIndex: true')) {
  server = server.replace(
    `    res.writeHead(200, security.securityHeaders(headers));
    res.end(buf);
  } catch {
    send(res, 404, { error: 'Not found' }, null, null);
  }
}

function serveAppIndex(res) {
  try {
    let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const build = String(APP_BUILD).replace(/[^a-zA-Z0-9._-]/g, '');
    html = html.replace(/\\?v=[^"'&]+/g, '?v=' + build);
    res.writeHead(200, security.securityHeaders({
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    }));
    res.end(html);`,
    `    const headerOpts = (opts && opts.noIndex) ? { noIndex: true } : undefined;
    res.writeHead(200, security.securityHeaders(headers, headerOpts));
    res.end(buf);
  } catch {
    send(res, 404, { error: 'Not found' }, null, null);
  }
}

function serveAppIndex(res) {
  try {
    let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const build = String(APP_BUILD).replace(/[^a-zA-Z0-9._-]/g, '');
    html = html.replace(/\\?v=[^"'&]+/g, '?v=' + build);
    res.writeHead(200, security.securityHeaders({
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    }, { noIndex: true }));
    res.end(html);`
  );
}

server = server.replace(/const APP_BUILD = '[^']+';/, `const APP_BUILD = '${BUILD}';`);
write(serverPath, server);

/* ---------- 3) robots.txt + sitemap.xml ---------- */
write(path.join(ROOT, 'site', 'robots.txt'), `User-agent: *
Allow: /
Disallow: /app
Disallow: /api/
Disallow: /activate
Disallow: /mcp
Disallow: /vedanta-rota
Disallow: /vedanta-ordering
Disallow: /academy/admin
Disallow: /academy/staff

Sitemap: https://kiteline.uk/sitemap.xml
`);

write(path.join(ROOT, 'site', 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://kiteline.uk/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>https://kiteline.uk/pricing</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>
  <url><loc>https://kiteline.uk/product-haccp</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://kiteline.uk/hardware</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://kiteline.uk/contact</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://kiteline.uk/faq</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://kiteline.uk/security</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://kiteline.uk/privacy</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>https://kiteline.uk/terms</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>https://kiteline.uk/cookies</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>https://kiteline.uk/refunds</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>https://kiteline.uk/dpa</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
</urlset>
`);

/* ---------- 4) encoding + legal wording on public HTML ---------- */
const FOOTER =
  '© 2026 Kiteline. All rights reserved. Kiteline is an independent software brand and is not operated by or affiliated with The Vedanta Way Limited.';

const ENCODING = [
  ['?we?', '"we"'],
  ['?us?', '"us"'],
  ['?our?', '"our"'],
  ['?as is?', '"as is"'],
  ['?Last updated?', '"Last updated"'],
  ["company?s", "organisation's"],
  ["organisation?s", "organisation's"],
  ["customers? data", "customers' data"],
  ["customers?", "customers'"],
  ['cancel anytime ?', 'cancel anytime —'],
  ['processes ? it', 'processes — it'],
  ['testing ? it', 'testing — it'],
  ['requirements ? you', 'requirements — you'],
  ['DPA) ? email', 'DPA) — email'],
  ['30?90', '30–90'],
  ['\uFFFD100', '£100'],
  ['�100', '£100'],
  ['© 2026 Kiteline ? All rights reserved.', FOOTER],
  ['© 2026 Kiteline · All rights reserved.', FOOTER],
  ['Privacy Policy ? Kiteline', 'Privacy Policy — Kiteline'],
  ['Terms & Conditions ? Kiteline', 'Terms & Conditions — Kiteline'],
  ['</strong> ? ', '</strong> — '],
];

function fixHtmlFile(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return;
  let t = read(p);
  const orig = t;
  for (const [a, b] of ENCODING) t = t.split(a).join(b);
  // Remaining "strong> ? " patterns
  t = t.replace(/<\/strong>\s*\?\s*/g, '</strong> — ');
  t = t.replace(/([a-z])\?\s+it\b/gi, '$1 — it');
  t = t.replace(/([a-z])\?\s+you\b/gi, '$1 — you');

  if (rel.endsWith('privacy.html')) {
    t = t.replace(
      /<h2>1\.\s*Data controller<\/h2>\s*<p>[\s\S]*?<\/p>/,
      `<h2>1. Data controller</h2>
    <p>Kiteline is an independent software brand operated by [FULL LEGAL OPERATOR NAME]. For account, website, support and marketing data, [FULL LEGAL OPERATOR NAME] is the data controller. Contact: <a href="mailto:contact@kiteline.uk" class="text-brand-700">contact@kiteline.uk</a>. The customer organisation normally acts as data controller for the staff and operational data entered into its workspace. Kiteline processes that information on the customer’s instructions when providing the hosted service.</p>`
    );
    t = t.replace(
      /<li><strong>Payment data<\/strong> — processed by Stripe when you subscribe; we do not store full card numbers.<\/li>/,
      '<li><strong>Payment data</strong> — online card checkout is not currently active; paid pilots are arranged by invoice. We do not store full card numbers.</li>'
    );
    t = t.replace(/GET \/api\/workspace\/export/g, 'an organisation data export where available to authorised administrators');
    if (!t.includes('Current service providers')) {
      t = t.replace(
        /<h2>6\. Sharing data[\s\S]*?<p>B2B customers[\s\S]*?<\/p>/,
        `<h2>6. Sharing data &amp; sub-processors</h2>
    <p id="subprocessors">We do not sell your personal data.</p>
    <h3 class="text-base font-bold mt-4 mb-2">Current service providers</h3>
    <ul>
      <li><strong>Hosting</strong> — Render (application hosting), where the public service is deployed.</li>
      <li><strong>Professional advisers</strong> — lawyers or accountants if required.</li>
      <li><strong>Authorities</strong> — if required by law.</li>
    </ul>
    <h3 class="text-base font-bold mt-4 mb-2">Planned integrations not currently active</h3>
    <ul>
      <li><strong>Database provider</strong> — production database region and provider details will be confirmed before commercial launch.</li>
      <li><strong>Transactional email</strong> — in development.</li>
      <li><strong>Card payments</strong> — planned and not currently active.</li>
      <li><strong>SMS alerts</strong> — planned; not currently active.</li>
    </ul>
    <p>A formal Data Processing Agreement will be available before paid B2B customer onboarding. Contact <a href="mailto:contact@kiteline.uk?subject=DPA%20request" class="text-brand-700">contact@kiteline.uk</a>.</p>`
      );
    }
  }

  if (rel.endsWith('terms.html')) {
    t = t.replace(
      /<h2>1\.\s*Who we are<\/h2>\s*<p>[\s\S]*?<\/p>/,
      `<h2>1. Who we are</h2>
    <p>Kiteline is an independent software brand. The legal operator’s full name, service address and business details will be added before paid commercial subscriptions are activated. Contact: <a href="mailto:contact@kiteline.uk" class="text-brand-700">contact@kiteline.uk</a>.</p>`
    );
    if (!t.includes('reviewed professionally before commercial launch')) {
      t = t.replace(
        '(or £100 if you use a free trial).',
        '(or £100 if you use a free trial). This liability wording is indicative only and must be reviewed professionally before commercial launch — it is not final approved legal wording.'
      );
    }
    t = t.replace(
      /Paid plans, where offered, are billed as described at checkout or in your agreement\. During early access, plans may be activated by invoice until online checkout is enabled\./,
      'During early access, paid plans are arranged manually by email and invoice. Online card payments and self-service subscription management are planned but are not currently available.'
    );
  }

  if (rel.endsWith('dpa.html')) {
    t = t.replace(
      'A full signed DPA is available on request',
      'A formal Data Processing Agreement will be available before paid B2B customer onboarding'
    );
  }

  if (rel.endsWith('contact.html')) {
    t = t.replace(
      'Company registration details available on request for B2B contracts.',
      'Currently in early access. Email: contact@kiteline.uk'
    );
  }

  if (rel.endsWith('pricing.html')) {
    t = t.replace(
      'All modules included (SafeServe, MenuGuard, labels, waste).',
      'All currently available core software modules included. Recipe AI, sensor hardware, printers, consumables and future premium integrations are separate.'
    );
    t = t.replace(/All modules included/g, 'Core modules included (see status below)');
    t = t.replace(/all modules/g, 'currently available core modules');
    t = t.replace(
      '£19.00 per user · cancel anytime',
      '£19.00 effective monthly price per included user when the plan is fully used'
    );
    t = t.replace(
      '£8.00 per user · cancel anytime',
      '£8.00 effective monthly price per included user when the plan is fully used'
    );
    t = t.replace('£7.20 per user', '£7.20 effective monthly price per included user when the plan is fully used');
    t = t.replace('£6.50 per user', '£6.50 effective monthly price per included user when the plan is fully used');
    t = t.replace(
      '£5.50 per user · volume discount',
      '£5.50 effective monthly price per included user when the plan is fully used · volume discount'
    );
    t = t.replace('✓ Multi-site (Team plan)', '✓ Site allowance by plan (Starter/Team 5: 1 · Team 10: 2 · Team 20: 5 · Team 50: 10)');
    if (!t.includes('not currently VAT-registered')) {
      t = t.replace(
        '<p class="text-center text-sm text-brand-700 font-semibold mb-10">',
        '<p class="text-center text-sm text-ink-600 mb-4">Kiteline is not currently VAT-registered. No VAT is charged at this time.</p>\n    <p class="text-center text-sm text-brand-700 font-semibold mb-10">'
      );
    }
    // Recipe AI pilot wording
    t = t.replace(
      'Subscribe in the app (Stripe). Kiteline hosts AI — your company pays us monthly.',
      'Recipe AI is currently available to selected pilot customers. Final pricing and monthly usage allowances will be published before general release.'
    );
    t = t.replace(
      /<b>Option A:<\/b>[\s\S]*?invoice or pilot\)\./,
      'Recipe AI is currently available to selected pilot customers. Final pricing, monthly usage allowances, and AI-provider data handling will be published before general release. Email <a href="mailto:contact@kiteline.uk" class="text-brand-700 font-semibold">contact@kiteline.uk</a> for pilot access.'
    );
    // Stripe live footer branch → keep invoice wording even if billing API enables
    t = t.replace(
      "if (foot) foot.textContent = 'Prices shown are guide prices. Subscriptions billed monthly via Stripe until cancelled.';",
      "if (foot) foot.textContent = 'During early access, paid plans are arranged manually by email and invoice. Online card payments are planned but not currently available.';"
    );
    t = t.replace(
      "if (tag) tag.textContent = '✓ Subscribe securely online by card after trial';",
      "if (tag) tag.textContent = '✓ Paid plans by invoice during early access';"
    );
    t = t.replace(
      "if (note) note.textContent = '14-day free trial on new accounts. After trial, subscribe securely online by card. Cancel anytime.';",
      "if (note) note.textContent = '14-day free trial on new accounts. Paid plans are activated manually by invoice or email during early access.';"
    );
    if (!t.includes('Online card payments and self-service subscription management are planned but are not currently available.')) {
      t = t.replace(
        '<footer class="bg-ink-950',
        '<p class="text-center text-sm text-ink-500 px-5 mb-6 max-w-2xl mx-auto">During early access, paid plans are arranged manually by email and invoice. Online card payments and self-service subscription management are planned but are not currently available.</p>\n  <footer class="bg-ink-950'
      );
    }
  }

  // Footer disclaimer on public pages
  if (!t.includes('not operated by or affiliated with The Vedanta Way Limited')) {
    t = t.replace(
      /<p>\s*©?\s*2026 Kiteline[^<]*<\/p>/,
      `<p>${FOOTER}</p>`
    );
  }

  // meta robots allow index on marketing pages (remove noindex meta if any)
  t = t.replace(/<meta[^>]+name=["']robots["'][^>]*>/gi, '');

  if (t !== orig) write(p, t);
}

const siteHtml = fs.readdirSync(path.join(ROOT, 'site')).filter((f) => f.endsWith('.html'));
siteHtml.forEach((f) => fixHtmlFile(path.join('site', f)));
['site/use-cases', 'site/academy'].forEach((dir) => {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return;
  fs.readdirSync(abs).filter((f) => f.endsWith('.html')).forEach((f) => fixHtmlFile(path.join(dir, f)));
});

/* ---------- 5) compress logo ---------- */
function compressLogo() {
  const logoPath = path.join(ROOT, 'kiteline-logo.png');
  if (!fs.existsSync(logoPath)) return;
  const before = fs.statSync(logoPath).size;
  const { spawnSync } = require('child_process');
  const out = path.join(ROOT, 'kiteline-logo.optimized.png');
  const py = `
from PIL import Image
src = ${JSON.stringify(logoPath)}
dst = ${JSON.stringify(out)}
im = Image.open(src).convert('RGBA')
max_side = 512
w, h = im.size
if max(w, h) > max_side:
    ratio = max_side / float(max(w, h))
    im = im.resize((max(1, int(w*ratio)), max(1, int(h*ratio))), Image.Resampling.LANCZOS)
im.save(dst, format='PNG', optimize=True)
print(w, h, '->', im.size[0], im.size[1])
`;
  const r = spawnSync('python3', ['-c', py], { encoding: 'utf8' });
  if (r.status === 0 && fs.existsSync(out)) {
    const after = fs.statSync(out).size;
    if (after < before) {
      fs.renameSync(out, logoPath);
      console.log(`logo compressed ${before} → ${after} bytes (${(r.stdout || '').trim()})`);
    } else {
      fs.unlinkSync(out);
      console.log('logo compress skipped (not smaller)');
    }
  } else {
    console.warn('logo compress failed', r.stderr || r.stdout);
  }
}

compressLogo();

console.log('\\nOK: launch fixes applied to', ROOT);
console.log('Build id:', BUILD);
console.log('Commit + push kitline1, then Render will redeploy kiteline.uk');
