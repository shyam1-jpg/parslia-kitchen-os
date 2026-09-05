'use strict';

/**
 * Local Kiteline payment demo — Stripe-compatible checkout without live keys.
 *   BILLING_DEV_MODE=true node kiteline-billing/demo/server.js
 */

const http = require('http');
const billing = require('../lib/billing');

process.env.BILLING_DEV_MODE = process.env.BILLING_DEV_MODE || 'true';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || billing.DEV_KEY;
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_kiteline_dev';
process.env.OWNER_EMAIL = process.env.OWNER_EMAIL || 'owner@kiteline.uk';
process.env.APP_URL = process.env.APP_URL || 'http://127.0.0.1:4011';

const PORT = Number(process.env.PORT || 4011);

const db = {
  users: {
    'chef@example.com': {
      email: 'chef@example.com',
      createdAt: new Date().toISOString(),
      tenantId: 'tenant_demo',
      trialEndsAt: new Date(Date.now() + 10 * 86400000).toISOString(),
    },
    'owner@kiteline.uk': {
      email: 'owner@kiteline.uk',
      createdAt: new Date().toISOString(),
      tenantId: 'tenant_demo',
    },
    'cook@example.com': {
      email: 'cook@example.com',
      createdAt: new Date().toISOString(),
      tenantId: 'tenant_demo',
    },
  },
  tenants: {
    tenant_demo: {
      org: { name: 'Harbour Kitchen', plan: 'Free trial' },
      team: [
        { email: 'chef@example.com', role: 'admin' },
        { email: 'cook@example.com', role: 'staff' },
      ],
      sites: [{ id: 'site_1', name: 'Harbour' }],
    },
  },
  subscriptions: {},
  invoices: [],
  billingEvents: {},
};

function writeDb() {}

function send(res, status, body, headers) {
  const extra = headers || {};
  res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, extra));
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks);
      if (!raw.length) return resolve({ raw: '', json: {} });
      try { resolve({ raw: raw.toString('utf8'), json: JSON.parse(raw.toString('utf8')) }); }
      catch { resolve({ raw: raw.toString('utf8'), json: {} }); }
    });
    req.on('error', reject);
  });
}

function meFrom(req) {
  const email = (req.headers['x-user-email'] || '').toLowerCase().trim();
  if (!email || !db.users[email]) return null;
  return db.users[email];
}

function htmlPage() {
  const cfg = billing.publicConfig();
  const plans = cfg.plans.map((p) => `
    <article class="card">
      <h3>${p.name}</h3>
      <p>${p.description}</p>
      <p class="price">${p.display} · ${p.annualDisplay}</p>
      <p class="meta">${p.maxUsers} users · ${p.maxSites} site${p.maxSites === 1 ? '' : 's'}</p>
      <button data-plan="${p.id}" data-interval="month">Subscribe monthly</button>
      <button class="ghost" data-plan="${p.id}" data-interval="year">Pay annually</button>
    </article>`).join('');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Kiteline payments</title>
<style>
body{font-family:Inter,system-ui,sans-serif;margin:0;background:#f8fafc;color:#0f172a}
header{background:linear-gradient(135deg,#0f766e,#0b1220);color:#fff;padding:32px 24px}
main{max-width:1100px;margin:0 auto;padding:24px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:18px}
button{width:100%;margin-top:8px;padding:10px;border:0;border-radius:10px;background:#0d9488;color:#fff;font-weight:700;cursor:pointer}
button.ghost{background:#0f172a}
.meta,.price{color:#475569;font-size:14px}
#out{white-space:pre-wrap;background:#0b1220;color:#ccfbf1;padding:16px;border-radius:12px}
</style></head>
<body>
<header>
  <p>Kiteline payment system · local Stripe mock</p>
  <h1>Subscribe a kitchen</h1>
  <p>Dev checkout (no live Stripe keys). Email chef@example.com · owner grant uses owner@kiteline.uk</p>
</header>
<main>
  <div class="grid">${plans}</div>
  <section class="card" style="margin-top:24px">
    <h3>Status</h3>
    <pre id="out">Loading…</pre>
  </section>
</main>
<script>
async function refresh(){
  const st = await fetch('/api/billing/status', {headers:{'x-user-email':'chef@example.com'}}).then(r=>r.json());
  document.getElementById('out').textContent = JSON.stringify(st, null, 2);
}
document.querySelectorAll('button[data-plan]').forEach(btn => {
  btn.onclick = async () => {
    const res = await fetch('/api/billing/checkout', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({plan: btn.dataset.plan, interval: btn.dataset.interval, email:'chef@example.com'})
    });
    const data = await res.json();
    if (data.url) location.href = data.url;
    else alert(data.error || 'Checkout failed');
  };
});
refresh();
</script>
</body></html>`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, process.env.APP_URL);
  const route = url.pathname.replace(/^\/api/, '') || '/';
  const query = Object.fromEntries(url.searchParams.entries());

  if (url.pathname === '/' || url.pathname === '/pricing.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(htmlPage());
  }
  if (url.pathname === '/billing-success.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px">
      <h1>Subscription confirmed</h1>
      <p>Session ${query.session_id || ''}</p>
      <p><a href="/">Back to plans</a></p>
      </body></html>`);
  }
  if (url.pathname === '/health') return send(res, 200, { ok: true, billing: billing.isConfigured(), devMode: billing.isDevMode() });

  const parsed = await parseBody(req);
  if (url.pathname === '/api/billing/webhook' && req.method === 'POST') {
    const result = await billing.handleWebhook(parsed.raw, req.headers['stripe-signature'] || '', db, writeDb);
    return send(res, result.ok ? 200 : 400, result);
  }

  const pub = await billing.tryHandlePublic({
    route,
    method: req.method,
    body: parsed.json,
    query,
    db,
    writeDb,
  });
  if (pub) {
    if (pub.redirect) {
      res.writeHead(302, { Location: pub.redirect });
      return res.end();
    }
    return send(res, pub.status, pub.body);
  }

  const me = meFrom(req);
  if (!me && route.startsWith('/billing/')) return send(res, 401, { error: 'Sign in required' });
  if (me) {
    const authed = await billing.tryHandleAuth({
      route,
      method: req.method,
      body: parsed.json,
      me,
      db,
      writeDb,
    });
    if (authed) return send(res, authed.status, authed.body);
  }
  send(res, 404, { error: 'Not found' });
});

if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log('[kiteline-billing] demo listening on http://127.0.0.1:' + PORT);
  });
}

module.exports = { server, db, PORT };
