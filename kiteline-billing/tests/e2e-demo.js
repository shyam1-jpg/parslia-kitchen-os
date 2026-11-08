'use strict';

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 4011;
const BASE = 'http://127.0.0.1:' + PORT;

function waitForHealth() {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      const req = http.get(BASE + '/health', (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          if (res.statusCode === 200) resolve(JSON.parse(data));
          else retry();
        });
      });
      req.on('error', retry);
      req.setTimeout(500, () => { req.destroy(); retry(); });
    };
    function retry() {
      if (Date.now() - started > 8000) reject(new Error('demo server did not start'));
      else setTimeout(tick, 150);
    }
    tick();
  });
}

async function json(pathname, opts) {
  const res = await fetch(BASE + pathname, opts);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  return { status: res.status, headers: res.headers, body, redirected: res.redirected, url: res.url };
}

async function main() {
  const child = spawn(process.execPath, [path.join(__dirname, '../demo/server.js')], {
    env: Object.assign({}, process.env, {
      PORT: String(PORT),
      BILLING_DEV_MODE: 'true',
      STRIPE_SECRET_KEY: 'sk_test_kiteline_dev',
      APP_URL: BASE,
    }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => process.stderr.write(d));
  child.stderr.on('data', (d) => process.stderr.write(d));
  try {
    const health = await waitForHealth();
    console.log('HEALTH', JSON.stringify(health));
    const cfg = await json('/api/billing/config');
    console.log('CONFIG enabled=', cfg.body.enabled, 'plans=', cfg.body.plans.map((p) => p.id + ':' + p.display + ':' + p.maxSites + 'sites').join(','));
    const checkout = await json('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'users_10', email: 'chef@example.com', interval: 'month' }),
    });
    console.log('CHECKOUT', checkout.status, checkout.body.url, checkout.body.sessionId);
    const sessionId = checkout.body.sessionId;
    const pay = await fetch(checkout.body.url, { redirect: 'manual' });
    console.log('PAY_REDIRECT', pay.status, pay.headers.get('location'));
    const status = await json('/api/billing/status', { headers: { 'x-user-email': 'chef@example.com' } });
    console.log('STATUS', JSON.stringify({
      plan: status.body.subscription && status.body.subscription.plan,
      subStatus: status.body.subscription && status.body.subscription.status,
      maxUsers: status.body.maxUsers,
      maxSites: status.body.maxSites,
      access: status.body.access,
      invoices: (status.body.invoices || []).length,
    }));
    const teammate = await json('/api/billing/status', { headers: { 'x-user-email': 'cook@example.com' } });
    console.log('TEAMMATE', JSON.stringify({
      plan: teammate.body.subscription && teammate.body.subscription.plan,
      access: teammate.body.access,
      maxSites: teammate.body.maxSites,
    }));
    const grant = await json('/api/billing/admin/grant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-email': 'owner@kiteline.uk' },
      body: JSON.stringify({ email: 'chef@example.com', plan: 'users_50', months: 2, note: 'upgrade' }),
    });
    console.log('GRANT', grant.status, grant.body.subscription && grant.body.subscription.plan, grant.body.subscription && grant.body.subscription.maxSites);
    const session = await json('/api/billing/session?session_id=' + encodeURIComponent(sessionId));
    console.log('SESSION', session.status, session.body.status, session.body.payment_status, session.body.plan);
    if (!(status.body.access && teammate.body.access && grant.body.subscription && grant.body.subscription.plan === 'users_50')) {
      throw new Error('payment flow did not activate as expected');
    }
    console.log('E2E_OK');
  } finally {
    child.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
