#!/usr/bin/env node
'use strict';
/**
 * Apply Phase B/C runtime into a kitline1 checkout.
 * Usage: node scripts/apply-bc-to-kitline1.js /path/to/kitline1
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const target = process.argv[2];
if (!target || !fs.existsSync(path.join(target, 'server', 'server.js'))) {
  console.error('Usage: node scripts/apply-bc-to-kitline1.js /path/to/kitline1');
  process.exit(1);
}

function cpDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) cpDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

cpDir(path.join(root, 'runtime', 'server', 'saas'), path.join(target, 'server', 'saas'));
fs.copyFileSync(path.join(root, 'runtime', 'js', 'saas.js'), path.join(target, 'js', 'saas.js'));

const serverPath = path.join(target, 'server', 'server.js');
let server = fs.readFileSync(serverPath, 'utf8');

if (!server.includes("require('./saas')")) {
  server = server.replace(
    "const tenants = require('./tenants');",
    "const tenants = require('./tenants');\nconst kitelineSaas = require('./saas').attach({\n  getDb: () => readDb(),\n  writeDb: (d) => writeDb(d),\n  tenants,\n  isOwner: (e) => tenants.isOwner(e),\n});"
  );
}

// Hook GET /api/state to return scoped state
if (!server.includes('kitelineSaas.scopedStateFor')) {
  server = server.replace(
    "return apiSend(200, { state, tenant: tenants.tenantInfo(db, me.email) });\n  }\n  if (route === '/state' && req.method === 'PUT') {",
    `const scoped = kitelineSaas.scopedStateFor(me.email, state, tenants.isOwner);
    return apiSend(200, { state: scoped.state, tenant: tenants.tenantInfo(db, me.email), saas: scoped.access });
  }
  if (route === '/state' && req.method === 'PUT') {`
  );
}

// Hook PUT /api/state merge
if (!server.includes('kitelineSaas.mergePut')) {
  server = server.replace(
    "const next = body.state || prevState;\n    const prevCopy = JSON.parse(JSON.stringify(prevState));\n    ensureBreachAlerts(next);",
    `const merge = kitelineSaas.mergePut(me.email, prevState, body.state || prevState, tenants.isOwner);
    if (!merge.ok) return apiSend(400, { error: merge.error || 'Invalid state merge' });
    const next = merge.state;
    const prevCopy = JSON.parse(JSON.stringify(prevState));
    ensureBreachAlerts(next);`
  );
}

// Mount /api/saas before generic 404 — inject after auth'd section start of state is fine;
// place just before GET /api/state
if (!server.includes("url.pathname.startsWith('/api/saas')")) {
  server = server.replace(
    "// Per-company workspace (tenant-scoped; demo tenant is owner-only)\n  if (route === '/state' && req.method === 'GET') {",
    `// SaaS multi-company / multi-location API (Phase B)
  if (url.pathname.startsWith('/api/saas') || route === '/state') {
    if (typeof DEMO_MODE !== 'undefined' && DEMO_MODE) {
      if (kitelineSaas.ensureDemoTeamAccess(db, me.email, tenants)) writeDb(db);
    }
  }
  if (url.pathname.startsWith('/api/saas')) {
    return kitelineSaas.handler.handle(req, res, url, me, apiSend, body || {});
  }

  // Per-company workspace (tenant-scoped; demo tenant is owner-only)
  if (route === '/state' && req.method === 'GET') {`
  );
}

// Bump build id
server = server.replace(
  /const APP_BUILD = '[^']+';/,
  "const APP_BUILD = '2026-08-06-saas-bc';"
);

fs.writeFileSync(serverPath, server);

const indexPath = path.join(target, 'index.html');
let index = fs.readFileSync(indexPath, 'utf8');
if (!index.includes('/js/saas.js')) {
  index = index.replace(
    '<script src="/js/app.js?v=31"></script>',
    '<script src="/js/app.js?v=31"></script>\n  <script src="/js/saas.js?v=1"></script>'
  );
}
index = index.replace(
  /var build = '[^']+';/,
  "var build = '2026-08-06-saas-bc';"
);
fs.writeFileSync(indexPath, index);

console.log('Applied Phase B/C into', target);
console.log('- server/saas/*');
console.log('- js/saas.js');
console.log('- server.js hooks + build 2026-08-06-saas-bc');
console.log('- index.html script tag');
